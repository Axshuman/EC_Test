import { db } from "./db";
import { users, hospitals, ambulances } from "../shared/schema";
import bcrypt from "bcryptjs";

export async function seedDatabase() {
  try {
    console.log("Starting database seeding...");

    // Check if users already exist
    const existingUsers = await db.select().from(users).limit(1);
    if (existingUsers.length > 0) {
      console.log("Database already seeded, skipping...");
      return;
    }

    // Hash passwords for test users
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Create test users
    const testUsers = [
      {
        username: "patient1",
        email: "patient1@test.com",
        password: hashedPassword,
        role: "patient" as const,
        firstName: "John",
        lastName: "Patient",
        phone: "+1234567890",
        isActive: true
      },
      {
        username: "hospital1", 
        email: "hospital1@test.com",
        password: hashedPassword,
        role: "hospital" as const,
        firstName: "Hospital",
        lastName: "Admin",
        phone: "+1234567891",
        isActive: true
      },
      {
        username: "ambulance1",
        email: "ambulance1@test.com", 
        password: hashedPassword,
        role: "ambulance" as const,
        firstName: "Ambulance",
        lastName: "Driver",
        phone: "+1234567892",
        isActive: true
      }
    ];

    // Insert users and get their IDs
    const insertedUsers = await db.insert(users).values(testUsers).returning();
    console.log(`Created ${insertedUsers.length} test users`);

    // Create test hospital
    const testHospital = {
      name: "Emergency Medical Center",
      address: "123 Hospital Ave, Medical District",
      phone: "+1234567900",
      latitude: "40.7128",
      longitude: "-74.0060",
      totalBeds: 100,
      availableBeds: 75,
      icuBeds: 20,
      availableIcuBeds: 15,
      emergencyStatus: "available" as const
    };

    const insertedHospitals = await db.insert(hospitals).values([testHospital]).returning();
    console.log(`Created ${insertedHospitals.length} test hospitals`);

    // Create test ambulance
    const hospitalUser = insertedUsers.find(u => u.role === "hospital");
    const ambulanceUser = insertedUsers.find(u => u.role === "ambulance");
    
    const testAmbulance = {
      vehicleNumber: "AMB-001",
      operatorId: ambulanceUser?.id,
      hospitalId: insertedHospitals[0]?.id,
      currentLatitude: "40.7580",
      currentLongitude: "-73.9855", 
      status: "available" as const,
      isActive: true
    };

    const insertedAmbulances = await db.insert(ambulances).values([testAmbulance]).returning();
    console.log(`Created ${insertedAmbulances.length} test ambulances`);

    console.log("Database seeding completed successfully!");
    console.log("Test credentials:");
    console.log("- Patient: username=patient1, password=password123");
    console.log("- Hospital: username=hospital1, password=password123");
    console.log("- Ambulance: username=ambulance1, password=password123");

  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}