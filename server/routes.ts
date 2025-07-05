import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { storage } from "./storage";
import { loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "emergency-connect-secret-key";

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

  // WebSocket server
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  const clients = new Map<string, WebSocket>();

  wss.on('connection', (ws: WebSocket, req) => {
    const url = new URL(req.url!, `http://${req.headers.host}`);
    const token = url.searchParams.get('token');
    
    if (!token) {
      ws.close(1008, 'Token required');
      return;
    }

    try {
      const user = jwt.verify(token, JWT_SECRET) as any;
      const clientId = `${user.role}-${user.id}`;
      clients.set(clientId, ws);

      ws.on('message', async (message) => {
        try {
          const data = JSON.parse(message.toString());
          
          switch (data.type) {
            case 'location_update':
              if (user.role === 'ambulance') {
                await storage.updateAmbulanceLocation(user.ambulanceId, data.lat, data.lng);
                // Broadcast to hospitals and patients
                broadcastToRole('hospital', {
                  type: 'ambulance_location_update',
                  ambulanceId: user.ambulanceId,
                  lat: data.lat,
                  lng: data.lng
                });
              }
              break;
            
            case 'chat_message':
              const communication = await storage.createCommunication({
                emergencyRequestId: data.emergencyRequestId,
                senderId: user.id,
                receiverId: data.receiverId,
                message: data.message,
                messageType: 'text'
              });
              
              // Send to specific user
              const receiverClient = clients.get(`${data.receiverRole}-${data.receiverId}`);
              if (receiverClient && receiverClient.readyState === WebSocket.OPEN) {
                receiverClient.send(JSON.stringify({
                  type: 'new_message',
                  data: communication
                }));
              }
              break;
          }
        } catch (error) {
          console.error('WebSocket message error:', error);
        }
      });

      ws.on('close', () => {
        clients.delete(clientId);
      });

    } catch (error) {
      ws.close(1008, 'Invalid token');
    }
  });

  const broadcastToRole = (role: string, data: any) => {
    clients.forEach((client, clientId) => {
      if (clientId.startsWith(role) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    });
  };

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
