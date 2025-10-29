# React Admin - Warehouse Management System

## ⚠️ CRITICAL RULE: DATABASE SCHEMA CHANGES ⚠️
**REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA. ASK THE USER FIRST.**

**Before making ANY database schema changes:**
1. **STOP** - Do not proceed
2. **ASK** the user for explicit permission
3. **EXPLAIN** what schema change is needed and why
4. **WAIT** for user approval before touching the database

**This includes:**
- Adding/removing columns
- Changing data types
- Adding/removing tables
- Modifying constraints or indexes
- Running `npm run db:push` or any SQL migrations

**When encountering schema-related bugs:**
1. **First** try fixing the source code
2. **Never** assume the schema is wrong
3. **Always** ask the user which approach to take

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
- Purchase Order Putaway: Accordion-based page displaying all POs in 'putaway' workflow state. Each PO shows items in a table format with received quantities and cascading location selectors (Zone, Aisle, Shelf, Bin). Backend returns `warehouseId` to enable proper cascading filter logic. Smart Allocation button uses weighted scoring to suggest optimal bins. Confirm Putaway action creates inventory items, generates putaway documents, and completes the PO workflow.
- Audit Logging: Comprehensive audit trail system tracking all user actions, state changes, and data modifications. Includes internal logging service for easy integration and read-only REST APIs for querying audit history.

### System Design Choices

**⚠️ DATABASE SCHEMA POLICY: REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA. ASK THE USER FIRST.**

- **UI/UX**: Utilizes shadcn/ui and Radix UI for a consistent and accessible component library. Warehouse hierarchy uses an accordion-based visualization. Critical fixes for Radix UI Dialogs prevent common bugs:
    1.  **Pointer-Events Cleanup**: Ensures `document.body` and `document.documentElement` pointer events are correctly reset to prevent pages from becoming unclickable after dialog closure.
    2.  **Boolean Field Validation Fix**: Requires `Boolean()` coercion for switch components when loading entity data into forms to prevent silent Zod validation failures due to varied database boolean representations.
