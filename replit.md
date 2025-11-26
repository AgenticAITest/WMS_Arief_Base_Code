# React Admin - Warehouse Management System

## Overview
This project is a comprehensive admin dashboard built with React, TypeScript, Vite, and Drizzle ORM. Its primary purpose is to provide a modular and scalable foundation for warehouse management, including features for managing users, roles, permissions, multi-tenant organizations with robust authentication and authorization, and detailed hierarchical setup of warehouses. The system aims to streamline warehouse operations, from product and inventory type management to advanced sales order processing (allocation, picking, packing). The business vision is to provide a robust, scalable, and intuitive platform for efficient warehouse operations, with market potential in various logistics and supply chain sectors.

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
- PO-focused UI for putaway with nested accordions for GRNs.
- Compact single-line forms for receiving items.
- Sales Order multi-location selection uses checkbox grid.
- Line-item allocation editor features expandable rows and "Split Evenly" helper.
- SKU-centric pick UI with nested location rows and auto-population logic.
- Package creation modal with comprehensive package management and item assignment.
- Consistent button patterns for viewing details and generated documents across history pages.

### Technical Implementations & Feature Specifications
- **Multi-tenancy**: Role-based access control (RBAC) and permission-based authorization.
- **Master Data Management**: CRUD for Product, Inventory Type, Package Type, Supplier, Customer, Transporter.
- **Document Numbering System**: Standardized, period-based generation with flexible prefixes.
- **Hierarchical Warehouse Setup**: Management of Warehouses, Zones, Aisles, Shelves, Bins.
- **Inventory Items Management**: CRUD for items with product/bin associations, batch/lot tracking, expiry dates, cost tracking.
- **Stock Information**: Aggregated inventory view by product with location breakdowns.
- **Workflow Configuration**: Tenant-specific customizable workflows for Purchase Orders (PO) and Sales Orders (SO).
- **Purchase Order Putaway**: Accordion-based interface for GRNs, "Smart Allocation" algorithm for bin suggestions.
- **Sales Order Multi-Location Delivery**: SO creation with splitting order items across multiple customer delivery locations, real-time allocation validation.
- **Sales Order Allocation**: FIFO/FEFO-based inventory reservation, atomic transactions, HTML document generation.
- **Sales Order Pick System**: Guided location-based picking using FIFO/FEFO allocated inventory, HTML document generation.
- **Sales Order Pack System**: Package creation, dimension tracking, item-to-package assignment, HTML document generation.
- **Sales Order Ship System**: Shipment confirmation, package-to-delivery-location assignment, transporter selection, inventory deduction, HTML document generation.
- **Inventory Adjustment System**: Simplified workflow for inventory corrections, SKU-based search, conditional reason codes, document numbering.
- **Inventory Relocation Feature**: Workflow for moving inventory between bins, atomic transactions, document generation.
- **Cycle Count Management**: Approval processes, auto-creation of adjustments based on variances, HTML document generation.
- **Audit Logging**: Comprehensive audit trail for user actions and data modifications.
- **Movement History**: Centralized tracking of all inventory movements (putaway, pick, adjustment, relocation) with search, filters, pagination, and CSV export.
- **Financial Report Feature**: Dashboard for revenue analysis and profitability insights, calculating metrics like Total Revenue, Gross Profit, Inventory Value, and Average Order Value.
- **Document Viewer Integration**: UI allows viewing generated HTML documents (PO, GRN, PUTAWAY, ALLOCATION, PICK, PACK, SHIP, Adjustment, Relocation, Cycle Count) in a modal.

### System Design Choices
- **Backend Modularity**: Features organized into logical modules (system, master-data, warehouse-setup, document-numbering).
- **Database Transactions**: Atomicity ensured for critical operations using `db.transaction()`.
- **Document Storage Strategy**: Generated documents stored as HTML files in a structured public directory with metadata in a `JSONB` column of the `generated_documents` table.
- **Document Numbering**: Period-based, unique sequence per document type and context.
- **Database Schema**: Designed for multi-tenancy and clear separation. **REPLIT AGENT IS NOT AUTHORIZED TO CHANGE DATABASE SCHEMA WITHOUT EXPLICIT USER PERMISSION.**
- **Workflow Module**: Database-driven configuration for tenant-specific process customization.
- **GRN-Based Putaway**: Putaway operates at the Goods Receipt Note (GRN) level, allowing multiple putaways per PO.
- **Smart Allocation Algorithm**: Bin suggestion based on weighted scoring (Capacity, Item Match, Temperature Match).
- **`generated_documents` table**: Unique constraint `(tenant_id, reference_type, reference_id, document_type)` allows multiple document types for the same reference entity.

## External Dependencies
- **PostgreSQL**: Primary database.
- **Swagger UI**: For API documentation.
- **Replit**: Deployment environment.