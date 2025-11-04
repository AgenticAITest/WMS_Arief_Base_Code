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
- Sales Order Multi-Location Delivery: SO creation with support for splitting order items across multiple customer delivery locations, with expandable distribution UI and quantity validation.
- Audit Logging: Comprehensive audit trail for user actions, state changes, and data modifications, with queryable REST APIs.

### System Design Choices
- **UI/UX**: Utilizes shadcn/ui and Radix UI for consistent components. Critical fixes for Radix UI Dialogs implemented for pointer-event cleanup and boolean field validation.
- **Backend**: Modular structure for features (system, master-data, warehouse-setup, document-numbering), clear API naming, multi-tenant isolation, and database transactions for atomicity.
- **Location Update Pattern**: Supplier and customer location updates use transaction-wrapped delete-update-insert pattern. Removed locations are deleted first with FK constraint detection; updates preserve existing IDs; new locations are inserted. FK violations (SQLSTATE 23503) return HTTP 400 with user-friendly messages. All operations atomic via `db.transaction()`.
- **Document Numbering**: Period-based numbering scheme (e.g., PO-2510-WH1-LOCAL-0001) with mandatory components and optional prefixes; each unique combination maintains its own sequence.
- **Database Schema**: Designed with clear separation and multi-tenancy support. Geolocation is included. **REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA WITHOUT EXPLICIT USER PERMISSION.**
- **Authentication**: JWT-based with separate tokens for access, refresh, and password reset.
- **Workflow Module**: Database-driven configuration using `workflows` and `workflow_steps` tables, allowing per-tenant customization. Workflow step state updates are batched to prevent React race conditions.
- **Document Storage Strategy**: Generated documents (e.g., PO, SO) are stored as HTML files in a structured public directory with metadata in a `JSONB` column.
- **Receipt Items Data Model**: Normalized `receipt_items` table for individual item receipts, with `purchase_order_items` maintaining a denormalized `receivedQuantity` for performance.
- **Receive Items UX**: Compact single-line form layout with consistent field positions; discrepancy notes are contextually enabled/disabled.
- **GRN-Based Putaway Architecture**: Putaway operates on a GRN (receipt) level, allowing multiple putaway operations per PO. `purchase_orders_receipt` table includes `putawayStatus`. Backend returns GRNs with PO details; frontend groups them into a PO-focused hierarchy.
- **Putaway Page Design**: Nested accordion layout with **PO-focused UI**: outer accordions display Purchase Orders, with GRNs grouped underneath each PO as nested sub-accordions. This allows multiple GRNs per PO to be organized clearly. Each GRN contains an item table with cascading location dropdowns filtered by parent selections, and `warehouseId` in API responses for reliable filtering.
- **Smart Allocation Algorithm**: Bin suggestion system using weighted scoring based on Available Capacity (45%), Item Match (35%), and Temperature Match (20%).
- **Confirm Putaway Flow**: GRN-based transactional workflow for bin assignments, `inventory_items` creation, PUTAWAY document generation, `putawayStatus` updates, and audit logging.
- **Audit Logging**: Simple system using `audit_logs` table for critical operations, internal `logAudit()` service, and REST APIs for querying. Includes `document_path` field for tracking generated HTML documents (PO, GRN, PUTAWAY).
- **Document Viewer Integration**: Audit Log UI includes a "View Document" button (FileText icon) that appears when `documentPath` exists. Clicking opens a `DocumentViewerModal` component which fetches and displays the HTML document in a modal, supporting PO, GRN, and PUTAWAY document types.
- **Sales Order Multi-Location Delivery**: Built using native SQL for schema changes to avoid data loss. `sales_order_item_locations` table tracks per-item delivery locations. Backend uses `db.transaction()` for atomicity, validates location quantity sums, and generates SO numbers via document numbering API.
  - **Schema**: `sales_orders` table includes: `customer_id`, `shipping_location_id`, `shipping_method_id`, `order_date`, `requested_delivery_date`, `tracking_number`, `delivery_instructions`, `total_amount`, `notes`, `status` (enum: created, allocated, picked, packed, shipped, delivered), and `workflow_state`.
  - **Items Schema**: `sales_order_items` table includes: `ordered_quantity`, `allocated_quantity`, `picked_quantity`, `unit_price`, `total_price` (simple quantity × unit_price calculation, no discount/tax at item level).
  - **Status Design**: Uses "created" status for new orders (not "draft" or "pending"), aligning with WMS workflow states where orders are actionable immediately upon creation.
  - **SO Create Page Optimizations**: Products with 0 available stock are filtered at database level (HAVING clause). Customer locations preloaded via `includeLocations` query parameter for instant access. Address display uses correct `address` field from schema with city as fallback.
  - **Multi-Location Selection UI**: Checkbox-based location selector displays all customer shipping locations in a grid layout with "Select All" helper (for 4+ locations). Items table is disabled until at least one location is selected, preventing invalid allocations.
  - **Line-Item Allocation Editor**: Expandable table rows with chevron indicators allow per-item quantity distribution across selected locations. Each item shows allocation status (X/Y allocated) with green (valid) or red (invalid) highlighting. Expansion reveals location-specific quantity inputs in a grid layout with "Split Evenly" helper button for automatic distribution.
  - **Allocation Validation**: Real-time validation ensures allocated quantities sum exactly to ordered quantity. Visual feedback includes color-coded status indicators, remaining quantity display, and error messages for over/under allocation. Frontend blocks submission until all items have valid allocations.
  - **Confirmation Modal Enhancement**: Shows selected shipping locations as chips at the top, followed by items table with nested location breakdown rows displaying quantity distribution per location.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Swagger UI**: For API documentation.
- **Replit**: Deployment environment.