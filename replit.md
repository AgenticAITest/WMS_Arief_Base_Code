# React Admin - Warehouse Management System

## Overview
This project is a comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. Its primary purpose is to provide a modular and scalable foundation for warehouse management, including features for managing users, roles, permissions, and multi-tenant organizations with robust authentication and authorization. The system aims to streamline warehouse operations, from product and inventory type management to detailed hierarchical setup of warehouses, zones, aisles, shelves, and bins. The business vision is to provide a robust, scalable, and intuitive platform for efficient warehouse operations, with market potential in various logistics and supply chain sectors.

## User Preferences
None specified yet

## System Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui components
- **Backend**: Node.js, Express, vite-express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (Access, Refresh, Reset tokens)

### Key Features
- Multi-tenant architecture with Role-based access control (RBAC) and Permission-based authorization.
- User management.
- Master Data Management: CRUD for Product, Inventory Type, Package Type, Supplier, and Customer.
- Document Numbering System: Standardized, period-based document number generation with flexible prefixes and auto-incrementing sequences.
- Modular page structure and comprehensive API documentation with Swagger.
- Rate limiting and CORS support.
- Hierarchical Warehouse Setup: Management of Warehouses, Zones, Aisles, Shelves, and Bins with detailed configurations.
- Inventory Items Management: CRUD for inventory items with product and bin associations, batch/lot tracking, expiry dates, and cost tracking.
- Stock Information: Aggregated inventory view by product with location breakdowns.
- Workflow Configuration: Tenant-specific customizable workflows for Purchase Orders (PO) and Sales Orders (SO).
- Purchase Order Putaway: Accordion-based interface for POs in 'putaway' state, featuring cascading location selectors and a "Smart Allocation" algorithm for optimal bin suggestions.
- Audit Logging: Comprehensive audit trail for user actions, state changes, and data modifications, with queryable REST APIs.

### System Design Choices
- **UI/UX**: Utilizes shadcn/ui and Radix UI for consistent components. Critical fixes for Radix UI Dialogs implemented for pointer-event cleanup and boolean field validation.
- **Backend**: Modular structure for features (system, master-data, warehouse-setup, document-numbering), clear API naming, multi-tenant isolation, and database transactions for atomicity.
- **Document Numbering**: Period-based numbering scheme (e.g., PO-2510-WH1-LOCAL-0001) with mandatory components and optional prefixes; each unique combination maintains its own sequence.
- **Database Schema**: Designed with clear separation and multi-tenancy support. Geolocation is included. **REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA WITHOUT EXPLICIT USER PERMISSION.**
- **Authentication**: JWT-based with separate tokens for access, refresh, and password reset.
- **Workflow Module**: Database-driven configuration using `workflows` and `workflow_steps` tables, allowing per-tenant customization. Workflow step state updates are batched to prevent React race conditions.
- **Document Storage Strategy**: Generated documents (e.g., PO, SO) are stored as HTML files in a structured public directory with metadata in a `JSONB` column.
- **Receipt Items Data Model**: Normalized `receipt_items` table for individual item receipts, with `purchase_order_items` maintaining a denormalized `receivedQuantity` for performance.
- **Receive Items UX**: Compact single-line form layout with consistent field positions; discrepancy notes are contextually enabled/disabled.
- **GRN-Based Putaway Architecture**: Putaway operates on a GRN (receipt) level, allowing multiple putaway operations per PO. `purchase_orders_receipt` table includes `putawayStatus`. Frontend displays GRN-centric accordions.
- **Putaway Page Design**: Accordion-based layout with GRNs, cascading location dropdowns filtered by parent selections, and `warehouseId` in API responses for reliable filtering.
- **Smart Allocation Algorithm**: Bin suggestion system using weighted scoring based on Available Capacity (45%), Item Match (35%), and Temperature Match (20%).
- **Confirm Putaway Flow**: GRN-based transactional workflow for bin assignments, `inventory_items` creation, PUTAWAY document generation, `putawayStatus` updates, and audit logging.
- **Audit Logging**: Simple system using `audit_logs` table for critical operations, internal `logAudit()` service, and REST APIs for querying.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Swagger UI**: For API documentation.
- **Replit**: Deployment environment.