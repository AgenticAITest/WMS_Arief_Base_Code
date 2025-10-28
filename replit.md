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
- Multi-tenant architecture
- Role-based access control (RBAC) and Permission-based authorization
- User management
- Master Data Management: Product, Inventory Type, Package Type, Supplier, and Customer CRUD operations with validation.
- Document Numbering System: Standardized document number generation for all warehouse operations with period-based formatting. Supports flexible prefixes, auto-incrementing sequences, and live preview.
- Modular page structure for extensibility.
- Comprehensive API documentation with Swagger.
- Rate limiting and CORS support.
- Hierarchical Warehouse Setup: Management of Warehouses, Zones, Aisles, Shelves, and Bins with detailed configurations.
- UX enhancements for warehouse hierarchy, including instant expansion and robust add/edit dialogs with form validation.
- Inventory Items Management: Complete CRUD operations for inventory items with product and bin associations, batch/lot tracking, expiry dates, and cost tracking.
- Stock Information: Aggregated view of inventory by product showing available quantities, location counts, and detailed location breakdowns via modal.
- Workflow Configuration: Tenant-specific workflow customization for Purchase Orders (PO) and Sales Orders (SO) with toggleable steps. Standard PO workflow includes Create, Approve, Receive, Putaway, and Complete. Standard SO workflow includes Create, Allocate, Pick, Pack, Ship, Deliver, and Complete.
- Purchase Order Putaway: Accordion-based page displaying all POs in 'putaway' workflow state. Each PO shows items in a table format with received quantities and cascading location selectors (Zone, Aisle, Shelf, Bin). Backend returns `warehouseId` to enable proper cascading filter logic. Smart Allocation button available as placeholder for future auto-allocation features. Confirm Putaway action pending implementation.
- Audit Logging: Comprehensive audit trail system tracking all user actions, state changes, and data modifications. Includes internal logging service for easy integration and read-only REST APIs for querying audit history.

### System Design Choices
- **UI/UX**: Utilizes shadcn/ui and Radix UI for a consistent and accessible component library. Warehouse hierarchy uses an accordion-based visualization. Critical fixes for Radix UI Dialogs prevent common bugs:
    1.  **Pointer-Events Cleanup**: Ensures `document.body` and `document.documentElement` pointer events are correctly reset to prevent pages from becoming unclickable after dialog closure.
    2.  **Boolean Field Validation Fix**: Requires `Boolean()` coercion for switch components when loading entity data into forms to prevent silent Zod validation failures due to varied database boolean representations.
- **Backend**: Employs a modular structure for features, with dedicated modules for system, master-data, warehouse-setup, and document-numbering. API endpoints follow clear naming conventions and support multi-tenant isolation. Database transactions are used for atomic operations.
- **Document Numbering**: Uses a period-based numbering scheme (e.g., PO-2510-WH1-LOCAL-0001) with mandatory period components and optional user-defined prefixes. Each unique combination maintains its own auto-incrementing sequence.
- **Database Schema**: Designed with clear separation between system, master data, and warehouse-specific tables. Key relationships ensure data integrity and support multi-tenancy. Geolocation support is included.
- **Authentication**: JWT-based authentication for secure access, with separate tokens for access, refresh, and password reset.
- **Workflow Module**: Database-driven workflow configuration using `workflows` and `workflow_steps` tables. `isActive` field allows per-tenant customization. When loading workflow step states, all `setState` calls must be batched into a single update to prevent React state race conditions.
- **Document Storage Strategy**: Generated documents (PO, SO, Packing Slips, etc.) are stored as HTML files (not database blobs) in `public/documents/tenants/{tenantId}/{docType}/{year}/` with metadata in a `JSONB` column in the `generated_documents` table. This supports easy reprinting, CDN readiness, and versioning. `warehouse_id` is included in `purchase_orders` and displayed in PO documents.
- **Receipt Items Data Model**: Uses a normalized `receipt_items` table to store individual item receipts for each GRN, allowing multiple receipts per PO item with separate discrepancy notes. Each receipt (GRN) has its own `receipt_items` records linked via `receiptId`. The `purchase_order_items` table maintains a denormalized `receivedQuantity` field (cumulative total) for fast queries, while `receipt_items` provides the detailed audit trail with per-receipt discrepancy notes, expiry dates, and quantities.
- **Receive Items UX**: Compact single-line form layout with fixed field positions. Discrepancy note field is always visible but enabled/disabled based on quantity variance to maintain consistent UI positions. All quantity, expiry, and confirmation fields maintain stable positions regardless of discrepancy state.
- **Putaway Page Design**: Accordion-based layout with POs as collapsible sections. Item table includes cascading location dropdowns (Zone → Aisle → Shelf → Bin) that filter based on parent selections. Backend includes `warehouseId` in API response to enable reliable cascading logic without fragile name-matching. Dropdowns reset dependent selections when parent changes to prevent stale data.
- **Smart Allocation Algorithm**: Automated bin suggestion system using weighted scoring across three factors: (1) Available Capacity (45%) - prioritizes bins with more free space calculated as `(maxVolume - currentVolume) / maxVolume`; (2) Item Match (35%) - rewards bins already containing the same SKU to encourage consolidation; (3) Temperature Match (20%) - ensures product temperature requirements (`requiredTemperatureMin`/`requiredTemperatureMax`) fall within bin's `requiredTemperature` range. Algorithm queries all active bins in the warehouse, calculates weighted scores, and auto-populates the highest-scoring bin while allowing manual override. Designed for SME/SMB simplicity without distance calculations.
- **Audit Logging**: Simple, practical audit trail system designed for SME/SMB market. Uses `audit_logs` table to track all critical operations (create, update, delete, state changes). Internal `logAudit()` service for easy integration throughout codebase. REST APIs available at `/api/audit-logs` for querying and `/api/audit-logs/resource/:type/:id` for viewing entity history. Supports filtering by module, action, resource, user, date range, and status.

## Recent Fixes
- **Oct 28, 2025**:
  - **GRN List Display**: Fixed "Received POs with GRNs" list to show ALL GRNs (multiple rows if a PO has multiple partial receipts). Changed backend query to fetch from `purchase_orders_receipt` table (one row per GRN) instead of from `purchase_orders` table. Fixed React key bug: changed from `key={po.id}` to `key={${po.id}-${po.grnDocumentId}}` to prevent duplicate key collisions when the same PO has multiple GRNs.
- **Oct 27, 2025**:
  - **Trust Proxy Security**: Fixed rate limiting vulnerability by changing `trust proxy` from `true` to `1` (trust only Replit's proxy), preventing IP spoofing attacks.
  - **GRN Document Number Generation**: Fixed 401 authentication error by passing `Authorization` header in internal API calls to document numbering service.
  - **GRN Response Parsing**: Fixed response structure handling - document numbering API returns flat JSON, not nested under `data.data`.

## Technical Debt
- **PO Rejection Modal Sizing**: The reject confirmation dialog modal needs to be 1.5x wider and taller with better button spacing. Current fix attempts using Tailwind classes (max-w-3xl, min-h-[400px]) are not taking effect, possibly due to shadcn/ui Dialog component CSS specificity issues or browser caching problems that persist even after hard refresh.

## External Dependencies
- **PostgreSQL**: Primary database for all application data, managed via Drizzle ORM.
- **Swagger UI**: For interactive API documentation, accessible at `/api-docs`.
- **Replit**: The deployment environment; configured for PostgreSQL integration, trusted proxy, and port `5000` binding.