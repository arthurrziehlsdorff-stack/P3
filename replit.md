# EcoRide Fleet Control Panel

## Overview

EcoRide is a fleet management system for shared electric scooter rentals. The platform enables fleet managers and maintenance technicians to monitor scooters, track battery levels, manage trips, and handle rentals. The system is transitioning from manual operations to a complete web platform with real-time monitoring capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight client-side routing)
- **State Management**: TanStack React Query for server state, local React state for UI
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Component Library**: shadcn/ui components built on Radix UI primitives
- **Build Tool**: Vite with HMR support
- **Typography**: Inter (primary) and JetBrains Mono (monospace for technical data)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript with ESM modules
- **API Pattern**: RESTful endpoints under `/api/` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL
- **Schema Validation**: Zod with drizzle-zod integration

### Data Model
Two primary entities with a one-to-many relationship:

**Scooters Table**:
- id (UUID, primary key)
- modelo (text)
- bateria (integer 0-100)
- status (enum: 'livre', 'ocupado', 'manutencao')
- localizacao (text)
- ultimaAtualizacao (timestamp)

**Viagens (Trips) Table**:
- id (UUID, primary key)
- scooterId (foreign key to scooters)
- usuarioNome (text)
- dataInicio (timestamp)
- dataFim (timestamp, nullable)
- distanciaKm (decimal, nullable)

### Business Rules
- Scooter rental requires: scooter exists, status is 'livre', battery > 20%
- Active trips are identified by null dataFim field
- Battery levels trigger visual indicators: red (≤20%), amber (≤50%), green (>50%)

### Project Structure
```
client/           # Frontend React application
  src/
    components/   # Reusable UI components
    pages/        # Route page components
    hooks/        # Custom React hooks
    lib/          # Utilities and query client
server/           # Backend Express application
  routes.ts       # API endpoint definitions
  storage.ts      # Database access layer
  db.ts           # Database connection
shared/           # Shared code between client/server
  schema.ts       # Drizzle schema and Zod validators
```

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connected via `DATABASE_URL` environment variable
- **Drizzle Kit**: Database migrations and schema push (`npm run db:push`)

### Third-Party Services
- **Google Fonts CDN**: Inter and JetBrains Mono font families

### Key NPM Packages
- **@tanstack/react-query**: Server state management and caching
- **drizzle-orm**: Type-safe database queries
- **date-fns**: Date formatting and manipulation (Portuguese locale support)
- **zod**: Runtime schema validation
- **Radix UI**: Accessible component primitives
- **Lucide React**: Icon library