- **Backend**: Employs a modular structure for features, with dedicated modules for system, master-data, warehouse-setup, and document-numbering. API endpoints follow clear naming conventions and support multi-tenant isolation. Database transactions are used for atomic operations.
- **Document Numbering**: Uses a period-based numbering scheme (e.g., PO-2510-WH1-LOCAL-0001) with mandatory period components and optional user-defined prefixes. Each unique combination maintains its own auto-incrementing sequence.
- **Database Schema**: Designed with clear separation between system, master data, and warehouse-specific tables. Key relationships ensure data integrity and support multi-tenancy. Geolocation support is included. **⚠️ CRITICAL: REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA WITHOUT EXPLICIT USER PERMISSION.**
- **Authentication**: JWT-based authentication for secure access, with separate tokens for access, refresh, and password reset.
- **Workflow Module**: Database-driven workflow configuration using `workflows` and `workflow_steps` tables. `isActive` field allows per-tenant customization. When loading workflow step states, all `setState` calls must be batched into a single update to prevent React state race conditions.
- **Document Storage Strategy**: Generated documents (PO, SO, Packing Slips, etc.) are stored as HTML files (not database blobs) in `public/documents/tenants/{tenantId}/{docType}/{year}/` with metadata in a `JSONB` column in the `generated_documents` table. This supports easy reprinting, CDN readiness, and versioning. `warehouse_id` is included in `purchase_orders` and displayed in PO documents.
- **Receipt Items Data Model**: Uses a normalized `receipt_items` table to store individual item receipts for each GRN, allowing multiple receipts per PO item with separate discrepancy notes. Each receipt (GRN) has its own `receipt_items` records linked via `receiptId`. The `purchase_order_items` table maintains a denormalized `receivedQuantity` field (cumulative total) for fast queries, while `receipt_items` provides the detailed audit trail with per-receipt discrepancy notes, expiry dates, and quantities.
- **Receive Items UX**: Compact single-line form layout with fixed field positions. Discrepancy note field is always visible but enabled/disabled based on quantity variance to maintain consistent UI positions. All quantity, expiry, and confirmation fields maintain stable positions regardless of discrepancy state.
- **Putaway Page Design**: Accordion-based layout with POs as collapsible sections. Item table includes cascading location dropdowns (Zone → Aisle → Shelf → Bin) that filter based on parent selections. Backend includes `warehouseId` in API response to enable reliable cascading logic without fragile name-matching. Dropdowns reset dependent selections when parent changes to prevent stale data.
- **Smart Allocation Algorithm**: Automated bin suggestion system using weighted scoring across three factors: (1) Available Capacity (45%) - prioritizes bins with more free space calculated as `(maxVolume - currentVolume) / maxVolume`; (2) Item Match (35%) - rewards bins already containing the same SKU to encourage consolidation; (3) Temperature Match (20%) - ensures product temperature requirements (`requiredTemperatureMin`/`requiredTemperatureMax`) fall within bin's `requiredTemperature` range. Algorithm queries all active bins in the warehouse, calculates weighted scores, and auto-populates the highest-scoring bin while allowing manual override. Designed for SME/SMB simplicity without distance calculations.
- **Confirm Putaway Flow**: Transaction-based workflow that validates all items have bin assignments, creates `inventory_items` records with product and location data, generates PUTAWAY document (stored as HTML in `storage/purchase-order/documents/tenants/{tenantId}/putaway/{year}/`), updates PO workflow state to 'complete', and logs audit trail. Frontend modal displays item summary with location paths and provides real-time feedback during confirmation.
- **Audit Logging**: Simple, practical audit trail system designed for SME/SMB market. Uses `audit_logs` table to track all critical operations (create, update, delete, state changes). Internal `logAudit()` service for easy integration throughout codebase. REST APIs available at `/api/audit-logs` for querying and `/api/audit-logs/resource/:type/:id` for viewing entity history. Supports filtering by module, action, resource, user, date range, and status.

## Recent Fixes

**⚠️ REMINDER: REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA. ASK THE USER FIRST.**

- **Oct 29, 2025**:
  - **Transaction Rollback Fix (CRITICAL)**: Fixed critical transaction atomicity issue where `purchase_orders` table was being updated even when document generation failed, creating data discrepancy. Modified `PutawayDocumentGenerator.generateAndSave()` to accept optional transaction parameter and use it for database inserts (ensuring all operations are atomic). Added duplicate putaway prevention by checking workflow state before processing. Now all confirm putaway operations (inventory creation, document generation, PO status update) are fully atomic - if ANY step fails, ALL changes roll back.
  - **Putaway Document Preview Modal**: Implemented complete HTML document viewing system for putaway confirmations. Created `PutawayConfirmationModal` component (mirrors GRN pattern), backend `/putaway/:documentId/html` API endpoint, and integrated modal into PurchaseOrderPutaway page. After confirming putaway, users can view/print the generated HTML document directly in the app. Fixed `putawayDocumentGenerator` to correctly insert `referenceType` and `referenceId` into `generated_documents` table (was using incorrect field names `relatedEntityType`/`relatedEntityId`).
  - **Confirm Putaway Authorization Fix**: Fixed 401 unauthorized error in confirm putaway endpoint. Changed `req.user?.tenantId` to `req.user!.activeTenantId` and used non-null assertion pattern matching working approve/receive endpoints.
- **Oct 28, 2025**:
  - **Confirm Putaway Implementation**: Completed end-to-end Putaway confirmation flow with PutawayDocumentGenerator service, backend API endpoint with transaction handling, frontend confirmation modal with validation, document generation following GRN pattern, inventory item creation, and comprehensive audit logging. Fixed critical import path bug in PutawayDocumentGenerator (corrected `generatedDocuments` import from `@server/lib/db/schema/documentNumbering` to `@modules/document-numbering/server/lib/db/schemas/documentNumbering`).
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