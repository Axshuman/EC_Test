# EmergencyConnect - Emergency Response Coordination Platform

## Overview

EmergencyConnect is a comprehensive emergency response coordination platform built with React, TypeScript, and Express. The system facilitates real-time communication and coordination between patients, ambulance services, and hospitals during medical emergencies. It provides role-based dashboards, real-time tracking, and automated dispatch capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Framework**: Tailwind CSS with shadcn/ui components
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Communication**: WebSocket integration for live updates

### Backend Architecture
- **Runtime**: Node.js with Express server
- **Database**: PostgreSQL with Drizzle ORM
- **Database Provider**: Neon serverless PostgreSQL
- **Authentication**: JWT-based authentication with bcrypt for password hashing
- **Real-time**: WebSocket server for live communication
- **API Design**: RESTful API with role-based access control

## Key Components

### User Management
- **Role-based System**: Three distinct user roles (patient, ambulance, hospital)
- **Authentication**: JWT tokens with secure password hashing
- **Authorization**: Role-based access control for API endpoints
- **User Profiles**: Comprehensive user information management

### Emergency Request System
- **Emergency Dispatch**: Automated ambulance dispatch based on location
- **Priority Levels**: Support for different emergency priority levels
- **Status Tracking**: Real-time status updates throughout the emergency response process
- **Geographic Matching**: Location-based hospital and ambulance assignment

### Real-time Communication
- **WebSocket Integration**: Live updates for all connected clients
- **Chat System**: Real-time messaging between patients, ambulances, and hospitals
- **Status Broadcasting**: Automatic status updates across all relevant parties
- **Location Tracking**: Real-time ambulance location updates

### Hospital Management
- **Bed Management**: Real-time bed availability tracking (general and ICU)
- **Capacity Monitoring**: Hospital status management (available, busy, full)
- **Incoming Ambulance Tracking**: Visibility into incoming emergency cases
- **Resource Allocation**: Efficient bed and resource management

### Ambulance Operations
- **Dispatch System**: Automated assignment based on location and availability
- **GPS Tracking**: Real-time location updates and route optimization
- **Status Management**: Comprehensive ambulance status tracking
- **Communication Hub**: Direct communication with hospitals and dispatch

## Data Flow

1. **Emergency Request**: Patient initiates emergency request with location
2. **Dispatch Logic**: System identifies nearest available ambulance
3. **Hospital Assignment**: Appropriate hospital selected based on capacity and location
4. **Real-time Updates**: All parties receive live status updates via WebSocket
5. **Communication**: Secure messaging between all involved parties
6. **Completion**: Status tracking through to emergency resolution

## External Dependencies

### Core Dependencies
- **@neondatabase/serverless**: Serverless PostgreSQL database connection
- **drizzle-orm**: Type-safe ORM for database operations
- **@tanstack/react-query**: Server state management and caching
- **@radix-ui/react-***: Accessible UI component primitives
- **bcryptjs**: Password hashing and security
- **jsonwebtoken**: JWT authentication
- **ws**: WebSocket server implementation

### Development Dependencies
- **TypeScript**: Type safety and development experience
- **Tailwind CSS**: Utility-first CSS framework
- **Vite**: Fast build tool and development server
- **ESBuild**: JavaScript bundler for production builds

## Deployment Strategy

### Development
- **Local Development**: Uses Vite dev server with hot module replacement
- **Database**: Neon serverless PostgreSQL for consistent environment
- **Environment Variables**: DATABASE_URL and JWT_SECRET configuration

### Production
- **Build Process**: Vite builds client-side assets, ESBuild bundles server
- **Database Migrations**: Drizzle Kit for schema management
- **Server Deployment**: Express server with built-in static file serving
- **WebSocket Support**: Integrated WebSocket server for real-time features

### Key Architectural Decisions

1. **Monorepo Structure**: Client, server, and shared code in single repository for easier development
2. **TypeScript Throughout**: End-to-end type safety from database to UI
3. **Serverless Database**: Neon PostgreSQL for scalability and reduced infrastructure management
4. **Real-time First**: WebSocket integration for immediate updates across all users
5. **Role-based Architecture**: Clear separation of concerns based on user roles
6. **Component-based UI**: Modular, reusable components with consistent design system

## Changelog

