import {
  users,
  hospitals,
  ambulances,
  emergencyRequests,
  bedStatusLogs,
  communications,
  type User,
  type Hospital,
  type Ambulance,
  type EmergencyRequest,
  type BedStatusLog,
  type Communication,
  type InsertUser,
  type InsertHospital,
  type InsertAmbulance,
  type InsertEmergencyRequest,
  type InsertBedStatusLog,
  type InsertCommunication,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  
  // Hospital operations
  getHospital(id: number): Promise<Hospital | undefined>;
  getAllHospitals(): Promise<Hospital[]>;
  getNearbyHospitals(lat: number, lng: number, radius: number): Promise<Hospital[]>;
  createHospital(hospital: InsertHospital): Promise<Hospital>;
  updateHospital(id: number, hospital: Partial<InsertHospital>): Promise<Hospital>;
  updateHospitalBeds(id: number, totalBeds: number, availableBeds: number, icuBeds: number, availableIcuBeds: number): Promise<Hospital>;
  
  // Ambulance operations
  getAmbulance(id: number): Promise<Ambulance | undefined>;
  getAmbulancesByHospital(hospitalId: number): Promise<Ambulance[]>;
  getAvailableAmbulances(): Promise<Ambulance[]>;
  getNearbyAmbulances(lat: number, lng: number, radius: number): Promise<Ambulance[]>;
  createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance>;
  updateAmbulance(id: number, ambulance: Partial<InsertAmbulance>): Promise<Ambulance>;
  updateAmbulanceLocation(id: number, lat: number, lng: number): Promise<Ambulance>;
  
  // Emergency Request operations
  getEmergencyRequest(id: number): Promise<EmergencyRequest | undefined>;
  getEmergencyRequestsByPatient(patientId: number): Promise<EmergencyRequest[]>;
  getEmergencyRequestsByAmbulance(ambulanceId: number): Promise<EmergencyRequest[]>;
  getEmergencyRequestsByHospital(hospitalId: number): Promise<EmergencyRequest[]>;
  getActiveEmergencyRequests(): Promise<EmergencyRequest[]>;
  createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest>;
  updateEmergencyRequest(id: number, request: Partial<InsertEmergencyRequest>): Promise<EmergencyRequest>;
  
  // Bed Status operations
  getBedStatusByHospital(hospitalId: number): Promise<BedStatusLog[]>;
  createBedStatusLog(bedStatus: InsertBedStatusLog): Promise<BedStatusLog>;
  
  // Communication operations
  getCommunicationsByEmergencyRequest(emergencyRequestId: number): Promise<Communication[]>;
  createCommunication(communication: InsertCommunication): Promise<Communication>;
  markCommunicationAsRead(id: number): Promise<Communication>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: number, user: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...user, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  // Hospital operations
  async getHospital(id: number): Promise<Hospital | undefined> {
    const [hospital] = await db.select().from(hospitals).where(eq(hospitals.id, id));
    return hospital;
  }

  async getAllHospitals(): Promise<Hospital[]> {
    return db.select().from(hospitals);
  }

  async getNearbyHospitals(lat: number, lng: number, radius: number): Promise<Hospital[]> {
    // Simple distance calculation - in production, use PostGIS
    return db.select().from(hospitals).where(
      sql`sqrt(power(${hospitals.latitude} - ${lat}, 2) + power(${hospitals.longitude} - ${lng}, 2)) <= ${radius}`
    );
  }

  async createHospital(hospital: InsertHospital): Promise<Hospital> {
    const [newHospital] = await db.insert(hospitals).values(hospital).returning();
    return newHospital;
  }

  async updateHospital(id: number, hospital: Partial<InsertHospital>): Promise<Hospital> {
    const [updatedHospital] = await db
      .update(hospitals)
      .set({ ...hospital, updatedAt: new Date() })
      .where(eq(hospitals.id, id))
      .returning();
    return updatedHospital;
  }

  async updateHospitalBeds(id: number, totalBeds: number, availableBeds: number, icuBeds: number, availableIcuBeds: number): Promise<Hospital> {
    const [updatedHospital] = await db
      .update(hospitals)
      .set({
        totalBeds,
        availableBeds,
        icuBeds,
        availableIcuBeds,
        updatedAt: new Date(),
      })
      .where(eq(hospitals.id, id))
      .returning();
    return updatedHospital;
  }

  // Ambulance operations
  async getAmbulance(id: number): Promise<Ambulance | undefined> {
    const [ambulance] = await db.select().from(ambulances).where(eq(ambulances.id, id));
    return ambulance;
  }

  async getAmbulancesByHospital(hospitalId: number): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(eq(ambulances.hospitalId, hospitalId));
  }

  async getAvailableAmbulances(): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(
      and(eq(ambulances.status, "available"), eq(ambulances.isActive, true))
    );
  }

  async getNearbyAmbulances(lat: number, lng: number, radius: number): Promise<Ambulance[]> {
    return db.select().from(ambulances).where(
      and(
        eq(ambulances.isActive, true),
        sql`sqrt(power(${ambulances.currentLatitude} - ${lat}, 2) + power(${ambulances.currentLongitude} - ${lng}, 2)) <= ${radius}`
      )
    );
  }

  async createAmbulance(ambulance: InsertAmbulance): Promise<Ambulance> {
    const [newAmbulance] = await db.insert(ambulances).values(ambulance).returning();
    return newAmbulance;
  }

  async updateAmbulance(id: number, ambulance: Partial<InsertAmbulance>): Promise<Ambulance> {
    const [updatedAmbulance] = await db
      .update(ambulances)
      .set({ ...ambulance, updatedAt: new Date() })
      .where(eq(ambulances.id, id))
      .returning();
    return updatedAmbulance;
  }

  async updateAmbulanceLocation(id: number, lat: number, lng: number): Promise<Ambulance> {
    const [updatedAmbulance] = await db
      .update(ambulances)
      .set({
        currentLatitude: lat.toString(),
        currentLongitude: lng.toString(),
        updatedAt: new Date(),
      })
      .where(eq(ambulances.id, id))
      .returning();
    return updatedAmbulance;
  }

  // Emergency Request operations
  async getEmergencyRequest(id: number): Promise<EmergencyRequest | undefined> {
    const [request] = await db.select().from(emergencyRequests).where(eq(emergencyRequests.id, id));
    return request;
  }

  async getEmergencyRequestsByPatient(patientId: number): Promise<EmergencyRequest[]> {
    return db.select().from(emergencyRequests)
      .where(eq(emergencyRequests.patientId, patientId))
      .orderBy(desc(emergencyRequests.createdAt));
  }

  async getEmergencyRequestsByAmbulance(ambulanceId: number): Promise<EmergencyRequest[]> {
    return db.select().from(emergencyRequests)
      .where(eq(emergencyRequests.ambulanceId, ambulanceId))
      .orderBy(desc(emergencyRequests.createdAt));
  }

  async getEmergencyRequestsByHospital(hospitalId: number): Promise<EmergencyRequest[]> {
    return db.select().from(emergencyRequests)
      .where(eq(emergencyRequests.hospitalId, hospitalId))
      .orderBy(desc(emergencyRequests.createdAt));
  }

  async getActiveEmergencyRequests(): Promise<EmergencyRequest[]> {
    return db.select().from(emergencyRequests)
      .where(sql`${emergencyRequests.status} NOT IN ('completed', 'cancelled')`)
      .orderBy(desc(emergencyRequests.createdAt));
  }

  async createEmergencyRequest(request: InsertEmergencyRequest): Promise<EmergencyRequest> {
    const [newRequest] = await db.insert(emergencyRequests).values(request).returning();
    return newRequest;
  }

  async updateEmergencyRequest(id: number, request: Partial<InsertEmergencyRequest>): Promise<EmergencyRequest> {
    const [updatedRequest] = await db
      .update(emergencyRequests)
      .set({ ...request, updatedAt: new Date() })
      .where(eq(emergencyRequests.id, id))
      .returning();
    return updatedRequest;
  }

  // Bed Status operations
  async getBedStatusByHospital(hospitalId: number): Promise<BedStatusLog[]> {
    return db.select().from(bedStatusLogs)
      .where(eq(bedStatusLogs.hospitalId, hospitalId))
      .orderBy(desc(bedStatusLogs.createdAt));
  }

  async createBedStatusLog(bedStatus: InsertBedStatusLog): Promise<BedStatusLog> {
    const [newBedStatus] = await db.insert(bedStatusLogs).values(bedStatus).returning();
    return newBedStatus;
  }

  // Communication operations
  async getCommunicationsByEmergencyRequest(emergencyRequestId: number): Promise<Communication[]> {
    return db.select().from(communications)
      .where(eq(communications.emergencyRequestId, emergencyRequestId))
      .orderBy(desc(communications.createdAt));
  }

  async createCommunication(communication: InsertCommunication): Promise<Communication> {
    const [newCommunication] = await db.insert(communications).values(communication).returning();
    return newCommunication;
  }

  async markCommunicationAsRead(id: number): Promise<Communication> {
    const [updatedCommunication] = await db
      .update(communications)
      .set({ isRead: true })
      .where(eq(communications.id, id))
      .returning();
    return updatedCommunication;
  }
}

export const storage = new DatabaseStorage();
