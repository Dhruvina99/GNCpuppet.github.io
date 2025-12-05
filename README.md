# GNC - Puppet Management System

## Overview

This is a **GNC - Puppet Management System** designed for tracking attendance of sevarthis (members) during puppet performances. The application enables members to mark their attendance with detailed status tracking (Present, Absent, or Replaced), manage stories and characters for theatrical performances, receive notifications, and generate comprehensive reports. The system features role-based access control with distinct capabilities for administrators and regular members.

## Getting Started

### Development

The application is configured to run automatically in Replit. Just click the "Run" button or the workflow will start automatically.

**Default Admin Login:**
- Email/Mobile: `admin@gnc.org`
- MHT ID: `MHT001`

### Environment Setup

- **Database**: PostgreSQL database is automatically provisioned via Replit
- **Port**: Application runs on port 5000 (frontend and backend)
- **Dependencies**: All npm packages are installed automatically

### Available Commands

- `npm run dev` - Start development server (runs automatically)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema changes

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

### December 2025 - Event Field Integration
- Added Event field across all major entities (attendance, shows, stories, notifications, reports)
- Event types: JJ (Janma Jayanti), Janmashtami, Holi, and Other (with custom text input)
- Created reusable `EventSelector` component at `client/src/components/EventSelector.tsx`
- Integrated EventSelector into:
  - AttendanceForm.tsx - for marking attendance with event context
  - Shows.tsx - for recording shows with event details
  - Stories.tsx - for associating stories with events
  - Notifications.tsx - for event-specific announcements
  - Reports.tsx - added Event filter and Event column to attendance table
- Database schema updated with `eventType` and `eventCustom` columns on attendance, shows, stories, and notifications tables

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component Library**: Shadcn/ui (Radix UI primitives) with the "new-york" style variant, following Material Design 3 principles for clarity and mobile-first design

**Styling Strategy**: 
- Tailwind CSS with custom design tokens defined in CSS variables
- Support for light/dark themes with system preference detection
- Mobile-optimized responsive layouts (primary use case is mobile attendance entry)
- Custom typography scale using Google Fonts (Roboto family)

**State Management**:
- TanStack Query (React Query) for server state management with aggressive caching (staleTime: Infinity)
- React Hook Form with Zod validation for form state
- React Context for theme and sidebar state

**Routing**: Wouter (lightweight alternative to React Router)

**Key Design Patterns**:
- Role-aware UI components that show/hide features based on admin status
- Optimistic updates with mutation callbacks for immediate user feedback
- Compound component patterns for complex UI elements (forms, dialogs, cards)

### Backend Architecture

**Runtime**: Node.js with Express.js

**Language**: TypeScript with ES modules

**API Design**: RESTful JSON API with the following structure:
- `/api/auth/*` - Authentication endpoints (Replit Auth integration)
- `/api/members/*` - Member management
- `/api/attendance/*` - Attendance tracking
- `/api/stories/*` - Story and character management
- `/api/shows/*` - Show scheduling
- `/api/notifications/*` - Notifications and announcements
- `/api/reports/*` - Reporting and analytics
- `/api/practice-links/*` - Practice video links

**Authentication & Authorization**:
- OpenID Connect (OIDC) via Replit Auth
- Passport.js for authentication middleware
- Session-based authentication with PostgreSQL session store
- Role-based access control (admin vs. regular member) enforced at the route level

**Data Validation**: Zod schemas shared between frontend and backend for type safety

**Build Strategy**: 
- Server bundled with esbuild for faster cold starts (selective dependency bundling)
- Client built with Vite for optimized production bundles
- Development mode uses Vite middleware for HMR

### Data Storage

**Database**: PostgreSQL via Neon serverless driver with WebSocket support

**ORM**: Drizzle ORM with type-safe query builder

**Schema Design**:
- `users` - Replit Auth user data
- `members` - Sevarthi profiles with MHT IDs, contact info, and admin flags
- `stories` - Theatrical stories/plays
- `characters` - Characters within stories
- `roles` - Member-character assignments for performances
- `attendance` - Attendance records with status, time tracking, and replacement data
- `shows` - Scheduled performances
- `notifications` - Admin announcements and polls
- `reports` - User-submitted reports to admins
- `practice_links` - Story-specific practice video links
- `sessions` - Server-side session storage

**Key Relationships**:
- One-to-many: Story → Characters, Story → Practice Links
- Many-to-many: Members ↔ Characters (through Roles table)
- Self-referential: Members can replace other Members in attendance records

**Migration Strategy**: Drizzle Kit with migration files in `/migrations` directory

### External Dependencies

**Authentication Service**: Replit Auth (OpenID Connect provider)
- Handles user authentication and profile management
- Session management with PostgreSQL session store (`connect-pg-simple`)
- Secure cookie-based sessions with 7-day TTL

**Database Provider**: Neon (PostgreSQL-as-a-service)
- Serverless PostgreSQL with WebSocket support
- Connection pooling via `@neondatabase/serverless`

**UI Component Primitives**: Radix UI
- Accessible, unstyled component primitives (accordions, dialogs, dropdowns, etc.)
- Full keyboard navigation support

**Development Tools**:
- Replit-specific plugins for development environment integration
- Runtime error overlay for better debugging
- Dev banner and cartographer for Replit workspace features

**Build Dependencies**:
- TypeScript for type safety across the stack
- Tailwind CSS with PostCSS for styling
- date-fns for date manipulation
- react-hook-form + @hookform/resolvers for form handling
- class-variance-authority for component variant management

**No AI/ML Services**: The application does not currently integrate with any AI or ML services, though packages like `@google/generative-ai` and `openai` are present in dependencies (potentially unused or for future features).