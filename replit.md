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
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```