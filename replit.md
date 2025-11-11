# React Admin - Warehouse Management System

## Overview
This project is a comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. Its primary purpose is to provide a modular and scalable foundation for warehouse management, including features for managing users, roles, permissions, multi-tenant organizations with robust authentication and authorization, and detailed hierarchical setup of warehouses. The system aims to streamline warehouse operations, from product and inventory type management to advanced sales order processing (allocation, picking, packing). The business vision is to provide a robust, scalable, and intuitive platform for efficient warehouse operations, with market potential in various logistics and supply chain sectors.

### Implementation Status (as of 2025-11-11)
**✅ Completed Workflows:**
- Purchase Order: Create → Approve → Receive → Putaway
- Sales Order: Create → Allocate → Pick → Pack → Ship

**⚠️ Not Yet Implemented:**
- Purchase Order: Complete (terminal state)
- Sales Order: Deliver, Complete

**📚 Documentation:**
- `docs/WORKFLOW_LOGIC_ANALYSIS.md` - Comprehensive issue tracker separating actual bugs, incomplete features, and design improvements
- `docs/WORKFLOW_PSEUDOCODE_REFERENCE.md` - Complete workflow pseudocode with implementation status markers

**🔄 Recent Changes (2025-11-11):**
- Implemented Sales Order Ship workflow: package-to-location assignment, transporter selection, inventory deduction, HTML document generation
- Migrated Transporters from sales-order module to master-data module (schema, routes, UI)

## User Preferences
None specified yet

## System Architecture

### Tech Stack
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Radix UI, shadcn/ui components
- **Backend**: Node.js, Express, vite-express
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (Access, Refresh, Reset tokens)

### UI/UX Decisions
- Utilizes shadcn/ui and Radix UI for consistent components.
- Specific fixes implemented for Radix UI Dialogs.
- PO-focused UI for putaway with nested accordions for GRNs.
- Compact single-line forms for receiving items.
- Sales Order multi-location selection uses checkbox grid.
- Line-item allocation editor features expandable rows and "Split Evenly" helper.
- SKU-centric pick UI with nested location rows and auto-population logic.
- Package creation modal with comprehensive package management and item assignment.

### Technical Implementations & Feature Specifications
- **Multi-tenancy**: Role-based access control (RBAC) and permission-based authorization.
- **Master Data Management**: CRUD operations for Product, Inventory Type, Package Type, Supplier, Customer, Transporter.
- **Document Numbering System**: Standardized, period-based generation with flexible prefixes.
- **Hierarchical Warehouse Setup**: Management of Warehouses, Zones, Aisles, Shelves, Bins.
- **Inventory Items Management**: CRUD for items with product/bin associations, batch/lot tracking, expiry dates, cost tracking.
- **Stock Information**: Aggregated inventory view by product with location breakdowns.
- **Workflow Configuration**: Tenant-specific customizable workflows for Purchase Orders (PO) and Sales Orders (SO).
- **Purchase Order Putaway**: Accordion-based interface for GRNs, "Smart Allocation" algorithm for bin suggestions.
- **Sales Order Multi-Location Delivery**: SO creation with splitting order items across multiple customer delivery locations.
  - Schema includes `customer_id`, `shipping_location_id`, `status`, `workflow_state`.
  - Products with 0 stock are filtered.
  - Real-time allocation validation with visual feedback.
- **Sales Order Allocation**: FIFO/FEFO-based inventory reservation, atomic transactions.
  - `allocations` table tracks inventory-to-SO-item mappings.
  - HTML document generation for allocations.
- **Sales Order Pick System**: Guided location-based picking using FIFO/FEFO allocated inventory.
  - Displays allocation records with full warehouse hierarchy.
  - SKU-centric pick UI with nested location rows, auto-population, and real-time validation.
  - HTML document generation for picks.
- **Sales Order Pack System**: Package creation, dimension tracking, item-to-package assignment.
  - `packages` and `package_items` tables support fractional quantities.
  - Package ID format: `PKG-{SO_NUMBER}-{SEQUENCE}`.
  - HTML document generation for packs.
- **Sales Order Ship System**: Shipment confirmation with package-to-delivery-location assignment.
  - Package-level delivery location selection (multi-location support).
  - Transporter selection from master-data module.
  - Shipping method configuration.
  - **Inventory deduction**: Atomic transaction reduces `available_quantity` from `inventory_items` based on allocations during Ship confirmation.
  - Workflow advancement: packed/ship → shipped/deliver.
  - Shipment record creation in `shipments` table with tracking information.
  - HTML document generation for shipping instructions.
- **Audit Logging**: Comprehensive audit trail for user actions and data modifications with queryable APIs.
- **Document Viewer Integration**: UI allows viewing generated HTML documents (PO, GRN, PUTAWAY, ALLOCATION, PICK, PACK, SHIP) in a modal.

### System Design Choices
- **Backend Modularity**: Features organized into logical modules (system, master-data, warehouse-setup, document-numbering).
- **Database Transactions**: Atomicity ensured for critical operations (e.g., location updates, SO allocation, picking, packing) using `db.transaction()`.
- **Document Storage Strategy**: Generated documents stored as HTML files in a structured public directory with metadata in a `JSONB` column of the `generated_documents` table.
- **Document Numbering**: Period-based, unique sequence per document type and context.
- **Database Schema**: Designed for multi-tenancy and clear separation. **REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA WITHOUT EXPLICIT USER PERMISSION.**
- **Workflow Module**: Database-driven configuration for tenant-specific process customization.
- **Receipt Items Data Model**: Normalized `receipt_items` with denormalized `receivedQuantity` in `purchase_order_items`.
- **GRN-Based Putaway**: Putaway operates at the Goods Receipt Note (GRN) level, allowing multiple putaways per PO.
- **Smart Allocation Algorithm**: Bin suggestion based on weighted scoring (Capacity, Item Match, Temperature Match).
- **`generated_documents` table**: Unique constraint `(tenant_id, reference_type, reference_id, document_type)` allows multiple document types for the same reference entity.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Swagger UI**: For API documentation.
- **Replit**: Deployment environment.