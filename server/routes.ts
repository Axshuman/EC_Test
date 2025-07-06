import type { Express } from "express";
import { createServer, type Server } from "http";
import { Server as SocketIOServer } from "socket.io";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { loginSchema, registerSchema, insertEmergencyRequestSchema, insertCommunicationSchema } from "@shared/schema";
import { z } from "zod";
// Google Maps integration - using fetch API instead of the googlemaps package
// This avoids ES module compatibility issues

const JWT_SECRET = process.env.JWT_SECRET || "emergency-connect-secret-key";

// Google Maps API key for Places API requests
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_KEY || process.env.GOOGLE_MAPS_GENERATED_KEY;

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: any;
    }
  }
}

// Auth middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Role-based access control
const requireRole = (roles: string[]) => {
  return (req: any, res: any, next: any) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Socket.IO server with CORS configuration
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  // Store connected clients with their user info
  const connectedClients = new Map<string, { socketId: string, userId: number, role: string }>();

  // Socket.IO authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const user = jwt.verify(token, JWT_SECRET) as any;
      socket.userId = user.id;
      socket.userRole = user.role;
      socket.ambulanceId = user.ambulanceId;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: any) => {
    const clientId = `${socket.userRole}-${socket.userId}`;
    connectedClients.set(clientId, {
      socketId: socket.id,
      userId: socket.userId,
      role: socket.userRole
    });

    console.log(`User connected: ${socket.userRole} (ID: ${socket.userId})`);

    // Handle real-time location updates
    socket.on('location_update', async (data: { lat: number, lng: number }) => {
      if (socket.userRole === 'ambulance' && socket.ambulanceId) {
        try {
          await storage.updateAmbulanceLocation(socket.ambulanceId, data.lat, data.lng);
          
          // Broadcast location to all connected clients
          socket.broadcast.emit('ambulance_location_update', {
            ambulanceId: socket.ambulanceId,
            lat: data.lat,
            lng: data.lng,
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Location update error:', error);
        }
      }
    });

    // Handle emergency request updates
    socket.on('emergency_request_update', async (data: { requestId: number, status: string, ambulanceId?: number }) => {
      try {
        await storage.updateEmergencyRequest(data.requestId, {
          status: data.status,
          ambulanceId: data.ambulanceId
        });

        // Broadcast to all relevant parties
        io.emit('emergency_status_update', {
          requestId: data.requestId,
          status: data.status,
          ambulanceId: data.ambulanceId,
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Emergency request update error:', error);
      }
    });

    // Handle chat messages
    socket.on('send_message', async (data: {
      emergencyRequestId: number,
      receiverId: number,
      message: string,
      receiverRole: string
    }) => {
      try {
        const communication = await storage.createCommunication({
          emergencyRequestId: data.emergencyRequestId,
          senderId: socket.userId,
          receiverId: data.receiverId,
          message: data.message,
          messageType: 'text'
        });

        // Send to specific receiver
        const receiverClientId = `${data.receiverRole}-${data.receiverId}`;
        const receiverClient = connectedClients.get(receiverClientId);
        
        if (receiverClient) {
          io.to(receiverClient.socketId).emit('new_message', communication);
        }

        // Send confirmation back to sender
        socket.emit('message_sent', communication);
      } catch (error) {
        console.error('Chat message error:', error);
        socket.emit('message_error', { message: 'Failed to send message' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      connectedClients.delete(clientId);
      console.log(`User disconnected: ${socket.userRole} (ID: ${socket.userId})`);
    });
  });

  // Helper function to broadcast to specific role
  const broadcastToRole = (role: string, event: string, data: any) => {
    connectedClients.forEach((client) => {
      if (client.role === role) {
        io.to(client.socketId).emit(event, data);
      }
    });
  };

  // Helper function to calculate distance between two coordinates
  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Google Maps API routes
  app.get('/api/maps/hospitals', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: 'Latitude and longitude are required' });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // Use Google Places API to search for hospitals within 30km radius
      const placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${latitude},${longitude}&radius=30000&type=hospital&key=${GOOGLE_MAPS_API_KEY}`;

      try {
        const response = await fetch(placesUrl);
        const data = await response.json();

        const places = data.results || [];
        
        // Process and sort hospitals by distance
        const hospitals = places.map((place: any) => {
          const distance = calculateDistance(
            latitude,
            longitude,
            place.geometry.location.lat,
            place.geometry.location.lng
          );

          return {
            id: place.place_id,
            name: place.name,
            address: place.vicinity || place.formatted_address,
            latitude: place.geometry.location.lat,
            longitude: place.geometry.location.lng,
            distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
            rating: place.rating || null,
            openNow: place.opening_hours?.open_now || null,
            // Mock data for hospital details since Google Places doesn't provide this
            totalBeds: Math.floor(Math.random() * 300) + 50,
            availableBeds: Math.floor(Math.random() * 50) + 10,
            icuBeds: Math.floor(Math.random() * 20) + 5,
            availableIcuBeds: Math.floor(Math.random() * 10) + 1,
            emergencyServices: true,
            status: 'available'
          };
        }).sort((a: any, b: any) => a.distance - b.distance); // Sort by distance

        res.json(hospitals);
      } catch (mapsError) {
        console.error('Google Maps API error:', mapsError);
        // Fallback to empty array if Maps API fails
        res.json([]);
      }
    } catch (error) {
      console.error('Hospital search error:', error);
      res.status(500).json({ message: 'Failed to search hospitals' });
    }
  });

  // Auth routes
  app.post('/api/auth/register', async (req, res) => {
    try {
      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(data.username);
      if (existingUser) {
        return res.status(400).json({ message: 'Username already exists' });
      }

      const existingEmail = await storage.getUserByEmail(data.email);
      if (existingEmail) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.password, 10);

      const user = await storage.createUser({
        ...data,
        password: hashedPassword,
      });

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Registration failed' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByUsername(data.username);
      if (!user) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await bcrypt.compare(data.password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      res.json({ token, user: { ...user, password: undefined } });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      res.status(500).json({ message: 'Login failed' });
    }
  });

  app.get('/api/auth/me', authenticateToken, async (req, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      res.json({ ...user, password: undefined });
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch user' });
    }
  });

  // Emergency Request routes
  app.post('/api/emergency/request', authenticateToken, requireRole(['patient']), async (req, res) => {
    try {
      const { latitude, longitude, address, patientCondition, notes } = req.body;
      
      const emergencyRequest = await storage.createEmergencyRequest({
        patientId: req.user.id,
        latitude: latitude.toString(),
        longitude: longitude.toString(),
        address,
        patientCondition,
        notes,
        priority: 'high', // Default to high for all emergency requests
        status: 'pending'
      });

      // Broadcast to all available ambulances
      broadcastToRole('ambulance', {
        type: 'new_emergency_request',
        data: emergencyRequest
      });

      res.json(emergencyRequest);
    } catch (error) {
      res.status(500).json({ message: 'Failed to create emergency request' });
    }
  });

  app.get('/api/emergency/requests', authenticateToken, async (req, res) => {
    try {
      let requests;
      
      switch (req.user.role) {
        case 'patient':
          requests = await storage.getEmergencyRequestsByPatient(req.user.id);
          break;
        case 'ambulance':
          requests = await storage.getActiveEmergencyRequests();
          break;
        case 'hospital':
          requests = await storage.getActiveEmergencyRequests();
          break;
        default:
          return res.status(403).json({ message: 'Unauthorized' });
      }

      res.json(requests);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch emergency requests' });
    }
  });

  app.put('/api/emergency/request/:id', authenticateToken, async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const updatedRequest = await storage.updateEmergencyRequest(parseInt(id), updates);
      
      // Broadcast update to relevant parties
      broadcastToRole('patient', {
        type: 'emergency_request_updated',
        data: updatedRequest
      });
      
      broadcastToRole('hospital', {
        type: 'emergency_request_updated',
        data: updatedRequest
      });

      res.json(updatedRequest);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update emergency request' });
    }
  });

  // Ambulance routes
  app.get('/api/ambulances/nearby', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const radius = 0.1; // ~10km radius
      
      const ambulances = await storage.getNearbyAmbulances(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radius
      );

      res.json(ambulances);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch nearby ambulances' });
    }
  });

  app.get('/api/ambulances/available', authenticateToken, async (req, res) => {
    try {
      const ambulances = await storage.getAvailableAmbulances();
      res.json(ambulances);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch available ambulances' });
    }
  });

  app.put('/api/ambulances/:id/location', authenticateToken, requireRole(['ambulance']), async (req, res) => {
    try {
      const { id } = req.params;
      const { lat, lng } = req.body;
      
      const ambulance = await storage.updateAmbulanceLocation(parseInt(id), lat, lng);
      
      // Broadcast location update
      broadcastToRole('hospital', {
        type: 'ambulance_location_update',
        ambulanceId: parseInt(id),
        lat,
        lng
      });

      res.json(ambulance);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update ambulance location' });
    }
  });

  // Hospital routes
  app.get('/api/hospitals/available', authenticateToken, async (req, res) => {
    try {
      const hospitals = await storage.getAllHospitals();
      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch hospitals' });
    }
  });

  app.get('/api/hospitals/nearby', authenticateToken, async (req, res) => {
    try {
      const { lat, lng } = req.query;
      const radius = 0.1; // ~10km radius
      
      const hospitals = await storage.getNearbyHospitals(
        parseFloat(lat as string),
        parseFloat(lng as string),
        radius
      );

      res.json(hospitals);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch nearby hospitals' });
    }
  });

  app.post('/api/hospitals/update-status', authenticateToken, requireRole(['hospital']), async (req, res) => {
    try {
      const { hospitalId, emergencyStatus, totalBeds, availableBeds, icuBeds, availableIcuBeds } = req.body;
      
      const hospital = await storage.updateHospital(hospitalId, {
        emergencyStatus,
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds
      });

      // Broadcast hospital status update
      broadcastToRole('ambulance', {
        type: 'hospital_status_update',
        data: hospital
      });

      res.json(hospital);
    } catch (error) {
      res.status(500).json({ message: 'Failed to update hospital status' });
    }
  });

  // Communication routes
  app.get('/api/communications/:emergencyRequestId', authenticateToken, async (req, res) => {
    try {
      const { emergencyRequestId } = req.params;
      const communications = await storage.getCommunicationsByEmergencyRequest(parseInt(emergencyRequestId));
      res.json(communications);
    } catch (error) {
      res.status(500).json({ message: 'Failed to fetch communications' });
    }
  });

  return httpServer;
}