```
Changelog:
- July 05, 2025. Initial setup
- July 06, 2025. Implemented Socket.IO real-time communication, Google Maps API integration for real hospital data within 30km radius, created independent database configuration file for MongoDB migration, fixed patient interface loading issues with accept/reject states
- July 07, 2025. Major UI/UX improvements: reordered emergency forms above maps, added delete functionality for emergency request history, enhanced registration system with role-specific forms (ambulance operator/hospital), integrated real-time notification system, improved bed management functionality, added patient name display in ambulance/hospital dashboards, optimized LocationMap performance with 5-minute caching, implemented DELETE API endpoints with audit trail preservation. Created complete ambulance profiles for 5 vehicles (AMB-001 to AMB-005) with standardized usernames Ambulance#1-5, added vehicle-specific equipment details cards with mock medical equipment data, implemented dynamic equipment display based on vehicle certification levels. Added advanced Google Maps navigation system with native app integration, real-time ETA calculation and broadcasting, route line visualization between patient and ambulance locations, auto-zoom functionality for optimal map viewing, and comprehensive ambulance acceptance workflow with journey state management. COMPLETELY MIGRATED from Socket.IO to native WebSocket implementation for better stability and performance, eliminating all parse errors and connection issues. Fixed request ID synchronization between ambulance and patient interfaces by targeting the most recent dispatched request. Enhanced ETA broadcasting system with comprehensive logging and debugging features. Implemented async status flow: requests go "pending" → "accepted" → "dispatched" only after ETA is calculated and broadcast. Added proper time conversion from Google Maps API (seconds to minutes). Location map now hides during navigation to prevent interface clutter. Fixed ETA targeting to force updates to most recent request, eliminating timing lag issues. Created comprehensive hospital dashboard with tabbed interface for bed management, ambulance tracking, resource allocation, and communication. Implemented hospital-specific configurations for 3 top Indore hospitals (Apollo Hospital Indore, CARE CHL Hospital Indore, Bombay Hospital Indore) with distinct bed layouts, ward configurations, and resource allocations. Added real-time ambulance tracker that displays both live emergency requests from database and simulated data with visual distinction (blue LIVE badges vs red simulated cards). Enhanced hospital bed layout with interactive hover controls, color-coded status indicators, and hospital-specific ward names and capacities. COMPLETED MASSIVE BED DATABASE EXPANSION: Successfully seeded 355 authentic hospital beds across all three hospitals with realistic Indian medical specialties and patient names. Apollo Hospital (140 beds: 44 ICU, 96 General), CARE CHL Hospital (100 beds: 30 ICU, 70 General), Bombay Hospital (115 beds: 38 ICU, 77 General). Implemented comprehensive Indian medical ward system including CICU, NICU, SICU, PICU, Maternity, Pediatric, Surgery, Medicine, Orthopedic, Neurology, Oncology, Gastroenterology, and specialized units. Created authentic Indian patient name database with regional variations - North Indian names for Apollo, modern names for CHL, Marathi/Western Indian names for Bombay Hospital. Fixed useQueryClient import error in patient dashboard. System now operates with realistic hospital capacity reflecting actual Indian tertiary care hospital standards with proper specialty ward distributions and authentic occupancy patterns. REMOVED ALL MOCK/SIMULATED AMBULANCE DATA from ambulance tracker component - now displays only authentic real-time emergency requests from database. Completely restructured hospital dashboard layout: removed statistics cards section, updated header to show actual hospital names (Apollo Hospital Indore, CARE CHL Hospital Indore, Bombay Hospital Indore) instead of generic "Hospital Dashboard", implemented clean tabbed navigation for Bed Management, Ambulance Tracker, Resources, Communication with direct Bed Layout Real Time Status section. Fixed all ward descriptions mapping for 355 beds to show proper Indian medical specialty names (Cardiac ICU, Neonatal ICU, Surgical ICU, Maternity Ward, etc.) instead of generic "general" descriptions. ENHANCED REAL-TIME BED DATA SYSTEM: Fixed hospital bed availability API to calculate live bed counts from bed_status_logs table instead of static hospital data, ensuring all 3 hospitals (Apollo, CHL, Bombay) display accurate real-time bed availability in patient dashboard. Updated ambulance operator usernames to sequential numbering (Ambulance#1 through Ambulance#5) corresponding to vehicle numbers AMB-001 to AMB-005 for easier identification and login.
- July 08, 2025. MAJOR REGISTRATION SYSTEM OVERHAUL: Fixed critical registration form routing issue where old embedded form in login.tsx was being used instead of separate register.tsx. Completely redesigned registration with role-based card selection (Patient, Ambulance Operator, Hospital Staff) and conditional field rendering. Optimized ambulances database schema by removing test vehicles (AMB-TEST1/2/3), added operator_phone column for separate phone storage, ensured all ambulances have unique operator_id and hospital_id assignments. Enhanced ambulance registration form with dedicated operator phone field, fixed vehicle number generation to prevent duplicates (now generates AMB-006, AMB-007 etc.), improved equipment data storage and validation. Updated backend ambulance creation to properly store certification levels (Basic/Advanced/Critical Care), equipment levels (Level 1/2/3), and operator contact information. Fixed ambulance profile lookup using correct operator_id column, ensuring successful login for new ambulance operators. Registration system now fully functional with comprehensive form validation, role-specific data collection, and proper database relationships. MASTER ADMIN DASHBOARD COMPLETE: Created comprehensive admin dashboard with full database access, real-time table viewing for all 6 main tables (Users, Hospitals, Ambulances, Emergency Requests, Bed Status, Communications), custom SQL query execution with proper authentication, record deletion/editing capabilities, CSV export functionality, and role-based security. Admin credentials: username "admin", password "admin123". Fixed WebSocket server configuration, resolved all connection issues, and implemented comprehensive data modification capabilities with UPDATE/DELETE operations. Admin can now access complete system oversight at /admin route with full CRUD operations on all database tables. VISHESH JUPITER HOSPITAL INTEGRATION & ROBUST HOSPITAL MANAGEMENT SYSTEM: Successfully created and seeded comprehensive bed data for Vishesh Jupiter Hospital (username: vis_admin, password: visadmin123) with 80 authentic hospital beds (30 ICU + 50 General). Implemented 13 specialized medical departments including 5 ICU units (CICU, NICU, SICU, PICU, MICU) and 8 general wards (Cardiology, Neurology, Oncology, Orthopedic, Gastroenterology, Pediatric, General Surgery, Internal Medicine). Fixed critical frontend hospital ID mapping issue by adding user ID 97 -> hospital ID 5 mapping in hospital-bed-layout.tsx. Resolved database linkage problems between user authentication and hospital bed data access. Used authentic Indian patient names and realistic 57.5% occupancy rate across all departments. CREATED ROBUST HOSPITAL MANAGEMENT SYSTEM: Developed hospital-bed-manager.ts with centralized hospital registry, safe seeding mechanisms that prevent data conflicts, and scalable architecture for adding unlimited hospitals. Replaced old hardcoded seeding with managed hospital approach that preserves existing data when adding new hospitals. Created comprehensive documentation (HOSPITAL_MANAGEMENT_GUIDE.md) and example templates (add-new-hospital-example.ts) for future hospital additions. System now supports 4 fully functional hospitals with completely isolated data management, preventing the bed data clearing issues that occurred previously. Future hospital additions will be seamless and conflict-free. HOSPITAL SYSTEM OPTIMIZATION: Fixed bed data persistence issue by assigning user_ids to all hospitals (Apollo-11, CHL-12, Bombay-13, Vishesh Jupiter-97), created independent seeding system where each hospital manages its own bed data separately, added dual-access API endpoints supporting both hospital ID and user ID, eliminated frontend mapping dependency with backend ID resolution, built smart initialization that preserves existing data and only seeds hospitals that need bed data. Resolved actualHospitalId reference errors in hospital-bed-layout.tsx component. System now operates completely independently for each hospital with future-proof architecture for seamless hospital additions. BED ASSIGNMENT SYSTEM PERFECTED: Fixed mock patient name display issue by removing fallback to mock data in getBedStatusByHospital function, ensuring only real patient names from database are shown. Added comprehensive assigned bed badge functionality to patient dashboard showing both assigned ward number (e.g., "PED-08") and full hospital name (e.g., "Bombay Hospital Indore") instead of generic hospital IDs. Enhanced completed emergency request cards with visual ward assignment badges using green for bed number and blue for hospital name. System now properly tracks bed assignments through assigned_bed_number field in emergency requests and displays real-time patient assignments in hospital bed layouts. CRITICAL BED COUNTING LOGIC FIXED: Resolved major bug where bed assignments incorrectly increased total bed count instead of properly moving beds from "free" to "occupied" status. Root cause was system creating new bed status log entries instead of updating existing ones, causing duplicate bed records and artificially inflated total counts. Added updateBedStatus() method for proper UPDATE operations instead of INSERT, updated both manual and auto-assignment endpoints in hospital dashboard, fixed storage interface to include new method. Bed counting now works correctly: when assigning patient to bed, total beds remain constant while free beds decrease and occupied beds increase by same amount. Hospital dashboard bed management now functions with accurate real-time counts.
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```