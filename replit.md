# Caja SAS Enterprise - Multi-Tenant POS System

## Overview
Caja SAS Enterprise is a comprehensive Point of Sale (POS) and business management system designed as a multi-tenant SaaS application. It provides complete business management capabilities including inventory control, sales processing, purchase management, financial reporting, and multi-warehouse operations. The system aims to streamline business operations, offer real-time insights, and support scalable growth for its users.

## User Preferences
Preferred communication style: Simple, everyday language.

## Data Persistence Strategy
- **Critical Requirement**: All tenant configuration data must persist through code updates and system improvements
- **Store Settings**: Implemented robust backup mechanism with default values to prevent data loss
- **Multi-tenant Isolation**: Each tenant's store configuration (WhatsApp, colors, banners) stored in `store_settings` table
- **Update Strategy**: Use COALESCE in SQL updates to preserve existing data while setting safe defaults
- **Migration Protection**: Always backup existing data before schema changes

## System Architecture
### Frontend Architecture
- **Framework**: React with TypeScript, Wouter for routing.
- **State Management**: TanStack Query for server state.
- **UI Components**: Radix UI primitives with Tailwind CSS via shadcn/ui.
- **Forms**: React Hook Form with Zod validation.
- **Charts**: Recharts for data visualization.
- **Build Tool**: Vite.
- **UI/UX Decisions**: Responsive design for desktop/tablet, accessible components, dark/light theme support, touch-friendly POS interface, data tables with sorting/filtering/pagination.

### Backend Architecture
- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Authentication**: Passport.js (local strategy, express-session).
- **File Uploads**: Multer.
- **Security**: Multi-tenant data isolation, role-based access control (RBAC), tenant validation.
- **Core Business Modules**: POS, Inventory Management, Product Catalog, Purchase Management, Sales Reporting, Multi-Warehouse, Cash Register, Physical Inventory, Payroll, Appointments, Loans, Promotions, Customer Management, Product Costing, Settings (timezone, currency).
- **Technical Implementations**: Session-based auth, password hashing (scrypt), owner-level access for tenants, granular permissions for user roles.
- **System Design Choices**:
    - **Multi-Tenant**: Strict data segregation by tenant ID, support for subscription plans (Basic, Pro, Enterprise).
    - **Data Flow**: Authenticated client requests, tenant validation, RBAC, tenant ID filters in DB queries, response data validation.
    - **State Management**: TanStack Query (API data), React Hook Form (form data), React useState (component state), Global auth context.
    - **AI Integration**: OpenAI GPT-4o for chat, function calling (supplier/appointment/product creation, POS sales processing), voice interaction (Web Speech API).
    - **Composite Products**: Full support for composite products (productos conjunto) with automatic component stock deduction from user-assigned warehouses during sales.

### Data Storage Solutions
- **Database**: PostgreSQL (Neon serverless).
- **ORM**: Drizzle ORM (schema-first).
- **Migrations**: Drizzle Kit.
- **Session Storage**: PostgreSQL-based.

## External Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity.
- **drizzle-orm**: Type-safe database ORM.
- **@tanstack/react-query**: Server state management.
- **@radix-ui/***: Accessible UI component primitives.
- **react-hook-form**: Form state management.
- **zod**: Runtime type validation.
- **passport**: Authentication middleware.
- **@stripe/stripe-js**, **@stripe/react-stripe-js**: Stripe payment processing.
- **openai**: OpenAI API for AI chat and function calling.
- **Vitest**, **@testing-library/react**, **@testing-library/jest-dom**: Testing.