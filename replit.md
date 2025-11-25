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

**🔄 Recent Changes (2025-11-25):**
- **Movement History Feature**: Centralized tracking of all inventory movements across warehouse operations
  - **Database Schema**: movement_history table with tenant_id, user_id, inventory_item_id, bin_id, quantity_changed, movement_type, reference_type, reference_id, reference_number, notes, created_at
  - **Movement Types**: putaway, pick, adjustment, relocation
  - **Integration**: All workflows log movements atomically within transactions using raw SQL INSERT
    - Putaway: Logs positive quantity when inventory enters bins
    - Pick: Logs negative quantity when inventory leaves bins
    - Adjustment: Logs quantity difference (positive or negative) when approved
    - Relocation: Logs TWO records per item (FROM bin negative, TO bin positive)
  - **API Endpoints**: GET /movement-history (paginated list with search/filters), GET /movement-history/:id (single record), GET /movement-history/export/csv (full export)
  - **Frontend**: MovementHistory page with search by SKU/product name, filter by movement type and date range, pagination, CSV export
  - **ViewMovementModal**: Detailed movement view showing bin location path, product info, quantity changed (color-coded), reference document link
  - **Menu**: Added under Inventory Items → Movement History

**🔄 Previous Changes (2025-11-21):**
- **History Page UX Enhancements**: Unified document viewing pattern across all inventory history pages
  - **Consistent Button Pattern**: Eye icon for viewing details, FileText icon for viewing generated documents
  - **AdjustmentHistory**: Added ViewAdjustmentModal for details view, FileText button shows only for status='approved'
  - **CycleCountHistory**: Added FileText button for document viewer, shows for status='approved' OR status='completed'
  - **RelocationHistory**: Already follows same pattern (Eye for details, FileText for documents)
  - **Backend Endpoints**: GET /api/modules/inventory-items/cycle-counts/:id/document to fetch cycle count document paths
  - **Document Query**: All document endpoints query generated_documents table, validate tenant ownership, and return HTML file path from files JSONB column
- **Inventory Relocation Feature**: Complete implementation for moving inventory between bins
  - **Database Schema**: relocations and relocation_items tables with UUID primary keys, proper indexes, tenant scoping
  - **Document Numbering**: RELOC-[PERIOD]-WH1-#### format configured
  - **Workflow**: Create (status='created', editable/deletable) → Approve (inventory moved, document generated, status='approved') OR Reject (status='rejected', no inventory changes)
  - **SKU Search**: Reuses cycle-count endpoint for consistency
  - **Bin Selection**: FROM bin (checkbox from search results), TO bin (dropdown, filtered to exclude from bin)
  - **Quantity Validation**: Cannot exceed available stock in FROM bin
  - **Atomic Transactions**: All operations (inventory deduction from FROM bin, addition to TO bin, document generation, status changes) within single database transaction with row-level locking
  - **Document Generation**: HTML relocation documents only generated when relocation is approved (not during creation)
  - **Frontend Pages**: RelocationCreate (status='created'), RelocationApprove (pending), RelocationHistory (processed)
  - **Menu Structure**: Fixed duplicate React key warnings by assigning unique IDs to all sidebar menu items (inventory-items='inventory-items', adjustment='adjustment', relocate='relocate', cycle-count='cycle-count')
  - **Audit Trail**: Comprehensive logging for relocation creation, updates, approvals, rejections with document_path saved to audit log on approval
  - **Edit Modal Enhancement**: Displays current available quantity from inventory_items (not saved relocation quantity) for accurate stock visibility
  - **Approval Validation**: Row-level locking (SELECT FOR UPDATE) prevents negative inventory under concurrent approvals; detailed error messages show SKU, product name, bin name, current quantity, and requested quantity
- **Cycle Count Adjustment Improvements**: Enhanced workflow for system-generated adjustments
  - **Protection**: cycle_count type adjustments cannot be edited or deleted (backend validation + UI controls)
  - **Reason Code Preservation**: Uses original reason code from cycle count item, not auto-assigned STOCK_FOUND/STOCK_LOST
  - **Deferred Document Generation**: Adjustment HTML only generated when approved, not during cycle count approval
  - Backend: Added type='cycle_count' validation to edit/delete endpoints
  - Frontend: Edit/delete buttons hidden for cycle_count adjustments in AdjustmentCreate page
  - Audit trail updated to reflect deferred document generation

**🔄 Previous Changes (2025-11-19):**
- **Cycle Count Approval Enhancement**: Auto-creates adjustments when cycle count is approved
  - Generates cycle count HTML document with variance details
  - Document path: `storage/inventory/cycle-count/tenants/{tenantId}/{yyyy}/CYCCOUNT-{NUMBER}.html`
  - Filters items with quantity differences (`varianceQuantity != 0`)
  - Auto-creates adjustment (type='cycle_count', status='created') ONLY if variances exist
  - Links adjustment to cycle count via `cycleCountId` field
  - **Transaction Atomicity**: All operations (status update, document generation, adjustment creation, inventory validation) within single database transaction
  - **Error Handling**: Missing inventory items validated before adjustment creation; file write failures trigger transaction rollback
  - **Audit Trail**: Comprehensive logging for both cycle count approval and auto-created adjustments
- **Adjustment History**: Added History submenu to view approved/rejected adjustments with document viewer
- **Adjustment Approve**: Approve/Reject adjustments with transactional atomicity and inventory updates
- **Menu structure**: Fixed duplicate React key warnings by assigning unique IDs to sidebar menu items (inventory-items, adjustment, cycle-count)

**🔄 Previous Changes (2025-11-18):**
- Implemented Inventory Adjustment Create feature: Create adjustments with SKU search, reason codes, and quantity updates
- Document numbering: STOCKADJ-[PERIOD]-WH1-#### format

**🔄 Previous Changes (2025-11-11):**
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
- **Inventory Adjustment System**: Simplified workflow for inventory corrections and discrepancies.
  - SKU-based search reuses cycle-count endpoint for consistency.
  - Conditional reason codes based on adjustment direction (positive/negative).
  - User enters NEW quantity; system calculates difference automatically.
  - Document numbering: STOCKADJ-[PERIOD]-WH1-#### format.
  - Status: created (editable/deletable) → applied (inventory updated, terminal).
- **Audit Logging**: Comprehensive audit trail for user actions and data modifications with queryable APIs.
- **Movement History**: Centralized tracking of all inventory movements (putaway, pick, adjustment, relocation) with search, filters, pagination, and CSV export.
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