--
-- PostgreSQL database dump
--

\restrict lPQE7HmYHbrCjf1hlkcFOAdkAc38FBtD00tgQtQeli9e4kNxMR6exCd7gc7yOqh

-- Dumped from database version 16.9 (415ebe8)
-- Dumped by pg_dump version 16.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: adjustment_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.adjustment_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    adjustment_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    old_quantity integer NOT NULL,
    new_quantity integer NOT NULL,
    quantity_difference integer NOT NULL,
    reason_code character varying(50) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.adjustment_items OWNER TO neondb_owner;

--
-- Name: TABLE adjustment_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.adjustment_items IS 'Individual line items for inventory adjustments';


--
-- Name: COLUMN adjustment_items.quantity_difference; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.adjustment_items.quantity_difference IS 'Calculated as new_quantity - old_quantity';


--
-- Name: adjustments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.adjustments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    adjustment_number character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'created'::character varying NOT NULL,
    type character varying(20) DEFAULT 'regular'::character varying NOT NULL,
    cycle_count_id uuid,
    notes text,
    created_by uuid,
    approved_by uuid,
    applied_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.adjustments OWNER TO neondb_owner;

--
-- Name: TABLE adjustments; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.adjustments IS 'Inventory adjustment records for stock corrections';


--
-- Name: COLUMN adjustments.status; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.adjustments.status IS 'Status: created, submitted, approved, rejected, applied';


--
-- Name: COLUMN adjustments.type; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON COLUMN public.adjustments.type IS 'Type of adjustment: regular or cycle_count';


--
-- Name: aisles; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.aisles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    zone_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.aisles OWNER TO neondb_owner;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    user_id uuid,
    module character varying(100) NOT NULL,
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255) NOT NULL,
    changed_fields jsonb,
    description text,
    previous_state character varying(50),
    new_state character varying(50),
    batch_id uuid,
    status character varying(20) DEFAULT 'success'::character varying NOT NULL,
    error_message text,
    ip_address character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    document_path text
);


ALTER TABLE public.audit_logs OWNER TO neondb_owner;

--
-- Name: bins; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.bins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    shelf_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    barcode character varying(100),
    max_weight numeric(10,3),
    max_volume numeric(10,3),
    fixed_sku character varying(255),
    category character varying(100),
    required_temperature character varying(50),
    accessibility_score integer DEFAULT 50 NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    current_weight numeric(10,3) DEFAULT 0 NOT NULL,
    current_volume numeric(10,3) DEFAULT 0 NOT NULL
);


ALTER TABLE public.bins OWNER TO neondb_owner;

--
-- Name: customer_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customer_locations (
    id uuid NOT NULL,
    customer_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    location_type character varying(50) NOT NULL,
    address text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    latitude numeric(9,6),
    longitude numeric(9,6),
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customer_locations OWNER TO neondb_owner;

--
-- Name: customers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.customers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    tax_id character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.customers OWNER TO neondb_owner;

--
-- Name: cycle_count_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cycle_count_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cycle_count_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    bin_id uuid NOT NULL,
    system_quantity integer NOT NULL,
    counted_quantity integer,
    variance_quantity integer,
    variance_amount numeric(15,2),
    reason_code character varying(50),
    reason_description text,
    counted_by uuid,
    counted_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cycle_count_items OWNER TO neondb_owner;

--
-- Name: cycle_counts; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.cycle_counts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    count_number character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'created'::character varying NOT NULL,
    count_type character varying(50) DEFAULT 'partial'::character varying,
    scheduled_date date,
    completed_date date,
    variance_threshold numeric(5,2) DEFAULT 0.00,
    total_variance_amount numeric(15,2),
    notes text,
    created_by uuid,
    approved_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.cycle_counts OWNER TO neondb_owner;

--
-- Name: deliveries; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.deliveries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_id uuid NOT NULL,
    sales_order_id uuid NOT NULL,
    status character varying(50) NOT NULL,
    delivery_date timestamp without time zone NOT NULL,
    recipient_name character varying(255),
    notes text,
    return_purchase_order_id uuid,
    delivered_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT deliveries_status_check CHECK (((status)::text = ANY ((ARRAY['complete'::character varying, 'partial'::character varying])::text[])))
);


ALTER TABLE public.deliveries OWNER TO neondb_owner;

--
-- Name: delivery_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.delivery_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    delivery_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_item_id uuid NOT NULL,
    product_id uuid NOT NULL,
    shipped_quantity numeric(15,3) NOT NULL,
    accepted_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    rejected_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    rejection_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.delivery_items OWNER TO neondb_owner;

--
-- Name: demo_department; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.demo_department (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    "group" character varying(255) NOT NULL,
    date date NOT NULL,
    in_time time without time zone NOT NULL,
    out_time time without time zone NOT NULL,
    tenant_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.demo_department OWNER TO neondb_owner;

--
-- Name: document_number_config; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_number_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    document_name character varying(255) NOT NULL,
    description character varying(500),
    period_format character varying(20) DEFAULT 'YYMM'::character varying NOT NULL,
    prefix1_label character varying(100),
    prefix1_default_value character varying(50),
    prefix1_required boolean DEFAULT false NOT NULL,
    prefix2_label character varying(100),
    prefix2_default_value character varying(50),
    prefix2_required boolean DEFAULT false NOT NULL,
    sequence_length integer DEFAULT 4 NOT NULL,
    sequence_padding character varying(1) DEFAULT '0'::character varying NOT NULL,
    separator character varying(5) DEFAULT '-'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_number_config OWNER TO neondb_owner;

--
-- Name: document_number_history; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_number_history (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    config_id uuid NOT NULL,
    tracker_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    generated_number character varying(255) NOT NULL,
    period character varying(20) NOT NULL,
    prefix1 character varying(50),
    prefix2 character varying(50),
    sequence_number integer NOT NULL,
    document_id uuid,
    document_table_name character varying(100),
    generated_by uuid,
    generated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_voided boolean DEFAULT false NOT NULL,
    voided_at timestamp without time zone,
    voided_by uuid,
    void_reason character varying(500),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_number_history OWNER TO neondb_owner;

--
-- Name: document_sequence_tracker; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.document_sequence_tracker (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    config_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    period character varying(20) NOT NULL,
    prefix1 character varying(50),
    prefix2 character varying(50),
    current_sequence integer DEFAULT 0 NOT NULL,
    last_generated_number character varying(255),
    last_generated_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.document_sequence_tracker OWNER TO neondb_owner;

--
-- Name: generated_documents; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.generated_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(100) NOT NULL,
    reference_type character varying(50) NOT NULL,
    reference_id uuid NOT NULL,
    files jsonb NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    generated_by uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.generated_documents OWNER TO neondb_owner;

--
-- Name: inventory_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.inventory_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    product_id uuid NOT NULL,
    bin_id uuid NOT NULL,
    available_quantity integer NOT NULL,
    reserved_quantity integer DEFAULT 0 NOT NULL,
    expiry_date date,
    batch_number character varying(100),
    lot_number character varying(100),
    received_date date,
    cost_per_unit numeric(10,2),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.inventory_items OWNER TO neondb_owner;

--
-- Name: package_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.package_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    package_id uuid NOT NULL,
    product_id uuid NOT NULL,
    quantity numeric(15,3) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sales_order_item_id uuid
);


ALTER TABLE public.package_items OWNER TO neondb_owner;

--
-- Name: package_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.package_types (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    units_per_package integer,
    barcode character varying(100),
    dimensions character varying(100),
    weight numeric(10,3),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.package_types OWNER TO neondb_owner;

--
-- Name: packages; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.packages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    shipment_id uuid,
    package_number character varying(100) NOT NULL,
    barcode character varying(255),
    weight numeric(15,3),
    length numeric(15,2),
    width numeric(15,2),
    height numeric(15,2),
    volume numeric(15,3),
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    sales_order_id uuid,
    package_id character varying(100)
);


ALTER TABLE public.packages OWNER TO neondb_owner;

--
-- Name: product_types; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.product_types (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    category character varying(100),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.product_types OWNER TO neondb_owner;

--
-- Name: products; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.products (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    inventory_type_id uuid,
    package_type_id uuid,
    sku character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    minimum_stock_level integer,
    reorder_point integer,
    required_temperature_min numeric(5,2),
    required_temperature_max numeric(5,2),
    weight numeric(10,3),
    dimensions character varying(100),
    active boolean DEFAULT true,
    has_expiry_date boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.products OWNER TO neondb_owner;

--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    product_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    ordered_quantity integer NOT NULL,
    received_quantity integer DEFAULT 0 NOT NULL,
    unit_cost numeric(10,2),
    total_cost numeric(15,2),
    expected_expiry_date date,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.purchase_order_items OWNER TO neondb_owner;

--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    supplier_id uuid,
    supplier_location_id uuid,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    workflow_state character varying(50) DEFAULT 'create'::character varying,
    order_date date NOT NULL,
    expected_delivery_date date,
    total_amount numeric(15,2),
    notes text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    warehouse_id uuid NOT NULL,
    delivery_method character varying(20) DEFAULT 'delivery'::character varying NOT NULL,
    is_return boolean DEFAULT false NOT NULL,
    CONSTRAINT delivery_method_check CHECK ((((delivery_method)::text = 'delivery'::text) OR (((delivery_method)::text = 'pickup'::text) AND (supplier_location_id IS NOT NULL))))
);


ALTER TABLE public.purchase_orders OWNER TO neondb_owner;

--
-- Name: purchase_orders_receipt; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.purchase_orders_receipt (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    purchase_order_id uuid NOT NULL,
    grn_document_id uuid,
    tenant_id uuid NOT NULL,
    receipt_date timestamp without time zone DEFAULT now() NOT NULL,
    received_by uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    putaway_status character varying(20) DEFAULT 'pending'::character varying NOT NULL
);


ALTER TABLE public.purchase_orders_receipt OWNER TO neondb_owner;

--
-- Name: receipt_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.receipt_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    receipt_id uuid NOT NULL,
    po_item_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    received_quantity integer NOT NULL,
    expiry_date date,
    discrepancy_note text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.receipt_items OWNER TO neondb_owner;

--
-- Name: TABLE receipt_items; Type: COMMENT; Schema: public; Owner: neondb_owner
--

COMMENT ON TABLE public.receipt_items IS 'Stores individual item receipts for each GRN, allowing multiple receipts per PO item with separate discrepancy notes';


--
-- Name: reports; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.reports (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public.reports OWNER TO neondb_owner;

--
-- Name: sales_order_allocations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_allocations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_item_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    allocated_quantity numeric(15,3) NOT NULL,
    allocation_date timestamp without time zone DEFAULT now() NOT NULL,
    allocated_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_order_allocations OWNER TO neondb_owner;

--
-- Name: sales_order_item_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_item_locations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_item_id uuid NOT NULL,
    customer_location_id uuid NOT NULL,
    quantity numeric(15,3) NOT NULL,
    delivery_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_order_item_locations OWNER TO neondb_owner;

--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_id uuid NOT NULL,
    line_number integer NOT NULL,
    product_id uuid NOT NULL,
    allocated_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    picked_quantity numeric(15,3) DEFAULT 0 NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    ordered_quantity numeric(15,3) NOT NULL
);


ALTER TABLE public.sales_order_items OWNER TO neondb_owner;

--
-- Name: sales_order_picks; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_order_picks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_item_id uuid NOT NULL,
    inventory_item_id uuid NOT NULL,
    picked_quantity numeric(15,3) NOT NULL,
    batch_number character varying(100),
    lot_number character varying(100),
    serial_number character varying(100),
    pick_date timestamp without time zone DEFAULT now() NOT NULL,
    picked_by uuid,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sales_order_picks OWNER TO neondb_owner;

--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sales_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    order_number character varying(100) NOT NULL,
    customer_id uuid NOT NULL,
    order_date date NOT NULL,
    status character varying(50) DEFAULT 'created'::character varying NOT NULL,
    workflow_state character varying(50),
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    shipping_location_id uuid,
    shipping_method_id uuid,
    tracking_number character varying(100),
    delivery_instructions text,
    requested_delivery_date date,
    CONSTRAINT sales_orders_status_check CHECK (((status)::text = ANY ((ARRAY['created'::character varying, 'allocated'::character varying, 'picked'::character varying, 'packed'::character varying, 'shipped'::character varying, 'delivered'::character varying])::text[])))
);


ALTER TABLE public.sales_orders OWNER TO neondb_owner;

--
-- Name: sample_module; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sample_module (
    id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(500),
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    is_public boolean DEFAULT false NOT NULL,
    tenant_id uuid NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sample_module OWNER TO neondb_owner;

--
-- Name: shelves; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shelves (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aisle_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.shelves OWNER TO neondb_owner;

--
-- Name: shipments; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shipments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    sales_order_id uuid NOT NULL,
    shipment_number character varying(100) NOT NULL,
    shipping_method_id uuid,
    shipping_date timestamp without time zone,
    delivery_date timestamp without time zone,
    actual_delivery_date timestamp without time zone,
    tracking_number character varying(255),
    carrier_name character varying(255),
    total_weight numeric(15,3),
    total_volume numeric(15,3),
    total_cost numeric(15,2),
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    shipment_document_id uuid,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    transporter_id uuid,
    CONSTRAINT shipments_status_check CHECK (((status)::text = ANY ((ARRAY['ready'::character varying, 'in_transit'::character varying, 'delivered'::character varying, 'failed'::character varying, 'returned'::character varying])::text[])))
);


ALTER TABLE public.shipments OWNER TO neondb_owner;

--
-- Name: shipping_methods; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.shipping_methods (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(50) NOT NULL,
    transporter_id uuid,
    cost_calculation_method character varying(50) DEFAULT 'fixed'::character varying NOT NULL,
    base_cost numeric(15,2),
    estimated_days integer,
    is_active boolean DEFAULT true NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid,
    CONSTRAINT shipping_methods_check CHECK (((((type)::text = 'internal'::text) AND (transporter_id IS NULL)) OR (((type)::text = 'third_party'::text) AND (transporter_id IS NOT NULL)))),
    CONSTRAINT shipping_methods_cost_calculation_method_check CHECK (((cost_calculation_method)::text = ANY ((ARRAY['fixed'::character varying, 'weight_based'::character varying, 'volume_based'::character varying, 'distance_based'::character varying])::text[]))),
    CONSTRAINT shipping_methods_type_check CHECK (((type)::text = ANY ((ARRAY['internal'::character varying, 'third_party'::character varying])::text[])))
);


ALTER TABLE public.shipping_methods OWNER TO neondb_owner;

--
-- Name: supplier_locations; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.supplier_locations (
    id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    location_type character varying(50) DEFAULT 'pickup'::character varying,
    address text,
    city character varying(100),
    state character varying(100),
    postal_code character varying(20),
    country character varying(100),
    latitude numeric(9,6),
    longitude numeric(9,6),
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.supplier_locations OWNER TO neondb_owner;

--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.suppliers (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    tax_id character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.suppliers OWNER TO neondb_owner;

--
-- Name: sys_module_auth; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_module_auth (
    id uuid NOT NULL,
    module_id character varying(255) NOT NULL,
    module_name character varying(255) NOT NULL,
    tenant_id uuid NOT NULL,
    is_enabled boolean DEFAULT false NOT NULL,
    enabled_at timestamp without time zone,
    enabled_by character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_module_auth OWNER TO neondb_owner;

--
-- Name: sys_module_registry; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_module_registry (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    "moduleId" character varying(255) NOT NULL,
    "moduleName" character varying(255) NOT NULL,
    description text,
    version character varying(50) NOT NULL,
    category character varying(100) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "repositoryUrl" character varying(500),
    "documentationUrl" character varying(500),
    "createdAt" timestamp with time zone DEFAULT now(),
    "updatedAt" timestamp with time zone DEFAULT now()
);


ALTER TABLE public.sys_module_registry OWNER TO neondb_owner;

--
-- Name: sys_option; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_option (
    id uuid NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    value character varying(255) NOT NULL,
    tenant_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_option OWNER TO neondb_owner;

--
-- Name: sys_permission; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_permission (
    id uuid NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    tenant_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_permission OWNER TO neondb_owner;

--
-- Name: sys_role; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_role (
    id uuid NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    is_system boolean NOT NULL,
    tenant_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_role OWNER TO neondb_owner;

--
-- Name: sys_role_permission; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_role_permission (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    tenant_id uuid NOT NULL
);


ALTER TABLE public.sys_role_permission OWNER TO neondb_owner;

--
-- Name: sys_tenant; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_tenant (
    id uuid NOT NULL,
    code character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    description character varying(255),
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_tenant OWNER TO neondb_owner;

--
-- Name: sys_user; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_user (
    id uuid NOT NULL,
    username character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    fullname character varying(255) NOT NULL,
    status character varying(255) NOT NULL,
    email character varying(255),
    avatar character varying(255),
    tenant_id uuid NOT NULL,
    "createdAt" timestamp without time zone DEFAULT now() NOT NULL,
    "updatedAt" timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sys_user OWNER TO neondb_owner;

--
-- Name: sys_user_role; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_user_role (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    tenant_id uuid NOT NULL
);


ALTER TABLE public.sys_user_role OWNER TO neondb_owner;

--
-- Name: sys_user_tenant; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sys_user_tenant (
    user_id uuid NOT NULL,
    tenant_id uuid NOT NULL
);


ALTER TABLE public.sys_user_tenant OWNER TO neondb_owner;

--
-- Name: transporters; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.transporters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(50) NOT NULL,
    contact_person character varying(255),
    phone character varying(50),
    email character varying(255),
    website character varying(500),
    service_areas jsonb,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_by uuid
);


ALTER TABLE public.transporters OWNER TO neondb_owner;

--
-- Name: warehouse_configs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.warehouse_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    picking_strategy character varying(50) DEFAULT 'FEFO'::character varying NOT NULL,
    auto_assign_bins boolean DEFAULT true NOT NULL,
    require_batch_tracking boolean DEFAULT false NOT NULL,
    require_expiry_tracking boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warehouse_configs OWNER TO neondb_owner;

--
-- Name: warehouses; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.warehouses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.warehouses OWNER TO neondb_owner;

--
-- Name: workflow_steps; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workflow_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    workflow_id uuid NOT NULL,
    step_key character varying(50) NOT NULL,
    step_name character varying(255) NOT NULL,
    step_order integer NOT NULL,
    is_initial boolean DEFAULT false NOT NULL,
    is_terminal boolean DEFAULT false NOT NULL,
    required_fields jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL
);


ALTER TABLE public.workflow_steps OWNER TO neondb_owner;

--
-- Name: workflows; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.workflows (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    type character varying(50) NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.workflows OWNER TO neondb_owner;

--
-- Name: zones; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.zones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    warehouse_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.zones OWNER TO neondb_owner;

--
-- Data for Name: adjustment_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.adjustment_items (id, adjustment_id, tenant_id, inventory_item_id, old_quantity, new_quantity, quantity_difference, reason_code, notes, created_at) FROM stdin;
774fd2bd-1096-4eb2-8bea-e12ec81af666	459db8a7-ab28-4888-8793-9d4cff6e6056	8e017478-2f5f-4be3-b8b6-e389436ca28a	16ccfb36-6851-4156-ab2e-a15de9028958	0	20	20	found	ketemu	2025-11-19 07:04:50.798284
d0541f5d-516e-4f16-9940-9d0db9992625	459db8a7-ab28-4888-8793-9d4cff6e6056	8e017478-2f5f-4be3-b8b6-e389436ca28a	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	0	10	10	count_error	salah itung	2025-11-19 07:04:50.798284
8fa550d9-5330-4b4b-9199-31a8c32fbbc7	459db8a7-ab28-4888-8793-9d4cff6e6056	8e017478-2f5f-4be3-b8b6-e389436ca28a	536bf8f9-2760-4df7-9d83-42a8859ba046	64	60	-4	missing	ilang	2025-11-19 07:04:50.798284
0287b1d1-2c45-4e75-a970-190c594fa169	d2576d4c-b4c1-4ecf-915d-a10491e70fa4	8e017478-2f5f-4be3-b8b6-e389436ca28a	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	0	20	20	found	nemu	2025-11-19 11:07:56.291096
d4974d4b-990d-4d4b-9afd-3adb9d2f6585	d2576d4c-b4c1-4ecf-915d-a10491e70fa4	8e017478-2f5f-4be3-b8b6-e389436ca28a	dc729873-5d8c-47c1-8e5a-35979188bf5f	81	80	-1	damaged	rusak 1	2025-11-19 11:07:56.291096
ad8358f3-c8b8-4ad5-88ae-ae382f6a4227	86d252f6-039b-46a1-b0a3-442ed8a8d8de	8e017478-2f5f-4be3-b8b6-e389436ca28a	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	20	30	10	count_error	test	2025-11-19 14:27:00.89055
4d55f9cb-f06e-4d4e-b0d4-c52b9302606c	11f14712-9574-43f0-a9c2-8877d7a8900a	8e017478-2f5f-4be3-b8b6-e389436ca28a	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	30	35	5	other	coba	2025-11-19 14:30:32.144368
2942dc10-1bec-49b7-9641-ef79610600b8	e35d0db6-bbbc-493e-a9b1-2f9c00799be6	8e017478-2f5f-4be3-b8b6-e389436ca28a	16ccfb36-6851-4156-ab2e-a15de9028958	0	10	10	STOCK_FOUND	nemu	2025-11-19 15:47:16.460695
\.


--
-- Data for Name: adjustments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.adjustments (id, tenant_id, adjustment_number, status, type, cycle_count_id, notes, created_by, approved_by, applied_at, created_at, updated_at) FROM stdin;
459db8a7-ab28-4888-8793-9d4cff6e6056	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ-2511-WH1-0001	rejected	regular	\N	catetan 2	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 11:05:54.102	2025-11-19 04:37:19.91184	2025-11-19 11:05:54.103
d2576d4c-b4c1-4ecf-915d-a10491e70fa4	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ-2511-WH1-0003	approved	regular	\N	coba	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:18:21.319	2025-11-19 11:07:56.291096	2025-11-19 14:18:21.319
86d252f6-039b-46a1-b0a3-442ed8a8d8de	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ-2511-WH1-0004	approved	regular	\N		4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:27:27.817	2025-11-19 14:27:00.89055	2025-11-19 14:27:27.817
11f14712-9574-43f0-a9c2-8877d7a8900a	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ-2511-WH1-0005	approved	regular	\N	set	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:31:01.854	2025-11-19 14:30:32.144368	2025-11-19 14:31:01.854
e35d0db6-bbbc-493e-a9b1-2f9c00799be6	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ-2511-WH1-0006	created	cycle_count	04a19822-ac4f-4421-b427-55a00d08e96c	Auto-created from cycle count CYCCOUNT-2511-WH1-0002	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	2025-11-19 15:47:16.460695	2025-11-19 15:47:16.460695
\.


--
-- Data for Name: aisles; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.aisles (id, zone_id, tenant_id, name, description, created_at) FROM stdin;
05957666-6e8a-43c6-98f1-2db56373ab30	24905214-b18c-4938-8d25-703bf5bce779	8e017478-2f5f-4be3-b8b6-e389436ca28a	Aisle 01	Main aisle	2025-10-21 10:47:45.2641
\.


--
-- Data for Name: audit_logs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.audit_logs (id, tenant_id, user_id, module, action, resource_type, resource_id, changed_fields, description, previous_state, new_state, batch_id, status, error_message, ip_address, created_at, document_path) FROM stdin;
2e018da5-bd8e-43d3-a9f1-7cd9a003575e	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	update	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"items": {"to": "3 item(s) updated", "from": "previous items"}, "totalAmount": {"to": "3100.00", "from": "2850.00"}}	Updated unapproved purchase order PO-2510-WH-0001	\N	\N	\N	success	\N	139.192.83.232	2025-10-25 12:26:30.625972	\N
50d2c5a1-fd14-43ec-bcbf-a1faf35356f0	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	update	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"items": {"to": "3 item(s) updated", "from": "previous items"}, "expectedDeliveryDate": {"to": "2025-11-08", "from": "2025-11-07"}}	Updated unapproved purchase order PO-2510-WH-0001	\N	\N	\N	success	\N	139.192.83.232	2025-10-25 13:12:30.45261	\N
289ce296-229c-4b98-9f4e-0769000c3ef2	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	update	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"items": {"to": "3 item(s) updated", "from": "previous items"}, "totalAmount": {"to": "3200.00", "from": "3100.00"}}	Updated unapproved purchase order PO-2510-WH-0001	\N	\N	\N	success	\N	139.192.83.232	2025-10-25 13:13:17.901447	\N
6759ba27-8c7b-40ee-8cfc-36ce3d5e5a9c	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	update	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"items": {"to": "3 item(s) updated", "from": "previous items"}, "totalAmount": {"to": "3100.00", "from": "3200.00"}}	Updated unapproved purchase order PO-2510-WH-0001	\N	\N	\N	success	\N	139.192.83.232	2025-10-26 02:48:29.174632	\N
6268f003-a3ed-4de1-a36c-7a6afce27d36	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	{"status": "pending", "itemCount": 2, "supplierId": "929fe31e-3c78-4980-aaec-7b7b85b6f37a", "orderNumber": "PO-2510-WH-0002", "totalAmount": "5500.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "Global Electronics Supply Co.", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "delivery"}	Created purchase order PO-2510-WH-0002 for supplier Global Electronics Supply Co. with 2 item(s)	\N	\N	\N	success	\N	111.95.214.89	2025-10-26 11:17:32.036825	\N
79db0c6d-9fb3-4a2e-991a-d2662955d4ad	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	update	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	{"items": {"to": "2 item(s) updated", "from": "previous items"}, "supplierId": {"to": "1252cb0b-d532-4278-974e-047b5ca4b828", "from": "929fe31e-3c78-4980-aaec-7b7b85b6f37a"}}	Updated unapproved purchase order PO-2510-WH-0002	\N	\N	\N	success	\N	111.95.214.89	2025-10-26 11:18:28.805703	\N
faac2bd4-b5fc-44c0-a4c9-a7653928153f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"status": "pending", "itemCount": 2, "supplierId": "7fe4c8d4-2b25-4ea9-8cf6-b3b37044396d", "orderNumber": "PO-2510-WH-0003", "totalAmount": "2500.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "American Industrial Supplies", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "pickup"}	Created purchase order PO-2510-WH-0003 for supplier American Industrial Supplies with 2 item(s)	\N	\N	\N	success	\N	111.95.214.89	2025-10-26 12:50:02.08042	\N
1a03d0aa-e4f9-47f2-abc0-3bb4632c809a	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	reject	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"status": {"to": "rejected", "from": "pending"}, "workflowState": {"to": "create", "from": "approve"}, "rejectionReason": {"to": "No longer needed"}}	Rejected purchase order PO-2510-WH-0001: No longer needed	pending/approve	rejected/create	\N	success	\N	111.95.214.89	2025-10-27 04:31:37.574144	\N
b1c45c6a-cb0f-4af8-be4e-2d726e30c5e7	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	purchase-order	approve	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	{"status": {"to": "approved", "from": "pending"}, "workflowState": {"to": "receive", "from": "approve"}}	Approved purchase order PO-2510-WH-0002	pending/approve	approved/receive	\N	success	\N	111.95.214.89	2025-10-27 04:32:10.405553	\N
03ad1c54-f10d-44f5-83f5-7c8dda73a03c	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	approve	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"status": {"to": "approved", "from": "pending"}, "workflowState": {"to": "receive", "from": "approve"}}	Approved purchase order PO-2510-WH-0003	pending/approve	approved/receive	\N	success	\N	111.95.214.89	2025-10-27 14:12:47.445267	\N
f956bd27-707e-4661-99ff-2d7082cbe654	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	receive	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	{"status": {"to": "received", "from": "approved"}, "grnNumber": {"to": "GRN-2510-WH1-0004"}, "workflowState": {"to": "putaway", "from": "receive"}}	Received items for purchase order PO-2510-WH-0002. Generated GRN GRN-2510-WH1-0004	approved/receive	received/putaway	\N	success	\N	111.95.214.89	2025-10-28 04:43:04.901002	\N
25f17505-435d-4b35-874d-0370ee50e0f0	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	receive	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"status": {"to": "incomplete", "from": "approved"}, "grnNumber": {"to": "GRN-2510-WH1-0005"}, "workflowState": {"to": "receive", "from": "receive"}}	Received items for purchase order PO-2510-WH-0003. Generated GRN GRN-2510-WH1-0005	approved/receive	incomplete/receive	\N	success	\N	111.95.214.89	2025-10-28 05:53:18.324371	\N
baeb1c1f-bf8c-4075-8de8-c93a410aa0e4	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	putaway_confirm	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	\N	\N	\N	\N	\N	failure	Failed query: insert into "generated_documents" ("id", "tenant_id", "document_type", "document_number", "reference_type", "reference_id", "files", "version", "generated_by", "created_at", "updated_at") values (default, $1, $2, $3, $4, $5, $6, $7, $8, default, default) returning "id", "tenant_id", "document_type", "document_number", "reference_type", "reference_id", "files", "version", "generated_by", "created_at", "updated_at"\nparams: 8e017478-2f5f-4be3-b8b6-e389436ca28a,PUTAWAY,PUTAWAY-2510-WH1-0002,purchase_order,22104b29-d3d1-4131-bb78-76933c076f60,{"html":{"path":"storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/putaway/2025/PUTAWAY-2510-WH1-0002.html","size":6757,"mimeType":"text/html"}},1,4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	111.95.214.89	2025-10-29 06:03:45.613954	\N
5eea1ad0-f48b-4306-b39a-9670c1820a5f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	putaway_confirm	receipt	9b799e3e-889d-45cb-8419-ef423e69c18f	\N	\N	\N	\N	\N	success	\N	111.95.214.89	2025-10-29 13:20:32.138165	\N
4bca884d-adf4-4db8-a6ff-e072bb5e0656	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	d49945db-3965-47a0-887f-00919842d45f	{"status": "pending", "itemCount": 1, "supplierId": "929fe31e-3c78-4980-aaec-7b7b85b6f37a", "orderNumber": "PO-2510-WH-0004", "totalAmount": "250.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "Global Electronics Supply Co.", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "delivery"}	Created purchase order PO-2510-WH-0004 for supplier Global Electronics Supply Co. with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-10-30 01:28:05.510643	\N
3aca07c4-edb0-431f-91c9-ada9dae6ee12	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	61423a15-574d-40b1-8d9c-11c888ecaf8d	{"status": "pending", "itemCount": 1, "supplierId": "1252cb0b-d532-4278-974e-047b5ca4b828", "orderNumber": "PO-2510-WH-0005", "totalAmount": "5000.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "Pacific Wholesale Distribution", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "delivery"}	Created purchase order PO-2510-WH-0005 for supplier Pacific Wholesale Distribution with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-10-30 01:56:44.558899	\N
51d9d134-88bc-473e-b190-4773d23ae6b5	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	8f0d475e-f727-4c8f-a1e9-7ebc3d870ca3	{"status": "pending", "itemCount": 1, "supplierId": "1252cb0b-d532-4278-974e-047b5ca4b828", "orderNumber": "PO-2510-WH-0006", "totalAmount": "8000.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "Pacific Wholesale Distribution", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "delivery"}	Created purchase order PO-2510-WH-0006 for supplier Pacific Wholesale Distribution with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-10-30 02:07:32.125421	\N
792aa57e-ba08-429a-898a-e30cabe9b302	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	create	purchase_order	8a143b8d-7e64-4e1f-b58c-9165a79060bc	{"status": "pending", "itemCount": 1, "supplierId": "1252cb0b-d532-4278-974e-047b5ca4b828", "orderNumber": "PO-2510-WH-0007", "totalAmount": "4000.00", "warehouseId": "1a936892-d57c-491d-a5f9-b0fe1b32d90d", "supplierName": "Pacific Wholesale Distribution", "warehouseName": "Main Warehouse", "workflowState": "approve", "deliveryMethod": "delivery"}	Created purchase order PO-2510-WH-0007 for supplier Pacific Wholesale Distribution with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-10-30 04:25:25.978382	storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0007.html
2a801fd1-db74-4fd4-80dd-1e8f8c21373f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	receive	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"status": {"to": "incomplete", "from": "incomplete"}, "grnNumber": {"to": "GRN-2510-WH1-0006"}, "workflowState": {"to": "receive", "from": "receive"}}	Received items for purchase order PO-2510-WH-0003. Generated GRN GRN-2510-WH1-0006	incomplete/receive	incomplete/receive	\N	success	\N	111.95.214.89	2025-10-30 09:18:52.111755	storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2510-WH1-0006.html
780b9a6e-a33f-4e5b-b12e-e6f4c7f7d43e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	089902ea-9c3d-41ee-a9e6-25520780d2b0	{"status": "created", "itemCount": 1, "customerId": "2c0bbfda-f400-4386-a79f-9b6a15fd3c1f", "orderNumber": "SO-2511-NORTH-0003", "totalAmount": "1000.00", "customerName": "Global Distributors", "workflowState": "create"}	Created sales order SO-2511-NORTH-0003 for customer Global Distributors with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-05 04:25:28.185318	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0003.html
9bd25496-7df1-44b7-b510-2dba8e0d62f2	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	af4d9683-8428-4a9c-a269-f38f2b012202	{"status": "created", "itemCount": 1, "customerId": "b61622e4-9ea7-44de-8598-7e897818c023", "orderNumber": "SO-2511-NORTH-0004", "totalAmount": "3000.00", "customerName": "ABC Electronics Corp", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0004 for customer ABC Electronics Corp with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-05 07:55:46.056595	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0004.html
63b0d3bc-0895-4faa-988e-581e22d2c5a8	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	receive	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"status": {"to": "incomplete", "from": "incomplete"}, "grnNumber": {"to": "GRN-2511-WH1-0001"}, "workflowState": {"to": "receive", "from": "receive"}}	Received items for purchase order PO-2510-WH-0003. Generated GRN GRN-2511-WH1-0001	incomplete/receive	incomplete/receive	\N	success	\N	111.95.214.89	2025-11-06 05:00:53.001674	storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2511-WH1-0001.html
57ea2f18-6079-4af0-ba3c-ea19bc03e6e1	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	089902ea-9c3d-41ee-a9e6-25520780d2b0	\N	Packed sales order SO-2511-NORTH-0003 into 2 package(s). Generated pack document PACK-2511-WH1-0001.	\N	\N	\N	success	\N	111.95.214.89	2025-11-09 02:52:39.408387	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0001.html
2e0d8893-dfb0-45aa-be3b-e6530052646e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	9ef0d521-b587-43bf-9c3e-705fea4f84c0	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0005", "totalAmount": "3500.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0005 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-09 03:36:47.553095	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0005.html
faac1317-73f7-475c-89c2-d809439550e3	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	7d90cf0f-3e76-40a9-a697-cb07862b7855	{"status": "created", "itemCount": 2, "customerId": "b47cb571-8386-4429-b4c8-c784354e3d12", "orderNumber": "SO-2511-NORTH-0006", "totalAmount": "900.00", "customerName": "Tech Solutions Inc", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0006 for customer Tech Solutions Inc with 2 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-09 03:39:57.906861	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0006.html
ee03a828-9c9f-47a9-a086-53c95e74eac9	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0007", "totalAmount": "1850.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0007 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-09 04:28:53.996874	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0007.html
a89b3424-ac34-4623-9dbc-15358c1ed43e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0008", "totalAmount": "2500.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0008 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	180.252.82.26	2025-11-10 06:48:02.671962	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0008.html
79e47b95-da65-4df5-925f-d6fe24881bea	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0008", "workflowState": "pick", "allocatedItems": 3, "allocationNumber": "ALLOC-2511-WH-0002"}	Allocated inventory for sales order SO-2511-NORTH-0008. Generated allocation ALLOC-2511-WH-0002.	\N	\N	\N	success	\N	180.252.82.26	2025-11-10 07:05:14.068091	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0002.html
9e51f6b0-50ae-41aa-a63c-d1650b8b963f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	\N	\N	\N	\N	\N	success	\N	180.252.82.26	2025-11-10 07:07:40.14108	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0002.html
7d0a52a8-ed84-4ff7-bd96-d3fe0c6948db	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	\N	\N	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:07:05.931687	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0011.html
70ddbf7a-cdf2-4a48-bd3e-4f48ff9f4885	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	\N	Packed sales order SO-2511-NORTH-0008 into 2 package(s). Generated pack document PACK-2511-WH1-0002.	\N	\N	\N	success	\N	180.252.82.26	2025-11-10 07:12:01.729761	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0002.html
4e51477c-ca6f-4480-8400-c4abab9a9c55	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	690ebd60-7169-4beb-b53f-c44392bd715e	{"status": "created", "itemCount": 1, "customerId": "2c0bbfda-f400-4386-a79f-9b6a15fd3c1f", "orderNumber": "SO-2511-NORTH-0009", "totalAmount": "5000.00", "customerName": "Global Distributors", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0009 for customer Global Distributors with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-10 08:21:42.293355	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0009.html
be9c13ad-73df-472a-a995-cc7ba4446040	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	690ebd60-7169-4beb-b53f-c44392bd715e	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0009", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0003"}	Allocated inventory for sales order SO-2511-NORTH-0009. Generated allocation ALLOC-2511-WH-0003.	\N	\N	\N	success	\N	111.95.214.89	2025-11-10 08:23:17.433829	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0003.html
6aaf54f6-db2b-4728-88c8-21c1f1017403	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"status": "created", "itemCount": 2, "customerId": "b47cb571-8386-4429-b4c8-c784354e3d12", "orderNumber": "SO-2511-NORTH-0010", "totalAmount": "100.00", "customerName": "Tech Solutions Inc", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0010 for customer Tech Solutions Inc with 2 item(s). Document generated.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 02:14:20.331527	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0010.html
07c80545-0319-484b-bc98-8aa224531dd8	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0010", "workflowState": "pick", "allocatedItems": 2, "allocationNumber": "ALLOC-2511-WH-0004"}	Allocated inventory for sales order SO-2511-NORTH-0010. Generated allocation ALLOC-2511-WH-0004.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 02:18:50.101575	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0004.html
b73aae42-b73a-4e59-8d3d-a3c9b5c5596f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	\N	\N	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 02:19:30.669196	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0003.html
7bba86eb-ad1f-4245-94e2-0e2480e37b2e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	\N	Packed sales order SO-2511-NORTH-0010 into 2 package(s). Generated pack document PACK-2511-WH1-0003.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 02:21:18.133118	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0003.html
82ac7b37-0173-410b-925f-4d520b1287d0	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	\N	Shipped sales order SO-2511-NORTH-0010 with 2 package(s). Generated shipment SHIP-2511-DHL-0007. Inventory deducted.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:07:59.241015	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0007.html
24e29ee3-92bf-41f3-9032-caf3dc2a2658	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0011", "totalAmount": "20.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0011 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:13:00.904621	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0011.html
97b414dd-8278-4684-8979-edd2145b89cd	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0011", "workflowState": "pick", "allocatedItems": 3, "allocationNumber": "ALLOC-2511-WH-0005"}	Allocated inventory for sales order SO-2511-NORTH-0011. Generated allocation ALLOC-2511-WH-0005.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:13:43.093044	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0005.html
80d9d562-f624-43d2-a3dd-30757e829659	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	\N	\N	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:14:36.710673	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0004.html
19800236-adf0-4ba2-aade-2c3204e51bce	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	\N	Packed sales order SO-2511-NORTH-0011 into 1 package(s). Generated pack document PACK-2511-WH1-0004.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:17:58.879912	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0004.html
58c73cf2-a505-4bb8-81fa-857c0100938a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	\N	Shipped sales order SO-2511-NORTH-0011 with 1 package(s). Generated shipment SHIP-2511-DHL-0008. Inventory deducted.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:28:26.093813	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0008.html
34c70446-72a0-4cc6-a715-5afa9fc31bd7	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"status": "created", "itemCount": 2, "customerId": "2c0bbfda-f400-4386-a79f-9b6a15fd3c1f", "orderNumber": "SO-2511-NORTH-0012", "totalAmount": "10.00", "customerName": "Global Distributors", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0012 for customer Global Distributors with 2 item(s). Document generated.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:40:35.63753	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0012.html
45bb7a25-396a-4175-b4f4-e2e636fc50e6	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0012", "workflowState": "pick", "allocatedItems": 2, "allocationNumber": "ALLOC-2511-WH-0006"}	Allocated inventory for sales order SO-2511-NORTH-0012. Generated allocation ALLOC-2511-WH-0006.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:41:59.566273	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0006.html
e7c41e2c-5eb3-4048-b999-0a5230c94dd1	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	\N	\N	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:43:03.599767	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0005.html
809665da-052c-4971-880b-4c9f66ad7372	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	2bd2e9a6-5b28-44b9-819c-7820c661e792	\N	Created cycle count CC-17112025 with 2 items	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 08:41:09.938707	\N
8546b319-64ae-4a56-a124-92d2b01759e6	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	\N	Packed sales order SO-2511-NORTH-0012 into 1 package(s). Generated pack document PACK-2511-WH1-0005.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:45:20.214292	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0005.html
c7f7431a-835b-4c46-b24b-f8e04e29788a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	\N	Shipped sales order SO-2511-NORTH-0012 with 1 package(s). Generated shipment SHIP-2511-DHL-0009. Inventory deducted.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 04:48:08.652724	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0009.html
a0d84680-72b3-4740-bddc-1011559e1efb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0013", "totalAmount": "20.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0013 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 08:33:42.016206	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0013.html
e8af2f26-bf2c-4734-bcf7-b84734ab1049	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0013", "workflowState": "pick", "allocatedItems": 2, "allocationNumber": "ALLOC-2511-WH-0007"}	Allocated inventory for sales order SO-2511-NORTH-0013. Generated allocation ALLOC-2511-WH-0007.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 08:35:48.472367	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0007.html
a13c0787-a49e-4c0f-b618-893be39ac639	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	\N	\N	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 08:36:52.912378	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0006.html
7a77e058-7585-4810-9820-cfe2c32d6cb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	\N	Packed sales order SO-2511-NORTH-0013 into 2 package(s). Generated pack document PACK-2511-WH1-0006.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 08:55:46.987457	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0006.html
2df28c1a-6028-46d0-bc39-9e06056d109d	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	\N	Shipped sales order SO-2511-NORTH-0013 with 2 package(s). Generated shipment SHIP-2511-DHL-0010.	\N	\N	\N	success	\N	180.252.82.26	2025-11-12 08:59:07.034863	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0010.html
33753ce8-6601-4aa0-b55d-51b0dd1dcbb8	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"status": "created", "itemCount": 2, "customerId": "b47cb571-8386-4429-b4c8-c784354e3d12", "orderNumber": "SO-2511-NORTH-0014", "totalAmount": "10.00", "customerName": "Tech Solutions Inc", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0014 for customer Tech Solutions Inc with 2 item(s). Document generated.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 08:39:45.683984	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0014.html
5c845ef6-786c-46b5-b83a-97b0f8245a51	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0014", "workflowState": "pick", "allocatedItems": 2, "allocationNumber": "ALLOC-2511-WH-0008"}	Allocated inventory for sales order SO-2511-NORTH-0014. Generated allocation ALLOC-2511-WH-0008.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 08:40:20.927588	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0008.html
d9d2331a-be27-4c0e-9365-c8a4c6cef270	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	\N	\N	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 08:41:02.613486	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0007.html
50c07a3b-a0f3-4d29-862e-8d13c1f91d2b	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	\N	Packed sales order SO-2511-NORTH-0014 into 1 package(s). Generated pack document PACK-2511-WH1-0007.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 08:47:19.678311	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0007.html
16f6a9b3-3981-47a5-815b-26df65f07088	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	\N	Shipped sales order SO-2511-NORTH-0014 with 1 package(s). Generated shipment SHIP-2511-DHL-0011.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 08:48:54.393994	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0011.html
8f9c8684-a38f-4579-8f65-ec5f2739fdf8	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"status": "created", "itemCount": 2, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0015", "totalAmount": "10.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0015 for customer MegaMart Stores with 2 item(s). Document generated.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:13:57.273061	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0015.html
b3f290da-ad9f-4e35-a576-56ba8a70b0c0	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0015", "workflowState": "pick", "allocatedItems": 2, "allocationNumber": "ALLOC-2511-WH-0009"}	Allocated inventory for sales order SO-2511-NORTH-0015. Generated allocation ALLOC-2511-WH-0009.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:14:38.842729	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0009.html
d00fc98c-fe21-49c0-903c-c1fa2a41ec16	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	\N	\N	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:15:26.768662	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0008.html
a24d520c-9705-4b15-afd7-0b80b0dfb906	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	\N	Packed sales order SO-2511-NORTH-0015 into 1 package(s). Generated pack document PACK-2511-WH1-0008.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:17:17.131021	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0008.html
4a57f704-effb-4f6e-9d36-2e98a1785b40	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	\N	Shipped sales order SO-2511-NORTH-0015 with 1 package(s). Generated shipment SHIP-2511-DHL-0012.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:18:44.955882	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0012.html
81f5afd4-c98c-4b8f-b558-4e93e615d3aa	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	\N	Packed sales order SO-2511-NORTH-0022 into 1 package(s). Generated pack document PACK-2511-WH1-0014.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:59:12.811006	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0014.html
3d08b96a-2153-442e-bd48-d7f4565c7011	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	deliver_complete	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"status": {"to": "delivered", "from": "shipped"}, "recipientName": "Aguz", "workflowState": {"to": "complete", "from": "deliver"}, "deliveryNumber": "DELIVERY-2511-NORTH-0004"}	Confirmed complete delivery DELIVERY-2511-NORTH-0004 for SO SO-2511-NORTH-0015	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:20:08.746905	\N
d484c41e-d401-4538-8108-1b3365a6e202	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"status": "created", "itemCount": 1, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0016", "totalAmount": "5.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0016 for customer MegaMart Stores with 1 item(s). Document generated.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:55:23.679241	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0016.html
fd3357c2-4a9d-4e22-97ab-e763d93900a0	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0016", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0010"}	Allocated inventory for sales order SO-2511-NORTH-0016. Generated allocation ALLOC-2511-WH-0010.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:56:30.604713	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0010.html
4df495d4-19eb-4a6f-94c4-11bafa32f424	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	\N	\N	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 09:57:08.088114	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0009.html
55fb3d5f-2b2a-4031-b3a6-3fca44684a9a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	\N	Packed sales order SO-2511-NORTH-0016 into 1 package(s). Generated pack document PACK-2511-WH1-0009.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 10:00:02.75473	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0009.html
757d24e6-9a90-4170-95c7-d95bcd6adc55	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	\N	Shipped sales order SO-2511-NORTH-0016 with 1 package(s). Generated shipment SHIP-2511-DHL-0013.	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 10:01:35.153835	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0013.html
e8cf6a23-4495-4a0f-a421-d5f827c087f2	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	deliver_complete	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"status": {"to": "delivered", "from": "shipped"}, "recipientName": "Aguss", "workflowState": {"to": "complete", "from": "deliver"}, "deliveryNumber": "DELIVERY-2511-NORTH-0005"}	Confirmed complete delivery DELIVERY-2511-NORTH-0005 for SO SO-2511-NORTH-0016	\N	\N	\N	success	\N	103.125.50.81	2025-11-13 10:02:48.224151	storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0005.html
569824a8-f45b-41ed-a86a-21193730f51b	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"status": "created", "itemCount": 1, "customerId": "2c0bbfda-f400-4386-a79f-9b6a15fd3c1f", "orderNumber": "SO-2511-NORTH-0017", "totalAmount": "15.00", "customerName": "Global Distributors", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0017 for customer Global Distributors with 1 item(s). Document generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:19:38.808407	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0017.html
2b054d43-6c45-49a9-a8ed-d15fd6177265	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0017", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0011"}	Allocated inventory for sales order SO-2511-NORTH-0017. Generated allocation ALLOC-2511-WH-0011.	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:20:20.503362	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0011.html
f0455b99-17ce-4e0c-a627-db8df4975dd8	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	\N	\N	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:21:14.781015	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0010.html
10daee36-2b64-44f3-b944-fd913d0f11ad	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	\N	Packed sales order SO-2511-NORTH-0017 into 1 package(s). Generated pack document PACK-2511-WH1-0010.	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:23:56.02245	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0010.html
4a3a1f88-5fb0-49cf-8b1f-4301855ef443	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	ship_sales_order	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	\N	Shipped sales order SO-2511-NORTH-0017 with 1 package(s). Generated shipment SHIP-2511-DHL-0014.	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:25:20.308065	storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0014.html
34dec26c-fb67-41b1-88f6-bdc88c7c7467	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	deliver_partial	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"status": {"to": "delivered", "from": "shipped"}, "recipientName": "Aguz", "totalRejected": 1, "workflowState": {"to": "complete", "from": "deliver"}, "deliveryNumber": "DELIVERY-2511-NORTH-0006", "returnPONumber": "PO-return-SO-2511-NORTH-0017-13112025"}	Confirmed partial delivery DELIVERY-2511-NORTH-0006 for SO SO-2511-NORTH-0017 with return PO PO-return-SO-2511-NORTH-0017-13112025	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 10:27:11.823233	storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0006.html
957315f3-1706-4eb9-97e8-b7fc3008a50e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	receive	purchase_order	80371d32-8e5f-4d49-bf34-e520f10c2c77	{"status": {"to": "received", "from": "approved"}, "grnNumber": {"to": "GRN-2511-WH1-0002"}, "workflowState": {"to": "putaway", "from": "receive"}}	Received items for purchase order PO-return-SO-2511-NORTH-0017-13112025. Generated GRN GRN-2511-WH1-0002	approved/receive	received/putaway	\N	success	\N	111.95.214.89	2025-11-13 10:31:43.70762	storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2511-WH1-0002.html
2fe96201-92cb-4ed6-acb1-81069409092c	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	purchase-order	putaway_confirm	receipt	0f404c14-2cc6-4ed2-9c27-fe009e2c6957	\N	Putaway confirmed for GRN GRN-2511-WH1-0002. Document PUTAWAY-2511-WH1-0001 generated.	\N	\N	\N	success	\N	111.95.214.89	2025-11-13 11:04:06.072269	storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/putaway/2025/PUTAWAY-2511-WH1-0001.html
96d35926-637a-4ad0-b9e7-1a24a191ec8c	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	{"status": "created", "itemCount": 1, "customerId": "b8746e22-3661-4c44-864f-05d7a2d56b2f", "orderNumber": "SO-2511-NORTH-0018", "totalAmount": "5.00", "customerName": "MegaMart Stores", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0018 for customer MegaMart Stores with 1 item(s). Document generated.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:04:31.255912	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0018.html
b6c42506-6fea-4e1a-8ef8-0e57bb8ac3d0	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"status": "created", "itemCount": 1, "customerId": "b47cb571-8386-4429-b4c8-c784354e3d12", "orderNumber": "SO-2511-NORTH-0019", "totalAmount": "5.00", "customerName": "Tech Solutions Inc", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0019 for customer Tech Solutions Inc with 1 item(s). Document generated.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:05:11.672906	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0019.html
e6932510-12ce-490e-8905-4a67592df953	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0019", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0012"}	Allocated inventory for sales order SO-2511-NORTH-0019. Generated allocation ALLOC-2511-WH-0012.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:06:15.422275	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0012.html
a50da024-b4c5-492c-bb14-8fa6ac933dd4	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0018", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0013"}	Allocated inventory for sales order SO-2511-NORTH-0018. Generated allocation ALLOC-2511-WH-0013.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:06:38.047159	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0013.html
656eb24d-79ed-4f62-8be0-8c9dca381190	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	\N	\N	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:07:28.946003	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0012.html
7a4ad534-cf50-4e35-a9c6-26408cc6f776	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"status": "created", "itemCount": 1, "customerId": "2c0bbfda-f400-4386-a79f-9b6a15fd3c1f", "orderNumber": "SO-2511-NORTH-0020", "totalAmount": "5.00", "customerName": "Global Distributors", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0020 for customer Global Distributors with 1 item(s). Document generated.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:16:27.100982	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0020.html
783777f6-fa69-42a0-8805-b09cfcb989cd	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"status": "created", "itemCount": 1, "customerId": "c27afe7c-e2a9-4525-a4fe-96983a02c9bb", "orderNumber": "SO-2511-NORTH-0021", "totalAmount": "5.00", "customerName": "Retail Plus Ltd", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0021 for customer Retail Plus Ltd with 1 item(s). Document generated.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:17:16.917731	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0021.html
f76ff3f0-302b-4dc7-ac14-3efda9849305	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0021", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0014"}	Allocated inventory for sales order SO-2511-NORTH-0021. Generated allocation ALLOC-2511-WH-0014.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:17:53.792286	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0014.html
1aff32d2-e702-4882-866f-92f5229d96e3	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0020", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0015"}	Allocated inventory for sales order SO-2511-NORTH-0020. Generated allocation ALLOC-2511-WH-0015.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:18:17.904205	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0015.html
75c4fed9-7f21-44de-b81a-ab954319f45e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	\N	\N	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:18:47.163289	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0013.html
3dc927a1-e0ea-4495-a97c-e10268f48220	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	\N	\N	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:20:12.041983	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0014.html
8648f48e-1151-46f9-931b-b3f7e4f41b97	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	\N	Packed sales order SO-2511-NORTH-0019 into 1 package(s). Generated pack document PACK-2511-WH1-0011.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:21:32.423193	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0011.html
1e6f5c1b-caa1-46d3-89e6-881d64040a9b	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	\N	Packed sales order SO-2511-NORTH-0021 into 1 package(s). Generated pack document PACK-2511-WH1-0012.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:28:38.003607	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0012.html
c0ce1f92-30c5-4a62-a65a-e1e0c3494890	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pack_sales_order	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	\N	Packed sales order SO-2511-NORTH-0020 into 1 package(s). Generated pack document PACK-2511-WH1-0013.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:55:59.307028	storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0013.html
081488b3-637b-4fcd-ad97-b5272bf170df	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	create	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"status": "created", "itemCount": 1, "customerId": "b47cb571-8386-4429-b4c8-c784354e3d12", "orderNumber": "SO-2511-NORTH-0022", "totalAmount": "5.00", "customerName": "Tech Solutions Inc", "workflowState": "allocate"}	Created sales order SO-2511-NORTH-0022 for customer Tech Solutions Inc with 1 item(s). Document generated.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:56:52.510016	storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0022.html
8d0bebed-3250-45e1-9851-b8da7ff0d9dd	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	allocate	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"status": "allocated", "orderNumber": "SO-2511-NORTH-0022", "workflowState": "pick", "allocatedItems": 1, "allocationNumber": "ALLOC-2511-WH-0016"}	Allocated inventory for sales order SO-2511-NORTH-0022. Generated allocation ALLOC-2511-WH-0016.	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:57:31.097377	storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0016.html
e1d307f4-3f02-42d3-a995-1f93bd06d48d	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sales-order	pick_sales_order	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	\N	\N	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 02:57:59.245848	storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0015.html
87950c18-d3ff-4ce0-ba5c-b0ed0d70391a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	\N	Started cycle count CC-14112025 with 23 items	\N	\N	\N	success	\N	180.252.93.144	2025-11-14 14:02:02.23155	\N
10401191-a2e7-4787-b5ee-fa8c1b5719b6	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	update	cycle_count	2bd2e9a6-5b28-44b9-819c-7820c661e792	\N	Updated cycle count CC-17112025	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 09:09:02.810196	\N
b60b2b77-be47-4b3d-bf3d-05ecbeca4cf2	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	update	cycle_count	2bd2e9a6-5b28-44b9-819c-7820c661e792	\N	Updated cycle count CC-17112025	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 09:09:27.677149	\N
65f9f548-7cfc-41a3-9502-42031c31687d	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	update	cycle_count	2bd2e9a6-5b28-44b9-819c-7820c661e792	\N	Updated cycle count CC-17112025	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 10:39:03.306778	\N
1c819f3e-9150-4c77-8751-cbf1d271beb6	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	reject	cycle_count	2bd2e9a6-5b28-44b9-819c-7820c661e792	\N	Rejected cycle count CC-17112025	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 13:20:29.573486	\N
b36da8c0-f3d4-446b-91cf-6dd5ff31b0ab	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	30f38e6d-8dd8-4dd8-bada-368284711ea3	\N	Created cycle count CC-17112025-17112026 with 2 items	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 13:21:42.17669	\N
594b15c8-713f-4a96-8baf-6e6429a38200	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	5ec0c232-652f-47a8-af09-8c75ac921a02	\N	Created cycle count CC-17112025-17112027 with 2 items	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 13:22:39.659793	\N
8d673ca6-77b7-4f23-bd48-c0c12dd4c001	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	08a4a105-3044-4daf-ac8e-ade6f0d3320f	\N	Created cycle count CC-202511-0001 with 2 items	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 14:04:10.344346	\N
bf3b0d44-b4b1-4874-b25f-21e0ede99986	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	approve	cycle_count	30f38e6d-8dd8-4dd8-bada-368284711ea3	\N	Approved cycle count CC-17112025-17112026	\N	\N	\N	success	\N	180.252.85.36	2025-11-17 14:04:31.562098	\N
f7d61271-f4e2-495a-ae5e-a891db782cb7	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	0cb825c9-bb0c-4e8f-98a9-c9ab02507307	\N	Created cycle count CC-202511-0002 with 2 items	\N	\N	\N	success	\N	180.252.92.226	2025-11-18 06:56:18.168217	\N
e07d8d3f-cbba-45c8-9052-480deed31ff3	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	780351ec-db98-43e1-aa6c-22a4cb79a54f	\N	Created cycle count CYCCOUNT-2511-WH1-0001 with 1 items	\N	\N	\N	success	\N	180.252.92.226	2025-11-18 10:46:34.257861	\N
29cc148e-a73a-41cb-8555-141becbb9b11	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	adjustment.create	adjustment	459db8a7-ab28-4888-8793-9d4cff6e6056	\N	Created adjustment STOCKADJ-2511-WH1-0001	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 04:37:24.657502	\N
a49e46ad-68b3-45d2-96b8-5af2dcf43617	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	adjustment.create	adjustment	a79a7e3b-a926-4478-9f97-b5822241071f	\N	Created adjustment STOCKADJ-2511-WH1-0002	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 04:41:14.534709	\N
295da4eb-75ca-4b78-a1f1-34f0c7f655ff	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	adjustment.delete	adjustment	a79a7e3b-a926-4478-9f97-b5822241071f	\N	Deleted adjustment STOCKADJ-2511-WH1-0002	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 04:41:35.559833	\N
295f2e30-c22c-44a5-a79d-4e8010294038	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	update	adjustment	459db8a7-ab28-4888-8793-9d4cff6e6056	\N	Updated adjustment STOCKADJ-2511-WH1-0001	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 07:04:53.814528	\N
3e70b4be-ca8c-4336-8edd-492943da0438	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	reject	adjustment	459db8a7-ab28-4888-8793-9d4cff6e6056	\N	Rejected adjustment STOCKADJ-2511-WH1-0001	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 11:05:54.897752	\N
611d9b62-dbf2-4f18-8be0-4dd54c82fb6f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	adjustment	d2576d4c-b4c1-4ecf-915d-a10491e70fa4	\N	Created adjustment STOCKADJ-2511-WH1-0003	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 11:07:58.35521	\N
b0f0c94a-6e62-4483-b9f5-6f060a916059	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	approve	adjustment	d2576d4c-b4c1-4ecf-915d-a10491e70fa4	\N	Approved adjustment STOCKADJ-2511-WH1-0003	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 14:18:22.594105	\N
dad74a35-6902-4fc4-956d-ade3b5fab9d9	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	adjustment	86d252f6-039b-46a1-b0a3-442ed8a8d8de	\N	Created adjustment STOCKADJ-2511-WH1-0004	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 14:27:02.50784	\N
d9c19980-5a03-4204-aaa7-3e32b1e34373	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	approve	adjustment	86d252f6-039b-46a1-b0a3-442ed8a8d8de	\N	Approved adjustment STOCKADJ-2511-WH1-0004	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 14:27:29.084185	\N
d7c21c24-4810-4afc-a27b-a0db059e6382	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	adjustment	11f14712-9574-43f0-a9c2-8877d7a8900a	\N	Created adjustment STOCKADJ-2511-WH1-0005	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 14:30:33.748173	\N
b5e6ff15-9bb3-4a5e-8597-4f066921f194	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	approve	adjustment	11f14712-9574-43f0-a9c2-8877d7a8900a	\N	Approved adjustment STOCKADJ-2511-WH1-0005	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 14:31:03.178298	storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0005.html
672a2c13-d510-4ece-9ed7-a76d1c9c53e6	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	cycle_count	04a19822-ac4f-4421-b427-55a00d08e96c	\N	Created cycle count CYCCOUNT-2511-WH1-0002 with 2 items	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 15:46:43.348644	\N
9ad3674c-d4e9-45d5-9453-c942c195f42f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	approve	cycle_count	04a19822-ac4f-4421-b427-55a00d08e96c	{"adjustmentNumber": "STOCKADJ-2511-WH1-0006", "adjustmentCreated": true, "itemsWithVariance": 1}	Approved cycle count CYCCOUNT-2511-WH1-0002	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 15:47:23.885561	storage/inventory/cycle-count/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/CYCCOUNT-2511-WH1-0002.html
eab90519-588e-4fcd-a79a-b31cab57f861	8e017478-2f5f-4be3-b8b6-e389436ca28a	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	inventory-items	create	adjustment	e35d0db6-bbbc-493e-a9b1-2f9c00799be6	{"itemsCount": 1, "sourceType": "cycle_count", "sourceCycleCount": "CYCCOUNT-2511-WH1-0002"}	Auto-created adjustment STOCKADJ-2511-WH1-0006 from cycle count CYCCOUNT-2511-WH1-0002	\N	\N	\N	success	\N	180.252.92.226	2025-11-19 15:47:24.360401	storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0006.html
\.


--
-- Data for Name: bins; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.bins (id, shelf_id, tenant_id, name, barcode, max_weight, max_volume, fixed_sku, category, required_temperature, accessibility_score, created_at, current_weight, current_volume) FROM stdin;
fa169f29-c1cc-48fc-9c71-c41712b3a498	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-01	BIN-A01-L1-001	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
9396e377-215e-4bb5-9942-089a93855011	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-02	BIN-A01-L1-002	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
2003cb26-5a23-4db2-a061-412d9d6ee258	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-03	BIN-A01-L1-003	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
ae9fbd03-58bd-4599-bd7b-57300a67247a	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-04	BIN-A01-L1-004	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
aac222bc-5159-4eb2-b1c1-525d3304bc53	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-05	BIN-A01-L1-005	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
220520fd-0b86-407b-9521-63f342c47885	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-06	BIN-A01-L1-006	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
844dbca1-a1cf-424b-b8de-1715689d4de0	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-07	BIN-A01-L1-007	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
12548e32-edd5-49b8-a757-80c6c4196cee	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-08	BIN-A01-L1-008	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
65d68866-6b17-4b3e-8756-52a8c0cad38e	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-09	BIN-A01-L1-009	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
a8c27a92-91c9-4dda-af12-b19a07133b23	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-10	BIN-A01-L1-010	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
df65c0f4-2b6b-4381-bc59-c2e7c98b8962	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-11	BIN-A01-L1-011	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
d23d96e6-7346-4363-9b25-16655df1766d	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-12	BIN-A01-L1-012	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
6480201e-c617-4fce-a6ed-b4ea05c718f0	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-13	BIN-A01-L1-013	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
de79eb10-fb8d-4c5c-8a54-0fa57cfa85b1	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-14	BIN-A01-L1-014	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
dcec4544-efd0-422f-b368-9ba6acaf1e5c	44f8b721-9d36-49c7-ae98-9a9e05cab684	8e017478-2f5f-4be3-b8b6-e389436ca28a	BIN-15	BIN-A01-L1-015	\N	\N	\N	\N	\N	50	2025-10-21 10:47:45.2641	0.000	0.000
\.


--
-- Data for Name: customer_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customer_locations (id, customer_id, tenant_id, location_type, address, city, state, postal_code, country, latitude, longitude, contact_person, phone, email, is_active, created_at) FROM stdin;
feee4b0b-2fef-493f-ac5b-b2be91fa1ba7	b61622e4-9ea7-44de-8598-7e897818c023	8e017478-2f5f-4be3-b8b6-e389436ca28a	BILLING	456 Commerce St	New York	NY	10001	USA	40.712800	-74.006000	John Smith	+1-555-0101	john@abcelectronics.com	t	2025-10-21 11:52:11.384673
fbd94a06-158a-4d19-8f0b-3f3e4bf0fd96	c27afe7c-e2a9-4525-a4fe-96983a02c9bb	8e017478-2f5f-4be3-b8b6-e389436ca28a	BILLING	789 Market Ave	Los Angeles	CA	90001	USA	34.052200	-118.243700	Sarah Johnson	+1-555-0202	sarah@retailplus.com	t	2025-10-21 11:52:11.384673
f4e9f365-6ec1-4e61-b013-87fd733fd856	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	123 Trade Blvd, Suite 500	Chicago	IL	60601	USA	41.878100	-87.629800	Mike Chen	+1-555-0303	mike@globaldist.com	t	2025-11-02 08:09:40.301196
db91c31b-ea68-426d-a934-6d3784826aec	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	555 Warehouse Dr	Chicago	IL	60607	USA	41.869700	-87.656300	David Lee	+1-555-0333	warehouse@globaldist.com	t	2025-11-02 08:09:40.301196
9aca801e-b684-4866-a649-bffe241c1629	b8746e22-3661-4c44-864f-05d7a2d56b2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	567 Shopping Plaza, HQ Building	Miami	FL	33101	USA	25.761700	-80.191800	Robert Wilson	+1-555-0505	robert@megamart.com	t	2025-11-02 08:17:13.01771
e8c25b5f-47a6-4099-94b4-afedb14daa73	b8746e22-3661-4c44-864f-05d7a2d56b2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	2100 Northwest 42nd Ave	Miami	FL	33142	USA	25.812300	-80.237800	Carlos Rivera	+1-555-0555	warehouse.miami@megamart.com	t	2025-11-02 08:17:13.01771
1664543f-493f-4d26-8a22-413063818a8d	b8746e22-3661-4c44-864f-05d7a2d56b2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	850 East Palm Ave	Tampa	FL	33605	USA	27.950600	-82.457200	Jennifer Adams	+1-555-0565	warehouse.tampa@megamart.com	t	2025-11-02 08:17:13.01771
40f761b6-e503-4f1b-b99a-b8643f5c2b4a	b47cb571-8386-4429-b4c8-c784354e3d12	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	321 Innovation Dr	Austin	TX	78701	USA	30.267200	-97.743100	Emily Davis	+1-555-0404	emily@techsol.com	t	2025-11-02 08:17:52.20158
b83c4019-9e33-4dc2-aff3-905e6a56785c	b47cb571-8386-4429-b4c8-c784354e3d12	8e017478-2f5f-4be3-b8b6-e389436ca28a	shipping	800 Distribution Pkwy	Austin	TX	78728	USA	30.438300	-97.683600	Robert Martinez	+1-555-0444	shipping@techsol.com	t	2025-11-02 08:17:52.20158
\.


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.customers (id, tenant_id, name, contact_person, email, phone, tax_id, created_at, updated_at) FROM stdin;
b61622e4-9ea7-44de-8598-7e897818c023	8e017478-2f5f-4be3-b8b6-e389436ca28a	ABC Electronics Corp	John Smith	john@abcelectronics.com	+1-555-0101	TAX-123456	2025-10-21 11:15:18.226911	2025-10-21 11:15:18.226911
c27afe7c-e2a9-4525-a4fe-96983a02c9bb	8e017478-2f5f-4be3-b8b6-e389436ca28a	Retail Plus Ltd	Sarah Johnson	sarah@retailplus.com	+1-555-0202	TAX-234567	2025-10-21 11:15:18.226911	2025-10-21 11:15:18.226911
2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	8e017478-2f5f-4be3-b8b6-e389436ca28a	Global Distributors	Mike Chen	mike@globaldist.com	+1-555-0303	TAX-345678	2025-10-21 11:15:18.226911	2025-11-02 08:09:39.254
b8746e22-3661-4c44-864f-05d7a2d56b2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	MegaMart Stores	Robert Wilson	robert@megamart.com	+1-555-0505	TAX-567890	2025-10-21 11:15:18.226911	2025-11-02 08:17:11.959
b47cb571-8386-4429-b4c8-c784354e3d12	8e017478-2f5f-4be3-b8b6-e389436ca28a	Tech Solutions Inc	Emily Davis	emily@techsol.com	+1-555-0404	TAX-456789	2025-10-21 11:15:18.226911	2025-11-02 08:17:51.131
\.


--
-- Data for Name: cycle_count_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cycle_count_items (id, cycle_count_id, tenant_id, product_id, bin_id, system_quantity, counted_quantity, variance_quantity, variance_amount, reason_code, reason_description, counted_by, counted_at, created_at) FROM stdin;
223dda71-54f0-4c97-8547-cdaaa7612e8b	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	fa169f29-c1cc-48fc-9c71-c41712b3a498	16	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
8864e25a-d24f-423c-8724-b1a36237836e	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	9396e377-215e-4bb5-9942-089a93855011	52	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
0f1f32c9-cd39-4268-a663-b2159e9640cd	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	2003cb26-5a23-4db2-a061-412d9d6ee258	89	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
535fc167-ffaa-4ef2-abc9-4a27d35cf4a0	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	ae9fbd03-58bd-4599-bd7b-57300a67247a	83	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
01be4255-47a4-4fd9-ae8c-63ca63fc3c6d	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	aac222bc-5159-4eb2-b1c1-525d3304bc53	110	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
e2e9cebc-3928-4dfd-b553-8144c6bacba5	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	220520fd-0b86-407b-9521-63f342c47885	13	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
2f72f690-f929-40c3-83bd-4aeee6e99766	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	12548e32-edd5-49b8-a757-80c6c4196cee	67	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
46a5c3b9-0abb-44b6-afec-da3b56592e61	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	65d68866-6b17-4b3e-8756-52a8c0cad38e	39	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
0e26d5cd-12c3-4939-ac89-f10243520e9b	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	a8c27a92-91c9-4dda-af12-b19a07133b23	99	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
475e3b5b-af9f-4a57-b170-5a7b52fd3364	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	d23d96e6-7346-4363-9b25-16655df1766d	95	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
e2cfa12b-63a8-4109-b824-8de00f659ccb	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	aac222bc-5159-4eb2-b1c1-525d3304bc53	64	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
ce714943-c880-40b7-a0fe-406ff924e1f0	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4c03131a-ffe3-40fd-9ac8-c26189aa94a6	fa169f29-c1cc-48fc-9c71-c41712b3a498	50	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
0b245527-bdb9-4958-8966-b5ab32b789f2	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	fa169f29-c1cc-48fc-9c71-c41712b3a498	1	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
34e8f6a3-ad32-41a8-820d-61c98c88d8ea	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	f7e708fe-ca3a-41d1-954b-cad17ae4b534	fa169f29-c1cc-48fc-9c71-c41712b3a498	20	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
ebd4cfc3-1bea-405d-b690-6e52e5fcaf64	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	df65c0f4-2b6b-4381-bc59-c2e7c98b8962	-1	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
d352464f-6ab1-4493-8a99-8683d804ca2b	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2003cb26-5a23-4db2-a061-412d9d6ee258	0	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
7bce7d81-0908-4c29-a589-dbd6e44c5f2c	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	844dbca1-a1cf-424b-b8de-1715689d4de0	0	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
4f93d36d-64b9-43d0-98f3-167906a0d023	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	de79eb10-fb8d-4c5c-8a54-0fa57cfa85b1	0	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
877d28d0-94a3-4587-81f4-8cd8181ba4a0	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	fa169f29-c1cc-48fc-9c71-c41712b3a498	0	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
ee765056-99d0-45e0-bcdd-2cc7eda50b0e	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	dcec4544-efd0-422f-b368-9ba6acaf1e5c	31	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
3c030085-bbad-4aee-ada1-9552d85eda87	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	9396e377-215e-4bb5-9942-089a93855011	0	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
9a5c7ff6-91dd-48e6-9dec-3402ede7450d	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	6480201e-c617-4fce-a6ed-b4ea05c718f0	-3	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
1e140e3d-3360-4bbb-bcfe-208d9efb07b1	ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	ae9fbd03-58bd-4599-bd7b-57300a67247a	81	\N	\N	\N	\N	\N	\N	\N	2025-11-14 14:02:00.724906
b44e611f-9808-4e72-8d7b-81948eaed488	2bd2e9a6-5b28-44b9-819c-7820c661e792	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	9396e377-215e-4bb5-9942-089a93855011	52	52	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 10:39:01.455	2025-11-17 08:41:08.488554
d31e031c-3902-4e9a-84b6-58a8ee37f1f7	2bd2e9a6-5b28-44b9-819c-7820c661e792	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	9396e377-215e-4bb5-9942-089a93855011	0	0	0	\N	found	keselip	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 10:39:02.449	2025-11-17 08:41:08.488554
a1138af9-acd9-4e23-8c3a-bd47cc0fc9f0	30f38e6d-8dd8-4dd8-bada-368284711ea3	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2003cb26-5a23-4db2-a061-412d9d6ee258	0	0	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 13:21:41.303	2025-11-17 13:21:40.679531
c0dbf3b4-a938-44a0-8b24-1420d9fe0882	30f38e6d-8dd8-4dd8-bada-368284711ea3	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	2003cb26-5a23-4db2-a061-412d9d6ee258	89	89	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 13:21:41.303	2025-11-17 13:21:40.679531
cd91e499-1c2a-4e74-90b9-d4e1dda75112	5ec0c232-652f-47a8-af09-8c75ac921a02	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	ae9fbd03-58bd-4599-bd7b-57300a67247a	81	81	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 13:22:38.829	2025-11-17 13:22:38.233523
d3630f12-22c4-42e8-9ed0-b8f077d05b81	5ec0c232-652f-47a8-af09-8c75ac921a02	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	ae9fbd03-58bd-4599-bd7b-57300a67247a	83	83	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 13:22:38.829	2025-11-17 13:22:38.233523
4f98039b-79ee-47ed-a949-5c82f1e860af	08a4a105-3044-4daf-ac8e-ade6f0d3320f	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	aac222bc-5159-4eb2-b1c1-525d3304bc53	64	64	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 14:04:09.509	2025-11-17 14:04:08.910006
bebf18e2-91a2-4484-9392-777e1d1ddcaf	08a4a105-3044-4daf-ac8e-ade6f0d3320f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	aac222bc-5159-4eb2-b1c1-525d3304bc53	110	110	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 14:04:09.509	2025-11-17 14:04:08.910006
e647d877-e0e1-4190-a0ba-466505ca8330	0cb825c9-bb0c-4e8f-98a9-c9ab02507307	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2003cb26-5a23-4db2-a061-412d9d6ee258	0	10	10	\N	found	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-18 06:56:17.332	2025-11-18 06:56:16.730279
c4337dad-348d-4e8a-bf49-7641b4358105	0cb825c9-bb0c-4e8f-98a9-c9ab02507307	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	2003cb26-5a23-4db2-a061-412d9d6ee258	89	89	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-18 06:56:17.332	2025-11-18 06:56:16.730279
5a4fcef1-7335-4f5f-a3ba-84608e11c28d	780351ec-db98-43e1-aa6c-22a4cb79a54f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	220520fd-0b86-407b-9521-63f342c47885	13	13	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-18 10:46:33.383	2025-11-18 10:46:32.753489
4027664c-bd8e-468d-8f7c-2051198df9b1	04a19822-ac4f-4421-b427-55a00d08e96c	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	9396e377-215e-4bb5-9942-089a93855011	0	10	10	\N	found	nemu	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:46:42.546	2025-11-19 15:46:41.958025
687cc9fb-a578-456b-969b-7c70d45b6499	04a19822-ac4f-4421-b427-55a00d08e96c	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2003cb26-5a23-4db2-a061-412d9d6ee258	35	35	0	\N	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:46:42.546	2025-11-19 15:46:41.958025
\.


--
-- Data for Name: cycle_counts; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.cycle_counts (id, tenant_id, count_number, status, count_type, scheduled_date, completed_date, variance_threshold, total_variance_amount, notes, created_by, approved_by, created_at, updated_at) FROM stdin;
ff2dc1df-d6f6-4b93-ba64-d38d5a042deb	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-14112025	created	partial	2025-11-14	\N	0.00	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-14 14:02:00.724906	2025-11-14 14:02:00.724906
2bd2e9a6-5b28-44b9-819c-7820c661e792	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-17112025	rejected	partial	2025-11-17	2025-11-17	0.00	\N	catatan	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-17 08:41:08.488554	2025-11-17 13:20:28.953
5ec0c232-652f-47a8-af09-8c75ac921a02	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-17112025-17112027	created	partial	2025-11-17	\N	0.00	\N	bin 04	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-17 13:22:38.233523	2025-11-17 13:22:38.233523
08a4a105-3044-4daf-ac8e-ade6f0d3320f	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-202511-0001	created	partial	2025-11-17	\N	0.00	\N	bin 5	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-17 14:04:08.910006	2025-11-17 14:04:08.910006
30f38e6d-8dd8-4dd8-bada-368284711ea3	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-17112025-17112026	approved	partial	2025-11-17	2025-11-17	0.00	\N	bin 3	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-17 13:21:40.679531	2025-11-17 14:04:30.964
0cb825c9-bb0c-4e8f-98a9-c9ab02507307	8e017478-2f5f-4be3-b8b6-e389436ca28a	CC-202511-0002	created	partial	2025-11-18	\N	0.00	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-18 06:56:16.730279	2025-11-18 06:56:16.730279
780351ec-db98-43e1-aa6c-22a4cb79a54f	8e017478-2f5f-4be3-b8b6-e389436ca28a	CYCCOUNT-2511-WH1-0001	created	partial	2025-11-18	\N	0.00	\N	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-18 10:46:32.753489	2025-11-18 10:46:32.753489
04a19822-ac4f-4421-b427-55a00d08e96c	8e017478-2f5f-4be3-b8b6-e389436ca28a	CYCCOUNT-2511-WH1-0002	approved	partial	2025-11-19	2025-11-19	0.00	\N	test	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:46:41.958025	2025-11-19 15:47:17.955
\.


--
-- Data for Name: deliveries; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.deliveries (id, tenant_id, shipment_id, sales_order_id, status, delivery_date, recipient_name, notes, return_purchase_order_id, delivered_by, created_at, updated_at) FROM stdin;
09558b13-2c3b-4649-a9f4-3667d33af3f1	8e017478-2f5f-4be3-b8b6-e389436ca28a	378ff23f-3084-47c2-9f8d-301012502049	4db87969-8444-49ea-af53-7f7f80fcd8b9	complete	2025-11-13 07:44:56.871	Agus	oke lengkap	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 07:44:56.240135	2025-11-13 07:44:56.240135
29ba2a69-d304-417a-8647-c47eeb36dcb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	dae70b8b-b5b6-45a9-baff-f8e7883d0a2f	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	complete	2025-11-13 08:10:08.254	Agus S	aman, lengkap	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:10:07.628104	2025-11-13 08:10:07.628104
e5982008-7056-4b85-a084-3de2b65b2733	8e017478-2f5f-4be3-b8b6-e389436ca28a	2651a23c-b1a8-4601-b09e-c78982d72ff6	1f65dc4e-93ca-476c-8254-c8cd25cc574e	complete	2025-11-13 08:50:01.406	Aguss	paket aman	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:50:00.726909	2025-11-13 08:50:00.726909
15770493-603d-4fac-aed4-410c7a490bf5	8e017478-2f5f-4be3-b8b6-e389436ca28a	342f6ef4-2719-48f1-bfad-6825deed9284	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	complete	2025-11-13 09:20:01.281	Aguz	ok	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:20:00.704513	2025-11-13 09:20:00.704513
07266b7d-eb41-4434-a1c4-bb911ce4ea7e	8e017478-2f5f-4be3-b8b6-e389436ca28a	57939ebe-dedc-40d8-8949-755eff5345ce	efb53562-d2e9-49a7-8ca8-364c8c760457	complete	2025-11-13 10:02:41.191	Aguss	ok	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:02:40.582626	2025-11-13 10:02:40.582626
c8f43726-801e-437b-a69a-138bc464a0da	8e017478-2f5f-4be3-b8b6-e389436ca28a	cb39e6ba-d84a-40f4-9610-5f5d9dd61f52	76a1aa22-f63c-48f1-9d91-2edb698d6742	partial	2025-11-13 10:27:03.638	Aguz	dari 3 barang, 1 nya rusak mau dikembalikan	80371d32-8e5f-4d49-bf34-e520f10c2c77	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:27:00.74856	2025-11-13 10:27:00.74856
\.


--
-- Data for Name: delivery_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.delivery_items (id, delivery_id, tenant_id, sales_order_item_id, product_id, shipped_quantity, accepted_quantity, rejected_quantity, rejection_notes, created_at) FROM stdin;
2b25bd64-9479-4260-935c-f37b60ffb807	09558b13-2c3b-4649-a9f4-3667d33af3f1	8e017478-2f5f-4be3-b8b6-e389436ca28a	3821f93e-f28c-4d10-940f-101bf71a273f	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	0.000	\N	2025-11-13 07:44:56.240135
8b7e7653-6024-410d-af4f-fd37e0b18aed	09558b13-2c3b-4649-a9f4-3667d33af3f1	8e017478-2f5f-4be3-b8b6-e389436ca28a	5fe3f1b9-68ec-4725-a159-e9757a9aa636	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 07:44:56.240135
59799149-ede4-42c6-b5c6-1ed5eed4836c	29ba2a69-d304-417a-8647-c47eeb36dcb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 08:10:07.628104
f5353a51-0ba4-48c1-af6e-ec798b15b1ca	29ba2a69-d304-417a-8647-c47eeb36dcb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 08:10:07.628104
43ac9ca9-e44d-48cf-8318-b95e9a6534f1	29ba2a69-d304-417a-8647-c47eeb36dcb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	0.000	\N	2025-11-13 08:10:07.628104
9eebf05b-5534-4845-ae76-917c7a58ebe4	29ba2a69-d304-417a-8647-c47eeb36dcb4	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	0.000	\N	2025-11-13 08:10:07.628104
7480f119-6928-4d4f-8257-9714c86a928f	e5982008-7056-4b85-a084-3de2b65b2733	8e017478-2f5f-4be3-b8b6-e389436ca28a	55b46f69-1aa1-4241-bfa6-17de98965aaa	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	0.000	\N	2025-11-13 08:50:00.726909
0c2f82c5-6149-498a-8fd3-bbc886a27aeb	e5982008-7056-4b85-a084-3de2b65b2733	8e017478-2f5f-4be3-b8b6-e389436ca28a	c24461d7-bad1-4ccd-a726-7f596d81490c	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 08:50:00.726909
ce3e495f-9eaa-4f71-9843-21cbe99ba2f0	15770493-603d-4fac-aed4-410c7a490bf5	8e017478-2f5f-4be3-b8b6-e389436ca28a	dc5982bf-8262-4978-9fef-2f1fbfbd8944	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	0.000	\N	2025-11-13 09:20:00.704513
67f1f2b2-4450-4311-a79b-c23a1f768ce8	15770493-603d-4fac-aed4-410c7a490bf5	8e017478-2f5f-4be3-b8b6-e389436ca28a	10e63015-88f4-4144-9420-a74ef29016e8	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 09:20:00.704513
98cc8643-19c9-4fe2-9330-4491d4b3f6b8	07266b7d-eb41-4434-a1c4-bb911ce4ea7e	8e017478-2f5f-4be3-b8b6-e389436ca28a	0ebd39cb-c1f5-49ac-9bee-8e034b118b20	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	0.000	\N	2025-11-13 10:02:40.582626
02bf06bc-7473-4344-b2bf-948f55cf7b22	c8f43726-801e-437b-a69a-138bc464a0da	8e017478-2f5f-4be3-b8b6-e389436ca28a	93d54581-ca0a-4e5f-ab51-f5bd71d116e8	4ff81248-f3b0-450d-a0f5-d666d7256399	3.000	2.000	1.000	1  rusak	2025-11-13 10:27:00.74856
\.


--
-- Data for Name: demo_department; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.demo_department (id, name, "group", date, in_time, out_time, tenant_id, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: document_number_config; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_number_config (id, tenant_id, document_type, document_name, description, period_format, prefix1_label, prefix1_default_value, prefix1_required, prefix2_label, prefix2_default_value, prefix2_required, sequence_length, sequence_padding, separator, is_active, created_at, updated_at) FROM stdin;
d36b12a4-25e8-4349-bed4-011b7f704e4b	8e017478-2f5f-4be3-b8b6-e389436ca28a	GRN	Goods Receipt Note	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
2e368a6a-d142-434b-ba8b-7bb1932306ab	8e017478-2f5f-4be3-b8b6-e389436ca28a	PUTAWAY	Putaway Instructions	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO	Sales Order	\N	YYMM	Region	NORTH	f	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
15a099f7-ddb0-46cd-bee8-6e542bca8da6	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	Pick Instructions	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
44a21ce8-84d4-445b-a61e-f9e68c182d14	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	Pack Instructions	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
de356e8a-d75f-489f-834c-389632f0f55a	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	Ship Instructions	\N	YYMM	Carrier	DHL	f	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
6f7b7754-b4f6-4edb-81d3-114492b968c9	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	Delivery Note	\N	YYMM	Region	NORTH	f	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
4e629930-6799-40dc-aff3-ecb8be1eacb8	8e017478-2f5f-4be3-b8b6-e389436ca28a	STOCKADJ	Stock Adjustment	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
cf40b229-f880-4a66-a974-ad5882a8890c	8e017478-2f5f-4be3-b8b6-e389436ca28a	RELOC	Stock Relocation	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
ea647719-d032-42ac-852c-a73c460a4ad1	8e017478-2f5f-4be3-b8b6-e389436ca28a	CYCCOUNT	Cycle Count/Audit	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
0b8ce52a-46ce-465f-a124-0df606da785b	8e017478-2f5f-4be3-b8b6-e389436ca28a	RMA	Return Merchandise Authorization	\N	YYMM	Reason	DEF	f	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
06f139be-795e-472a-bac4-afa1056066a1	8e017478-2f5f-4be3-b8b6-e389436ca28a	TRANSFER	Transfer Order	\N	YYMM	From	WH1	t	To	WH2	t	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
4a2f66f9-f7f2-44dd-bb72-4591c82b31d0	8e017478-2f5f-4be3-b8b6-e389436ca28a	QC	Quality Control/Inspection	\N	YYMM	Warehouse	WH1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
beade3cc-5c10-4f73-820d-682ae734492a	8e017478-2f5f-4be3-b8b6-e389436ca28a	LOAD	Loading List	\N	YYMM	Dock	D1	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-21 11:38:23.628643
c682323b-f280-4cc6-bf75-b95c48862d86	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO	Purchase Order	\N	YYMM	Warehouse	WH	t	\N	\N	f	4	0	-	t	2025-10-21 11:38:23.628643	2025-10-22 04:17:51.772
87963ae6-083d-4656-a0e9-94535fc88401	8e017478-2f5f-4be3-b8b6-e389436ca28a	ALLOC	Allocate SO	\N	YYMM	Warehouse	WH	f	\N	\N	f	4	0	-	t	2025-11-07 00:21:48.787666	2025-11-07 00:21:48.787666
\.


--
-- Data for Name: document_number_history; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_number_history (id, tenant_id, config_id, tracker_id, document_type, generated_number, period, prefix1, prefix2, sequence_number, document_id, document_table_name, generated_by, generated_at, is_voided, voided_at, voided_by, void_reason, created_at, updated_at) FROM stdin;
d8fa2a32-1d3e-4502-89ea-f6f4787529db	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0007	2510	WH	\N	7	8a143b8d-7e64-4e1f-b58c-9165a79060bc	purchase_orders	\N	2025-10-30 04:25:17.313638	f	\N	\N	\N	2025-10-30 04:25:17.313638	2025-10-30 04:25:22.994
16c43fdc-53dc-49fa-9b9b-05af2ca1ed6b	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0006	2510	WH1	\N	6	\N	\N	\N	2025-10-30 09:18:45.730099	f	\N	\N	\N	2025-10-30 09:18:45.730099	2025-10-30 09:18:45.730099
c11ff0f8-36d5-4faf-88b3-0067f3942014	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0002	2510	WH	\N	2	22104b29-d3d1-4131-bb78-76933c076f60	purchase_orders	\N	2025-10-26 11:17:25.832954	f	\N	\N	\N	2025-10-26 11:17:25.832954	2025-10-26 11:17:29.331
bb4538fa-3fcf-44c2-9ad6-e434b655e649	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0003	2510	WH	\N	3	3189b935-c1c6-45b3-b13c-c17912e12a92	purchase_orders	\N	2025-10-26 12:49:54.824176	f	\N	\N	\N	2025-10-26 12:49:54.824176	2025-10-26 12:49:58.812
d92f513e-eaa9-482d-a9d1-e6c417f2de6e	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	51bfef87-096e-4dc3-87b8-7c35ef9fbe38	GRN	GRN-2510-1a936892-d57c-491d-a5f9-b0fe1b32d90d-0001	2510	1a936892-d57c-491d-a5f9-b0fe1b32d90d	\N	1	\N	\N	\N	2025-10-27 13:00:39.583857	f	\N	\N	\N	2025-10-27 13:00:39.583857	2025-10-27 13:00:39.583857
8d2084e1-d1d1-4817-8878-30868bd278f9	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	51bfef87-096e-4dc3-87b8-7c35ef9fbe38	GRN	GRN-2510-1a936892-d57c-491d-a5f9-b0fe1b32d90d-0002	2510	1a936892-d57c-491d-a5f9-b0fe1b32d90d	\N	2	\N	\N	\N	2025-10-27 13:23:21.897407	f	\N	\N	\N	2025-10-27 13:23:21.897407	2025-10-27 13:23:21.897407
7063e95e-6783-4b91-8ee1-a6ae03c921cc	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	51bfef87-096e-4dc3-87b8-7c35ef9fbe38	GRN	GRN-2510-1a936892-d57c-491d-a5f9-b0fe1b32d90d-0003	2510	1a936892-d57c-491d-a5f9-b0fe1b32d90d	\N	3	\N	\N	\N	2025-10-27 13:35:19.870126	f	\N	\N	\N	2025-10-27 13:35:19.870126	2025-10-27 13:35:19.870126
f4777c6c-09e3-4e4e-b423-b94b6f3b84d9	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0001	2510	WH1	\N	1	\N	\N	\N	2025-10-27 13:44:08.557186	f	\N	\N	\N	2025-10-27 13:44:08.557186	2025-10-27 13:44:08.557186
96d9ef49-d8f6-4e91-a5ee-d87a5f2591c5	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0002	2510	WH1	\N	2	\N	\N	\N	2025-10-27 14:20:12.742564	f	\N	\N	\N	2025-10-27 14:20:12.742564	2025-10-27 14:20:12.742564
b264e801-f339-4650-81ec-63c3e7e7f5ed	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0003	2510	WH1	\N	3	\N	\N	\N	2025-10-28 03:40:13.273764	f	\N	\N	\N	2025-10-28 03:40:13.273764	2025-10-28 03:40:13.273764
cf87fb6c-e0e8-4d72-bcd4-5dc6743f419b	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0004	2510	WH1	\N	4	\N	\N	\N	2025-10-28 04:42:58.707635	f	\N	\N	\N	2025-10-28 04:42:58.707635	2025-10-28 04:42:58.707635
aef059c6-c4c1-4ede-86bf-4fcda6a4cc72	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	GRN	GRN-2510-WH1-0005	2510	WH1	\N	5	\N	\N	\N	2025-10-28 05:53:11.312459	f	\N	\N	\N	2025-10-28 05:53:11.312459	2025-10-28 05:53:11.312459
44d81202-5dfb-420e-9619-8e598677a51a	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	b9e06bbf-a53f-447d-bbdd-bf07d29790cd	PUTAWAY	PUTAWAY-2510-WH1-0001	2510	WH1	\N	1	\N	\N	\N	2025-10-29 03:34:11.64042	f	\N	\N	\N	2025-10-29 03:34:11.64042	2025-10-29 03:34:11.64042
a8b7e669-2e97-44bd-bea5-3cf27ff98ce2	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	b9e06bbf-a53f-447d-bbdd-bf07d29790cd	PUTAWAY	PUTAWAY-2510-WH1-0002	2510	WH1	\N	2	\N	\N	\N	2025-10-29 06:03:44.112249	f	\N	\N	\N	2025-10-29 06:03:44.112249	2025-10-29 06:03:44.112249
b407829a-3fd7-4161-9e7d-865d43666911	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	b9e06bbf-a53f-447d-bbdd-bf07d29790cd	PUTAWAY	PUTAWAY-2510-WH1-0003	2510	WH1	\N	3	\N	\N	\N	2025-10-29 13:20:30.633824	f	\N	\N	\N	2025-10-29 13:20:30.633824	2025-10-29 13:20:30.633824
e180807f-9d5e-4baa-8ebf-03cf3d31fad1	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0004	2510	WH	\N	4	d49945db-3965-47a0-887f-00919842d45f	purchase_orders	\N	2025-10-30 01:27:59.144803	f	\N	\N	\N	2025-10-30 01:27:59.144803	2025-10-30 01:28:02.682
8f0bc5be-7b21-4f00-bef0-c32f6a152d9d	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0005	2510	WH	\N	5	61423a15-574d-40b1-8d9c-11c888ecaf8d	purchase_orders	\N	2025-10-30 01:56:38.428885	f	\N	\N	\N	2025-10-30 01:56:38.428885	2025-10-30 01:56:41.863
889bb0e5-ab64-49de-8775-6654b06885bb	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	d9fa9867-73f6-41dc-8e84-be8feba0429e	PO	PO-2510-WH-0006	2510	WH	\N	6	8f0d475e-f727-4c8f-a1e9-7ebc3d870ca3	purchase_orders	\N	2025-10-30 02:07:25.931977	f	\N	\N	\N	2025-10-30 02:07:25.931977	2025-10-30 02:07:29.408
3edd67e7-d64c-448e-97ae-71d2aa66b196	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0001	2511	NORTH	\N	1	207695d1-6a71-4250-8216-551ca79dd264	\N	\N	2025-11-04 07:06:16.055956	f	\N	\N	\N	2025-11-04 07:06:16.055956	2025-11-04 07:06:19.752
418ac049-de95-4502-b3e8-00842765dad0	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0002	2511	NORTH	\N	2	2f27529d-ba85-4631-ae02-56becec20a87	\N	\N	2025-11-05 04:15:22.061799	f	\N	\N	\N	2025-11-05 04:15:22.061799	2025-11-05 04:15:25.626
93a61135-435c-48ab-b458-c257c3e8eeeb	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0003	2511	NORTH	\N	3	089902ea-9c3d-41ee-a9e6-25520780d2b0	\N	\N	2025-11-05 04:25:20.25857	f	\N	\N	\N	2025-11-05 04:25:20.25857	2025-11-05 04:25:23.644
83c91c2c-31b2-4f19-85f3-b6e94a1cd5e9	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0004	2511	NORTH	\N	4	af4d9683-8428-4a9c-a269-f38f2b012202	\N	\N	2025-11-05 07:55:38.295587	f	\N	\N	\N	2025-11-05 07:55:38.295587	2025-11-05 07:55:41.828
9ee9bec2-844c-43fb-84a8-1174e7cd3c2d	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	c74f1869-8470-4cfc-b61e-797b8da77031	GRN	GRN-2511-WH1-0001	2511	WH1	\N	1	\N	\N	\N	2025-11-06 05:00:47.499469	f	\N	\N	\N	2025-11-06 05:00:47.499469	2025-11-06 05:00:47.499469
80a8ffc1-ec78-43ab-b725-8b0acf3d57b1	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0001	2511	WH1	\N	1	\N	\N	\N	2025-11-07 00:15:56.745504	f	\N	\N	\N	2025-11-07 00:15:56.745504	2025-11-07 00:15:56.745504
47af5ad0-e3e4-44bb-a220-0da399059eb9	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0001	2511	WH1	\N	1	\N	\N	\N	2025-11-09 02:52:36.969269	f	\N	\N	\N	2025-11-09 02:52:36.969269	2025-11-09 02:52:36.969269
08d8000c-a3a2-471d-ae59-d09f641abc22	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0005	2511	NORTH	\N	5	9ef0d521-b587-43bf-9c3e-705fea4f84c0	\N	\N	2025-11-09 03:36:33.139226	f	\N	\N	\N	2025-11-09 03:36:33.139226	2025-11-09 03:36:40.693
46ec31b9-cf6d-4879-8915-925c9eaa9f91	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0006	2511	NORTH	\N	6	7d90cf0f-3e76-40a9-a697-cb07862b7855	\N	\N	2025-11-09 03:39:44.146152	f	\N	\N	\N	2025-11-09 03:39:44.146152	2025-11-09 03:39:51.805
092a03eb-7996-4bcb-8845-d3d0e58ddd4a	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0007	2511	NORTH	\N	7	52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	\N	\N	2025-11-09 04:28:39.644186	f	\N	\N	\N	2025-11-09 04:28:39.644186	2025-11-09 04:28:47.198
5332aa70-ac77-46a1-8585-80195a66b355	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0001	2511	WH	\N	1	\N	\N	\N	2025-11-09 05:29:02.987744	f	\N	\N	\N	2025-11-09 05:29:02.987744	2025-11-09 05:29:02.987744
fa10154d-dc3d-43be-8d19-48b165bc3f9f	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0008	2511	NORTH	\N	8	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	\N	\N	2025-11-10 06:47:50.735268	f	\N	\N	\N	2025-11-10 06:47:50.735268	2025-11-10 06:47:56.447
15b992db-7753-4ac2-940e-603ae8d43b84	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0002	2511	WH	\N	2	\N	\N	\N	2025-11-10 07:05:11.152626	f	\N	\N	\N	2025-11-10 07:05:11.152626	2025-11-10 07:05:11.152626
e20aae67-14db-4111-aa08-25c5e7c2efdc	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0002	2511	WH1	\N	2	\N	\N	\N	2025-11-10 07:07:37.73227	f	\N	\N	\N	2025-11-10 07:07:37.73227	2025-11-10 07:07:37.73227
767b0f34-c4b7-48ae-90f0-a53c1b3bb5b6	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0002	2511	WH1	\N	2	\N	\N	\N	2025-11-10 07:11:59.348394	f	\N	\N	\N	2025-11-10 07:11:59.348394	2025-11-10 07:11:59.348394
e890938b-83cb-4f5f-9fd3-823ea5d5f443	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0009	2511	NORTH	\N	9	690ebd60-7169-4beb-b53f-c44392bd715e	\N	\N	2025-11-10 08:21:31.798399	f	\N	\N	\N	2025-11-10 08:21:31.798399	2025-11-10 08:21:37.512
3a047ed9-70b9-473b-a204-9917222d1ca1	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0003	2511	WH	\N	3	\N	\N	\N	2025-11-10 08:23:14.5202	f	\N	\N	\N	2025-11-10 08:23:14.5202	2025-11-10 08:23:14.5202
adb8e360-e357-4b0a-8fed-c88541ba5c30	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0010	2511	NORTH	\N	10	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	\N	\N	2025-11-12 02:14:11.566469	f	\N	\N	\N	2025-11-12 02:14:11.566469	2025-11-12 02:14:15.107
692b5428-aeb8-4295-9b21-23cea0756e92	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0004	2511	WH	\N	4	\N	\N	\N	2025-11-12 02:18:47.238637	f	\N	\N	\N	2025-11-12 02:18:47.238637	2025-11-12 02:18:47.238637
e6c9a2f1-d88e-41e2-bba6-a09e55c66f24	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0003	2511	WH1	\N	3	\N	\N	\N	2025-11-12 02:19:28.276514	f	\N	\N	\N	2025-11-12 02:19:28.276514	2025-11-12 02:19:28.276514
8f00ee72-145a-455f-93ed-87620b983dcd	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0003	2511	WH1	\N	3	\N	\N	\N	2025-11-12 02:21:15.636356	f	\N	\N	\N	2025-11-12 02:21:15.636356	2025-11-12 02:21:15.636356
ea45b396-58f9-43cc-b5d9-d2278575ce6c	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0001	2511	DHL	\N	1	\N	\N	\N	2025-11-12 02:24:26.308567	f	\N	\N	\N	2025-11-12 02:24:26.308567	2025-11-12 02:24:26.308567
cf66bb81-5f35-4f23-aa7b-18557adc8eae	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0002	2511	DHL	\N	2	\N	\N	\N	2025-11-12 02:25:42.748876	f	\N	\N	\N	2025-11-12 02:25:42.748876	2025-11-12 02:25:42.748876
462fcc9d-2e23-445a-98ab-771620919b1a	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0003	2511	DHL	\N	3	\N	\N	\N	2025-11-12 02:32:06.870452	f	\N	\N	\N	2025-11-12 02:32:06.870452	2025-11-12 02:32:06.870452
2e7793ec-c226-4adb-9e47-15234096934d	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0004	2511	DHL	\N	4	\N	\N	\N	2025-11-12 02:43:20.125978	f	\N	\N	\N	2025-11-12 02:43:20.125978	2025-11-12 02:43:20.125978
65e0baed-3dac-4c61-bd3f-8c6ca69ef921	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0005	2511	DHL	\N	5	\N	\N	\N	2025-11-12 02:52:45.973223	f	\N	\N	\N	2025-11-12 02:52:45.973223	2025-11-12 02:52:45.973223
eb48b8aa-1cd8-434d-a28f-0c0f4ee0ff08	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0006	2511	DHL	\N	6	\N	\N	\N	2025-11-12 04:03:54.335945	f	\N	\N	\N	2025-11-12 04:03:54.335945	2025-11-12 04:03:54.335945
7b513bf3-594c-4692-aced-0f29db42b825	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0007	2511	DHL	\N	7	\N	\N	\N	2025-11-12 04:07:51.294848	f	\N	\N	\N	2025-11-12 04:07:51.294848	2025-11-12 04:07:51.294848
b0b5790c-fa6a-4f52-a67e-e9e4a6973e08	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0011	2511	NORTH	\N	11	773238c7-aed6-4049-8aa2-782df99182ba	\N	\N	2025-11-12 04:12:52.572477	f	\N	\N	\N	2025-11-12 04:12:52.572477	2025-11-12 04:12:55.947
1a276494-6044-40ba-886d-062dd9b6de7e	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0005	2511	WH	\N	5	\N	\N	\N	2025-11-12 04:13:40.319089	f	\N	\N	\N	2025-11-12 04:13:40.319089	2025-11-12 04:13:40.319089
e147871d-5d79-4928-b53a-e493ed82b435	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0004	2511	WH1	\N	4	\N	\N	\N	2025-11-12 04:14:34.34677	f	\N	\N	\N	2025-11-12 04:14:34.34677	2025-11-12 04:14:34.34677
eb0a6718-be1b-48a9-b739-23f09f7b329d	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0004	2511	WH1	\N	4	\N	\N	\N	2025-11-12 04:17:56.408998	f	\N	\N	\N	2025-11-12 04:17:56.408998	2025-11-12 04:17:56.408998
0deb605d-e0b7-46b5-b632-65e8cb6f4651	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0008	2511	DHL	\N	8	\N	\N	\N	2025-11-12 04:28:18.218585	f	\N	\N	\N	2025-11-12 04:28:18.218585	2025-11-12 04:28:18.218585
4625dbc6-c3a1-4abd-bf1c-3c47281ca3e6	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0012	2511	NORTH	\N	12	4db87969-8444-49ea-af53-7f7f80fcd8b9	\N	\N	2025-11-12 04:40:26.865485	f	\N	\N	\N	2025-11-12 04:40:26.865485	2025-11-12 04:40:30.403
db7557f1-1f83-4611-9386-e382541d2933	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0006	2511	WH	\N	6	\N	\N	\N	2025-11-12 04:41:56.673274	f	\N	\N	\N	2025-11-12 04:41:56.673274	2025-11-12 04:41:56.673274
7d9fc30d-435b-4f87-82fc-1717eaf4a401	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0005	2511	WH1	\N	5	\N	\N	\N	2025-11-12 04:43:01.063596	f	\N	\N	\N	2025-11-12 04:43:01.063596	2025-11-12 04:43:01.063596
011570c2-48e2-4b3e-8df4-7e2f89975c5d	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0005	2511	WH1	\N	5	\N	\N	\N	2025-11-12 04:45:17.706139	f	\N	\N	\N	2025-11-12 04:45:17.706139	2025-11-12 04:45:17.706139
2f924cc6-a9c7-489f-b243-48c15fe58481	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0009	2511	DHL	\N	9	\N	\N	\N	2025-11-12 04:48:01.530122	f	\N	\N	\N	2025-11-12 04:48:01.530122	2025-11-12 04:48:01.530122
334725ad-7f9d-4789-8abd-84ddcc0fbc6b	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0013	2511	NORTH	\N	13	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	\N	\N	2025-11-12 08:33:32.30358	f	\N	\N	\N	2025-11-12 08:33:32.30358	2025-11-12 08:33:35.816
aae415c2-5ce0-447b-808c-87ac6cb589f8	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0007	2511	WH	\N	7	\N	\N	\N	2025-11-12 08:35:45.536653	f	\N	\N	\N	2025-11-12 08:35:45.536653	2025-11-12 08:35:45.536653
209db019-2c88-4412-8bd0-45f222a11471	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0006	2511	WH1	\N	6	\N	\N	\N	2025-11-12 08:36:50.507873	f	\N	\N	\N	2025-11-12 08:36:50.507873	2025-11-12 08:36:50.507873
1c224950-987c-4590-9d70-d61844818675	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0006	2511	WH1	\N	6	\N	\N	\N	2025-11-12 08:55:44.554391	f	\N	\N	\N	2025-11-12 08:55:44.554391	2025-11-12 08:55:44.554391
82959913-f6ee-4de9-b6cc-2f8fc763809d	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0010	2511	DHL	\N	10	\N	\N	\N	2025-11-12 08:59:00.238528	f	\N	\N	\N	2025-11-12 08:59:00.238528	2025-11-12 08:59:00.238528
63c9196b-3a32-4a96-818c-81c2ea3dba39	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0001	2511	NORTH	\N	1	\N	\N	\N	2025-11-13 07:45:02.256592	f	\N	\N	\N	2025-11-13 07:45:02.256592	2025-11-13 07:45:02.256592
1f2e3420-263a-43e9-b456-f4ddf04188c2	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0002	2511	NORTH	\N	2	\N	\N	\N	2025-11-13 08:10:13.643917	f	\N	\N	\N	2025-11-13 08:10:13.643917	2025-11-13 08:10:13.643917
39a68cf5-62ea-43f4-827c-c86878e4c96b	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0014	2511	NORTH	\N	14	1f65dc4e-93ca-476c-8254-c8cd25cc574e	\N	\N	2025-11-13 08:39:37.052804	f	\N	\N	\N	2025-11-13 08:39:37.052804	2025-11-13 08:39:40.588
7f4dee19-9ead-4cba-824f-670b06106bf3	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0008	2511	WH	\N	8	\N	\N	\N	2025-11-13 08:40:18.065041	f	\N	\N	\N	2025-11-13 08:40:18.065041	2025-11-13 08:40:18.065041
8cf33d04-422f-4337-b3b4-73f99ce9b38b	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0007	2511	WH1	\N	7	\N	\N	\N	2025-11-13 08:41:00.242762	f	\N	\N	\N	2025-11-13 08:41:00.242762	2025-11-13 08:41:00.242762
7916b6ea-f11b-4675-bfae-2dde7de7a410	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0007	2511	WH1	\N	7	\N	\N	\N	2025-11-13 08:47:17.287639	f	\N	\N	\N	2025-11-13 08:47:17.287639	2025-11-13 08:47:17.287639
2961a6c9-7e4a-4c7f-b3de-e2aad67dcd7f	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0011	2511	DHL	\N	11	\N	\N	\N	2025-11-13 08:48:48.50652	f	\N	\N	\N	2025-11-13 08:48:48.50652	2025-11-13 08:48:48.50652
14d0c1a6-232a-418a-b4a2-b1cb3c68da75	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0003	2511	NORTH	\N	3	\N	\N	\N	2025-11-13 08:50:07.00808	f	\N	\N	\N	2025-11-13 08:50:07.00808	2025-11-13 08:50:07.00808
6f3920b7-4180-4f57-8dc3-4415c1f9b3bd	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0015	2511	NORTH	\N	15	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	\N	\N	2025-11-13 09:13:48.45454	f	\N	\N	\N	2025-11-13 09:13:48.45454	2025-11-13 09:13:52.023
2cb8f387-8912-4545-bdf3-3dbc8e8ce6d6	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0009	2511	WH	\N	9	\N	\N	\N	2025-11-13 09:14:35.907558	f	\N	\N	\N	2025-11-13 09:14:35.907558	2025-11-13 09:14:35.907558
8e5829f7-a4c7-4ce0-bdf6-a6382310a17a	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0008	2511	WH1	\N	8	\N	\N	\N	2025-11-13 09:15:24.331872	f	\N	\N	\N	2025-11-13 09:15:24.331872	2025-11-13 09:15:24.331872
db9e4568-3be7-4bb0-a526-f50ba0dda5f4	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0008	2511	WH1	\N	8	\N	\N	\N	2025-11-13 09:17:14.6818	f	\N	\N	\N	2025-11-13 09:17:14.6818	2025-11-13 09:17:14.6818
d8dc6529-040e-4b89-baff-4c3f45bc304e	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0012	2511	DHL	\N	12	\N	\N	\N	2025-11-13 09:18:38.495502	f	\N	\N	\N	2025-11-13 09:18:38.495502	2025-11-13 09:18:38.495502
18c406d9-98e1-4507-9399-c2459d9b6b11	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0004	2511	NORTH	\N	4	\N	\N	\N	2025-11-13 09:20:06.576664	f	\N	\N	\N	2025-11-13 09:20:06.576664	2025-11-13 09:20:06.576664
b3e9834b-2da8-455a-9efe-1dc3506c83ad	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0016	2511	NORTH	\N	16	efb53562-d2e9-49a7-8ca8-364c8c760457	\N	\N	2025-11-13 09:55:15.964538	f	\N	\N	\N	2025-11-13 09:55:15.964538	2025-11-13 09:55:19.474
80e19eb8-3b7a-43ee-a22c-ab2040820562	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0010	2511	WH	\N	10	\N	\N	\N	2025-11-13 09:56:27.484174	f	\N	\N	\N	2025-11-13 09:56:27.484174	2025-11-13 09:56:27.484174
094ab894-b073-47a1-91ad-82ec2bdc19a8	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0009	2511	WH1	\N	9	\N	\N	\N	2025-11-13 09:57:05.460784	f	\N	\N	\N	2025-11-13 09:57:05.460784	2025-11-13 09:57:05.460784
1fb13d6c-6704-4d8c-ab71-b2772ca0b596	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0009	2511	WH1	\N	9	\N	\N	\N	2025-11-13 10:00:00.346785	f	\N	\N	\N	2025-11-13 10:00:00.346785	2025-11-13 10:00:00.346785
ef9dbd86-971a-43e3-bb93-6b1bf3a001ec	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0013	2511	DHL	\N	13	\N	\N	\N	2025-11-13 10:01:29.262025	f	\N	\N	\N	2025-11-13 10:01:29.262025	2025-11-13 10:01:29.262025
7046ed27-eaec-4f23-bb0b-51982d42d139	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0005	2511	NORTH	\N	5	\N	\N	\N	2025-11-13 10:02:46.341473	f	\N	\N	\N	2025-11-13 10:02:46.341473	2025-11-13 10:02:46.341473
90bec865-d252-42d5-8a41-24c080e41af0	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0017	2511	NORTH	\N	17	76a1aa22-f63c-48f1-9d91-2edb698d6742	\N	\N	2025-11-13 10:19:31.26577	f	\N	\N	\N	2025-11-13 10:19:31.26577	2025-11-13 10:19:34.722
636496c4-0a8a-4c28-8e50-9d1befadee37	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0011	2511	WH	\N	11	\N	\N	\N	2025-11-13 10:20:17.580072	f	\N	\N	\N	2025-11-13 10:20:17.580072	2025-11-13 10:20:17.580072
944a3a44-a849-4bf6-9ec5-55062c3962aa	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0010	2511	WH1	\N	10	\N	\N	\N	2025-11-13 10:21:12.419944	f	\N	\N	\N	2025-11-13 10:21:12.419944	2025-11-13 10:21:12.419944
89aece94-4fc9-44b9-90d1-e5a9fc1ac28c	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0010	2511	WH1	\N	10	\N	\N	\N	2025-11-13 10:23:53.288394	f	\N	\N	\N	2025-11-13 10:23:53.288394	2025-11-13 10:23:53.288394
1c4cabfa-3b05-4c2c-8b8a-ed3ca0e3a338	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	4abe8cc2-e6a6-4be3-9326-08ac2d22479e	SHIP	SHIP-2511-DHL-0014	2511	DHL	\N	14	\N	\N	\N	2025-11-13 10:25:13.786487	f	\N	\N	\N	2025-11-13 10:25:13.786487	2025-11-13 10:25:13.786487
75d4d51e-8168-437e-8301-08a20e3f6dc5	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	8cb372f5-b46e-472a-a474-2b6058e5d2c6	DELIVERY	DELIVERY-2511-NORTH-0006	2511	NORTH	\N	6	\N	\N	\N	2025-11-13 10:27:09.598572	f	\N	\N	\N	2025-11-13 10:27:09.598572	2025-11-13 10:27:09.598572
4bd0c24a-45a5-40c1-8aef-6661b9d4a762	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	c74f1869-8470-4cfc-b61e-797b8da77031	GRN	GRN-2511-WH1-0002	2511	WH1	\N	2	\N	\N	\N	2025-11-13 10:31:38.200998	f	\N	\N	\N	2025-11-13 10:31:38.200998	2025-11-13 10:31:38.200998
090f3e7d-307a-48d0-ba3f-c56aca2d772c	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	5dd574e9-bae5-4651-9575-a0872f72bb96	PUTAWAY	PUTAWAY-2511-WH1-0001	2511	WH1	\N	1	\N	\N	\N	2025-11-13 11:04:04.390912	f	\N	\N	\N	2025-11-13 11:04:04.390912	2025-11-13 11:04:04.390912
a98b1a01-5e08-4849-9394-0978e36d09eb	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0018	2511	NORTH	\N	18	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	\N	\N	2025-11-14 02:04:23.613398	f	\N	\N	\N	2025-11-14 02:04:23.613398	2025-11-14 02:04:27.079
c7fd118d-9988-4328-9431-e07277aa8a58	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0019	2511	NORTH	\N	19	0be43aa0-0e67-4329-8021-719c6aec65b4	\N	\N	2025-11-14 02:05:04.090757	f	\N	\N	\N	2025-11-14 02:05:04.090757	2025-11-14 02:05:07.546
bfa87141-7f06-4a85-8fb0-a9a13d7c5d7f	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0012	2511	WH	\N	12	\N	\N	\N	2025-11-14 02:06:12.570692	f	\N	\N	\N	2025-11-14 02:06:12.570692	2025-11-14 02:06:12.570692
aea6dfcb-4742-45d8-9447-4df1fe541328	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0013	2511	WH	\N	13	\N	\N	\N	2025-11-14 02:06:35.19631	f	\N	\N	\N	2025-11-14 02:06:35.19631	2025-11-14 02:06:35.19631
f7991865-0b08-48e5-b21d-1ad6a6fcf4d9	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0011	2511	WH1	\N	11	\N	\N	\N	2025-11-14 02:07:03.573843	f	\N	\N	\N	2025-11-14 02:07:03.573843	2025-11-14 02:07:03.573843
f53bff3c-0702-4ba7-bcc7-3a77322104c6	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0012	2511	WH1	\N	12	\N	\N	\N	2025-11-14 02:07:26.580821	f	\N	\N	\N	2025-11-14 02:07:26.580821	2025-11-14 02:07:26.580821
8892ff40-7be5-414a-8410-f10b8ff4e106	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0020	2511	NORTH	\N	20	dba473ab-546d-45ea-a2f5-b0e354d16684	\N	\N	2025-11-14 02:16:18.446393	f	\N	\N	\N	2025-11-14 02:16:18.446393	2025-11-14 02:16:22.365
9c4d36c1-700e-4396-a34e-6dd91c8a0c22	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0021	2511	NORTH	\N	21	74e9c94c-13ea-4819-a948-524f40e2dbd2	\N	\N	2025-11-14 02:17:08.333147	f	\N	\N	\N	2025-11-14 02:17:08.333147	2025-11-14 02:17:12.196
7d5e2285-5fa1-4bfb-93d0-ca6e80daef1b	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0014	2511	WH	\N	14	\N	\N	\N	2025-11-14 02:17:50.85401	f	\N	\N	\N	2025-11-14 02:17:50.85401	2025-11-14 02:17:50.85401
8233c3fd-9287-4806-8e17-82ee3c960414	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0015	2511	WH	\N	15	\N	\N	\N	2025-11-14 02:18:14.981302	f	\N	\N	\N	2025-11-14 02:18:14.981302	2025-11-14 02:18:14.981302
e9fed539-5805-429f-a5d7-d89f4fe0966b	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0013	2511	WH1	\N	13	\N	\N	\N	2025-11-14 02:18:44.718824	f	\N	\N	\N	2025-11-14 02:18:44.718824	2025-11-14 02:18:44.718824
206756ee-59a7-4e3b-b921-5bc7beba977b	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0014	2511	WH1	\N	14	\N	\N	\N	2025-11-14 02:20:09.605838	f	\N	\N	\N	2025-11-14 02:20:09.605838	2025-11-14 02:20:09.605838
5428d6c7-6ced-4fb4-b423-e13e519a9641	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0011	2511	WH1	\N	11	\N	\N	\N	2025-11-14 02:21:29.962202	f	\N	\N	\N	2025-11-14 02:21:29.962202	2025-11-14 02:21:29.962202
4bf04840-0b51-4f97-91c8-d965edf33f69	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0012	2511	WH1	\N	12	\N	\N	\N	2025-11-14 02:28:35.623392	f	\N	\N	\N	2025-11-14 02:28:35.623392	2025-11-14 02:28:35.623392
3f1bb443-0f85-4fa2-b3d0-b622bc414b16	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0013	2511	WH1	\N	13	\N	\N	\N	2025-11-14 02:55:56.851617	f	\N	\N	\N	2025-11-14 02:55:56.851617	2025-11-14 02:55:56.851617
d919d4f1-d825-4465-ad0c-3a4d0aac592f	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	b61debbd-1918-4155-8d1b-87a6ca13bee6	SO	SO-2511-NORTH-0022	2511	NORTH	\N	22	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	\N	\N	2025-11-14 02:56:45.046442	f	\N	\N	\N	2025-11-14 02:56:45.046442	2025-11-14 02:56:48.448
72922471-eec4-4748-bdb8-3fcb2fb4418b	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	0ff8501b-a49b-4e86-8da2-f8c39649553b	ALLOC	ALLOC-2511-WH-0016	2511	WH	\N	16	\N	\N	\N	2025-11-14 02:57:28.28267	f	\N	\N	\N	2025-11-14 02:57:28.28267	2025-11-14 02:57:28.28267
949f6e19-db39-446c-9e22-0adf5281aaa5	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	9388e7d0-0b21-4317-87e6-eeebac4dc1c7	PICK	PICK-2511-WH1-0015	2511	WH1	\N	15	\N	\N	\N	2025-11-14 02:57:56.901945	f	\N	\N	\N	2025-11-14 02:57:56.901945	2025-11-14 02:57:56.901945
e6aa0fda-9cd9-4370-a219-4b9fa165c08f	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	20552c62-71cb-47a7-8bef-33383d1764d1	PACK	PACK-2511-WH1-0014	2511	WH1	\N	14	\N	\N	\N	2025-11-14 02:59:10.43173	f	\N	\N	\N	2025-11-14 02:59:10.43173	2025-11-14 02:59:10.43173
3c7aaff4-1004-48a4-a3be-5fdcc29cbda3	8e017478-2f5f-4be3-b8b6-e389436ca28a	ea647719-d032-42ac-852c-a73c460a4ad1	a475b546-5a01-491a-961e-71906c0d7ea0	CYCCOUNT	CYCCOUNT-2511-WH1-0001	2511	WH1	\N	1	\N	cycle_counts	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-18 10:46:32.254841	f	\N	\N	\N	2025-11-18 10:46:32.254841	2025-11-18 10:46:32.254841
26cf05bf-2e36-4dff-ac3c-77e2989b0142	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0001	2511	WH1	\N	1	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 04:37:19.421807	f	\N	\N	\N	2025-11-19 04:37:19.421807	2025-11-19 04:37:19.421807
48e5780f-a173-418e-87b6-97a063aa8d94	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0002	2511	WH1	\N	2	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 04:41:12.414698	f	\N	\N	\N	2025-11-19 04:41:12.414698	2025-11-19 04:41:12.414698
cfc2463d-b447-45af-803d-5c0403e2ee8e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0003	2511	WH1	\N	3	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 11:07:55.829385	f	\N	\N	\N	2025-11-19 11:07:55.829385	2025-11-19 11:07:55.829385
e7ec6883-9be2-4b43-9171-8cfdc24b39da	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0004	2511	WH1	\N	4	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:27:00.430686	f	\N	\N	\N	2025-11-19 14:27:00.430686	2025-11-19 14:27:00.430686
77a561cd-f553-4b4e-b61e-2fde6adfe3d9	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0005	2511	WH1	\N	5	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:30:31.669791	f	\N	\N	\N	2025-11-19 14:30:31.669791	2025-11-19 14:30:31.669791
2cd5f6da-8f07-45ba-a502-0628ab615446	8e017478-2f5f-4be3-b8b6-e389436ca28a	ea647719-d032-42ac-852c-a73c460a4ad1	a475b546-5a01-491a-961e-71906c0d7ea0	CYCCOUNT	CYCCOUNT-2511-WH1-0002	2511	WH1	\N	2	\N	cycle_counts	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:46:41.491879	f	\N	\N	\N	2025-11-19 15:46:41.491879	2025-11-19 15:46:41.491879
0cb5abf2-3f45-4d17-828a-1292415628fb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	c257e202-fc7e-4bfc-a2c0-47af705453bf	STOCKADJ	STOCKADJ-2511-WH1-0006	2511	WH1	\N	6	\N	adjustments	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:47:21.327284	f	\N	\N	\N	2025-11-19 15:47:21.327284	2025-11-19 15:47:21.327284
\.


--
-- Data for Name: document_sequence_tracker; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.document_sequence_tracker (id, tenant_id, config_id, document_type, period, prefix1, prefix2, current_sequence, last_generated_number, last_generated_at, created_at, updated_at) FROM stdin;
b9e06bbf-a53f-447d-bbdd-bf07d29790cd	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	PUTAWAY	2510	WH1	\N	3	PUTAWAY-2510-WH1-0003	2025-10-29 13:20:29.508	2025-10-29 03:34:10.63089	2025-10-29 13:20:30.007
a475b546-5a01-491a-961e-71906c0d7ea0	8e017478-2f5f-4be3-b8b6-e389436ca28a	ea647719-d032-42ac-852c-a73c460a4ad1	CYCCOUNT	2511	WH1	\N	2	CYCCOUNT-2511-WH1-0002	2025-11-19 15:46:40.438	2025-11-18 10:46:31.249832	2025-11-19 15:46:40.895
c257e202-fc7e-4bfc-a2c0-47af705453bf	8e017478-2f5f-4be3-b8b6-e389436ca28a	4e629930-6799-40dc-aff3-ecb8be1eacb8	STOCKADJ	2511	WH1	\N	6	STOCKADJ-2511-WH1-0006	2025-11-19 15:47:20.283	2025-11-19 04:37:18.436511	2025-11-19 15:47:20.744
d9fa9867-73f6-41dc-8e84-be8feba0429e	8e017478-2f5f-4be3-b8b6-e389436ca28a	c682323b-f280-4cc6-bf75-b95c48862d86	PO	2510	WH	\N	7	PO-2510-WH-0007	2025-10-30 04:25:16.04	2025-10-26 11:15:53.116541	2025-10-30 04:25:16.601
2c1f9cbd-0605-4d58-8ed9-9bfd1b200666	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	GRN	2510	WH1	\N	6	GRN-2510-WH1-0006	2025-10-30 09:18:44.509	2025-10-27 13:44:07.556913	2025-10-30 09:18:45.045
4abe8cc2-e6a6-4be3-9326-08ac2d22479e	8e017478-2f5f-4be3-b8b6-e389436ca28a	de356e8a-d75f-489f-834c-389632f0f55a	SHIP	2511	DHL	\N	14	SHIP-2511-DHL-0014	2025-11-13 10:25:12.528	2025-11-12 02:24:25.34377	2025-11-13 10:25:13.092
8cb372f5-b46e-472a-a474-2b6058e5d2c6	8e017478-2f5f-4be3-b8b6-e389436ca28a	6f7b7754-b4f6-4edb-81d3-114492b968c9	DELIVERY	2511	NORTH	\N	6	DELIVERY-2511-NORTH-0006	2025-11-13 10:27:08.344	2025-11-13 07:45:01.262179	2025-11-13 10:27:08.899
51bfef87-096e-4dc3-87b8-7c35ef9fbe38	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	GRN	2510	1a936892-d57c-491d-a5f9-b0fe1b32d90d	\N	3	GRN-2510-1a936892-d57c-491d-a5f9-b0fe1b32d90d-0003	2025-10-27 13:35:18.762	2025-10-27 13:00:38.596041	2025-10-27 13:35:19.261
b61debbd-1918-4155-8d1b-87a6ca13bee6	8e017478-2f5f-4be3-b8b6-e389436ca28a	d8dbabe5-37e3-4329-8d4c-41fb833c2e1d	SO	2511	NORTH	\N	22	SO-2511-NORTH-0022	2025-11-14 02:56:43.968	2025-11-04 07:06:15.069484	2025-11-14 02:56:44.452
0ff8501b-a49b-4e86-8da2-f8c39649553b	8e017478-2f5f-4be3-b8b6-e389436ca28a	87963ae6-083d-4656-a0e9-94535fc88401	ALLOC	2511	WH	\N	16	ALLOC-2511-WH-0016	2025-11-14 02:57:27.224	2025-11-09 05:29:02.051592	2025-11-14 02:57:27.683
c74f1869-8470-4cfc-b61e-797b8da77031	8e017478-2f5f-4be3-b8b6-e389436ca28a	d36b12a4-25e8-4349-bed4-011b7f704e4b	GRN	2511	WH1	\N	2	GRN-2511-WH1-0002	2025-11-13 10:31:37.089	2025-11-06 05:00:46.492683	2025-11-13 10:31:37.582
5dd574e9-bae5-4651-9575-a0872f72bb96	8e017478-2f5f-4be3-b8b6-e389436ca28a	2e368a6a-d142-434b-ba8b-7bb1932306ab	PUTAWAY	2511	WH1	\N	1	PUTAWAY-2511-WH1-0001	\N	2025-11-13 11:04:03.26564	2025-11-13 11:04:03.675
9388e7d0-0b21-4317-87e6-eeebac4dc1c7	8e017478-2f5f-4be3-b8b6-e389436ca28a	15a099f7-ddb0-46cd-bee8-6e542bca8da6	PICK	2511	WH1	\N	15	PICK-2511-WH1-0015	2025-11-14 02:57:55.886	2025-11-07 00:15:55.788688	2025-11-14 02:57:56.342
20552c62-71cb-47a7-8bef-33383d1764d1	8e017478-2f5f-4be3-b8b6-e389436ca28a	44a21ce8-84d4-445b-a61e-f9e68c182d14	PACK	2511	WH1	\N	14	PACK-2511-WH1-0014	2025-11-14 02:59:09.336	2025-11-09 02:52:36.060718	2025-11-14 02:59:09.832
\.


--
-- Data for Name: generated_documents; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.generated_documents (id, tenant_id, document_type, document_number, reference_type, reference_id, files, version, generated_by, created_at, updated_at) FROM stdin;
52982e48-154c-40d8-a6e8-f9851b3457e3	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0002	purchase_order	22104b29-d3d1-4131-bb78-76933c076f60	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0002.html", "size": 6401, "generated_at": "2025-10-26T11:17:31.212Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-26 11:17:31.328827	2025-10-26 11:17:31.328827
fb556822-b252-4260-b25f-9d0e288af6be	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0001	purchase_order	8560794d-7e1b-4ba5-b607-0cfaa598cc00	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0001.html", "size": 6662, "generated_at": "2025-10-24T13:20:36.860Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-24 13:20:36.860188	2025-10-24 13:20:36.860188
2b14e05b-098a-41a7-8add-861356dd3c59	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0003	purchase_order	3189b935-c1c6-45b3-b13c-c17912e12a92	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0003.html", "size": 6574, "generated_at": "2025-10-26T12:50:01.071Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-26 12:50:01.23153	2025-10-26 12:50:01.23153
04a78226-abef-4030-b50a-17b531176701	8e017478-2f5f-4be3-b8b6-e389436ca28a	goods_receipt_note	GRN-2510-WH1-0004	purchase_order_receipt	9b799e3e-889d-45cb-8419-ef423e69c18f	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2510-WH1-0004.html", "size": 8560, "generated_at": "2025-10-28T04:43:01.918Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-28 04:42:53.612467	2025-10-28 04:42:53.612467
bd1bbf63-b565-4728-b9c1-c870fd8597f6	8e017478-2f5f-4be3-b8b6-e389436ca28a	goods_receipt_note	GRN-2510-WH1-0005	purchase_order_receipt	0a389eed-ba9f-4c63-aab7-e86fbdf1f263	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2510-WH1-0005.html", "size": 9290, "generated_at": "2025-10-28T05:53:14.852Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-28 05:53:04.239003	2025-10-28 05:53:04.239003
c8d913d6-abc2-4071-bf2f-e9861cfff928	8e017478-2f5f-4be3-b8b6-e389436ca28a	PUTAWAY	PUTAWAY-2510-WH1-0003	receipt	9b799e3e-889d-45cb-8419-ef423e69c18f	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/putaway/2025/PUTAWAY-2510-WH1-0003.html", "size": 6875, "mimeType": "text/html"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-29 13:20:22.52205	2025-10-29 13:20:22.52205
79d32d56-a19a-4059-842a-53bfeaa0f44f	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0004	purchase_order	d49945db-3965-47a0-887f-00919842d45f	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0004.html", "size": 6144, "generated_at": "2025-10-30T01:28:04.674Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 01:28:04.786348	2025-10-30 01:28:04.786348
270c2af6-a32e-472f-a6b5-09e786e3509a	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0005	purchase_order	61423a15-574d-40b1-8d9c-11c888ecaf8d	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0005.html", "size": 6143, "generated_at": "2025-10-30T01:56:43.728Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 01:56:43.853405	2025-10-30 01:56:43.853405
87cc995a-2aed-4454-a988-d71ddcf09037	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0006	purchase_order	8f0d475e-f727-4c8f-a1e9-7ebc3d870ca3	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0006.html", "size": 6146, "generated_at": "2025-10-30T02:07:31.292Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 02:07:31.40406	2025-10-30 02:07:31.40406
5b159eda-1f84-4cc5-ab27-eaf3d11892d7	8e017478-2f5f-4be3-b8b6-e389436ca28a	purchase_order	PO-2510-WH-0007	purchase_order	8a143b8d-7e64-4e1f-b58c-9165a79060bc	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/po/2025/PO-2510-WH-0007.html", "size": 6156, "generated_at": "2025-10-30T04:25:25.134Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 04:25:25.238294	2025-10-30 04:25:25.238294
b175c2fb-fb15-457a-9429-a9484cf2e4a1	8e017478-2f5f-4be3-b8b6-e389436ca28a	goods_receipt_note	GRN-2510-WH1-0006	purchase_order_receipt	5f2b6521-3df1-4d7a-82a2-050e71c90f84	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2510-WH1-0006.html", "size": 9155, "generated_at": "2025-10-30T09:18:49.058Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 09:18:40.267617	2025-10-30 09:18:40.267617
4b63ad98-8ac9-4284-951f-ba435b22471b	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0003	sales_order	089902ea-9c3d-41ee-a9e6-25520780d2b0	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0003.html", "size": 6861, "generated_at": "2025-11-05T04:25:27.601Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-05 04:25:27.706563	2025-11-05 04:25:27.706563
b780846d-c34d-489f-9f92-946fda3b47a4	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0004	sales_order	af4d9683-8428-4a9c-a269-f38f2b012202	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0004.html", "size": 6563, "generated_at": "2025-11-05T07:55:45.467Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-05 07:55:45.57853	2025-11-05 07:55:45.57853
b005acce-03fe-46c7-b7df-273afc86b775	8e017478-2f5f-4be3-b8b6-e389436ca28a	goods_receipt_note	GRN-2511-WH1-0001	purchase_order_receipt	bd19577f-d1a3-4706-80fe-d69d31aa6a70	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2511-WH1-0001.html", "size": 8491, "generated_at": "2025-11-06T05:00:50.392Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-06 05:00:40.992935	2025-11-06 05:00:40.992935
b3931a69-d373-41bb-bade-eecb75c47cdd	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0001	sales_order	089902ea-9c3d-41ee-a9e6-25520780d2b0	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0001.html", "size": 9398, "generated_at": "2025-11-09T02:52:38.812Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 02:52:38.926991	2025-11-09 02:52:38.926991
1f2ead83-1953-4514-a208-353c9c0d7651	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0005	sales_order	9ef0d521-b587-43bf-9c3e-705fea4f84c0	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0005.html", "size": 7899, "generated_at": "2025-11-09T03:36:46.958Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 03:36:47.075293	2025-11-09 03:36:47.075293
79b85587-e099-4f66-b933-25024e0e77dd	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0006	sales_order	7d90cf0f-3e76-40a9-a697-cb07862b7855	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0006.html", "size": 7578, "generated_at": "2025-11-09T03:39:57.327Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 03:39:57.432106	2025-11-09 03:39:57.432106
0776e205-4000-4de9-8cd5-2e018f227667	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0007	sales_order	52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0007.html", "size": 7895, "generated_at": "2025-11-09T04:28:53.434Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:28:53.537771	2025-11-09 04:28:53.537771
af08b84b-6538-4733-a87f-1ebc70f9f997	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0008	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0008.html", "size": 7612, "generated_at": "2025-11-10T06:48:02.074Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 06:48:02.184436	2025-11-10 06:48:02.184436
85de78ed-b1d2-411d-b818-6ec5a05ec61b	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0002	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0002.html", "size": 6971, "generated_at": "2025-11-10T07:05:13.451Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:05:13.575	2025-11-10 07:05:13.575
1e4ff0ba-e230-433b-9c57-92c12187abd1	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0002	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0002.html", "size": 8107, "generated_at": "2025-11-10T07:07:39.565Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:07:39.673317	2025-11-10 07:07:39.673317
81f3dfe7-1c1a-4f2a-9a29-a2e9c362e4ad	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0002	sales_order	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0002.html", "size": 9912, "generated_at": "2025-11-10T07:12:01.158Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:12:01.265854	2025-11-10 07:12:01.265854
60ccc1a3-797b-4914-a86c-d93769b7ed1a	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0009	sales_order	690ebd60-7169-4beb-b53f-c44392bd715e	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0009.html", "size": 6861, "generated_at": "2025-11-10T08:21:41.673Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 08:21:41.796085	2025-11-10 08:21:41.796085
42956d9b-a624-416d-ae10-04327eb2ded5	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0003	sales_order	690ebd60-7169-4beb-b53f-c44392bd715e	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0003.html", "size": 6013, "generated_at": "2025-11-10T08:23:16.831Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 08:23:16.955642	2025-11-10 08:23:16.955642
12d31476-90bc-4a4c-b82c-2b23854ab0c0	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0010	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0010.html", "size": 6983, "generated_at": "2025-11-12T02:14:19.722Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:14:19.840743	2025-11-12 02:14:19.840743
b3a2ea1b-dae6-4fd2-b01a-1e3b0a48bf40	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0004	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0004.html", "size": 6645, "generated_at": "2025-11-12T02:18:49.527Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:18:49.635104	2025-11-12 02:18:49.635104
03a5b98b-9445-460c-bdc2-b01b0a027d60	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0003	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0003.html", "size": 7757, "generated_at": "2025-11-12T02:19:30.102Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:19:30.207754	2025-11-12 02:19:30.207754
3b1c2df2-772e-43d7-8616-5b39d2a1794a	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0003	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0003.html", "size": 9388, "generated_at": "2025-11-12T02:21:17.515Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:21:17.639764	2025-11-12 02:21:17.639764
d2527c62-8d64-49f5-b31f-b7361cba6e05	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0007	sales_order	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0007.html", "size": 14114, "generated_at": "2025-11-12T04:07:58.170Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:07:58.287467	2025-11-12 04:07:58.287467
5713e3af-04bf-42f7-ba04-ff2abe990dc0	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0011	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0011.html", "size": 7001, "generated_at": "2025-11-12T04:13:00.341Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:13:00.444818	2025-11-12 04:13:00.444818
77381d9c-fdb5-4f1d-ad7e-b080c892e5a6	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0005	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0005.html", "size": 6963, "generated_at": "2025-11-12T04:13:42.521Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:13:42.626575	2025-11-12 04:13:42.626575
1860eeea-5899-4349-9490-f9e54cf1f6c6	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0004	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0004.html", "size": 8101, "generated_at": "2025-11-12T04:14:36.108Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:14:36.223993	2025-11-12 04:14:36.223993
d3fc5491-d75a-4e97-ae68-cee2a8ffe4f0	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0004	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0004.html", "size": 8072, "generated_at": "2025-11-12T04:17:58.258Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:17:58.382517	2025-11-12 04:17:58.382517
8adc6981-ad63-4578-89bf-f6a739d5f893	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0008	sales_order	773238c7-aed6-4049-8aa2-782df99182ba	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0008.html", "size": 11927, "generated_at": "2025-11-12T04:28:24.990Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:28:25.114688	2025-11-12 04:28:25.114688
4e2d5f09-94b4-4bf6-8ccd-61463846fe57	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0012	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0012.html", "size": 6995, "generated_at": "2025-11-12T04:40:35.001Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:40:35.125271	2025-11-12 04:40:35.125271
d2d5a8f5-19f6-4c4a-8ea4-5f9dfd15ed57	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0006	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0006.html", "size": 6645, "generated_at": "2025-11-12T04:41:58.975Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:41:59.095111	2025-11-12 04:41:59.095111
dac5ad47-95e6-4879-bfd6-6e7186bc510a	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0005	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0005.html", "size": 7757, "generated_at": "2025-11-12T04:43:03.001Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:43:03.107739	2025-11-12 04:43:03.107739
d9e57165-ec65-4d5d-b8e9-86714bd09268	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0005	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0005.html", "size": 8076, "generated_at": "2025-11-12T04:45:19.611Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:45:19.729886	2025-11-12 04:45:19.729886
8aa81058-4744-439f-a284-5d5551fa22f4	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0009	sales_order	4db87969-8444-49ea-af53-7f7f80fcd8b9	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0009.html", "size": 11922, "generated_at": "2025-11-12T04:48:07.553Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:48:07.688486	2025-11-12 04:48:07.688486
7cbcb24f-1436-467b-8031-6ac0405a04cd	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0013	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0013.html", "size": 7767, "generated_at": "2025-11-12T08:33:41.406Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:33:41.525575	2025-11-12 08:33:41.525575
67508efa-0771-4255-9c7c-ab423f5e2991	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0007	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0007.html", "size": 6641, "generated_at": "2025-11-12T08:35:47.847Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:35:47.96837	2025-11-12 08:35:47.96837
86fd970b-2e3b-4286-b43d-891d499264cc	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0006	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0006.html", "size": 7753, "generated_at": "2025-11-12T08:36:52.336Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:36:52.441798	2025-11-12 08:36:52.441798
05040701-93ea-487e-aafe-c0e04b450d20	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0006	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0006.html", "size": 9898, "generated_at": "2025-11-12T08:55:46.390Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:55:46.510147	2025-11-12 08:55:46.510147
4ee4cce4-3831-4ec4-9182-f22bcca0c40b	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0010	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0010.html", "size": 14335, "generated_at": "2025-11-12T08:59:05.951Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:59:06.068618	2025-11-12 08:59:06.068618
e4ca0367-2a97-486a-ad09-3e6d54949b6f	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	DELIVERY-2511-NORTH-0002	sales_order	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	{"html": {"path": "storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0002.html", "size": 11430, "generated_at": "2025-11-13T08:10:15.010Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:10:15.137062	2025-11-13 08:10:15.137062
f4d505b5-9705-4d5b-8c20-33fdccb74c44	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0014	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0014.html", "size": 6974, "generated_at": "2025-11-13T08:39:45.105Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:39:45.215073	2025-11-13 08:39:45.215073
4a81d612-4941-4aaf-add8-f9e517ff5d89	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0008	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0008.html", "size": 6644, "generated_at": "2025-11-13T08:40:20.306Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:40:20.432755	2025-11-13 08:40:20.432755
6bbb1668-f716-4a8a-8064-213c7104888f	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0007	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0007.html", "size": 7756, "generated_at": "2025-11-13T08:41:02.020Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:41:02.13097	2025-11-13 08:41:02.13097
85e195b1-60e6-4ae3-b86b-c4888b26ac70	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0007	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0007.html", "size": 8075, "generated_at": "2025-11-13T08:47:19.073Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:47:19.196594	2025-11-13 08:47:19.196594
709ca278-c5af-4780-aee3-3a33ccfd9172	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0011	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0011.html", "size": 11560, "generated_at": "2025-11-13T08:48:53.325Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:48:53.435145	2025-11-13 08:48:53.435145
85ace435-48d3-4c62-8e45-83b7a48d7280	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	DELIVERY-2511-NORTH-0003	sales_order	1f65dc4e-93ca-476c-8254-c8cd25cc574e	{"html": {"path": "storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0003.html", "size": 10359, "generated_at": "2025-11-13T08:50:08.314Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:50:08.462497	2025-11-13 08:50:08.462497
cc0e0225-1cf8-406f-8a1b-6d7c9b009e1c	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0015	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0015.html", "size": 6999, "generated_at": "2025-11-13T09:13:56.681Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:13:56.793603	2025-11-13 09:13:56.793603
aafc9d66-24a8-46a1-9da5-4da50bfaf4c9	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0009	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0009.html", "size": 6641, "generated_at": "2025-11-13T09:14:38.220Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:14:38.346773	2025-11-13 09:14:38.346773
2248b76f-a061-4c2a-b10f-efd9a32d9ddc	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0008	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0008.html", "size": 7753, "generated_at": "2025-11-13T09:15:26.189Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:15:26.299113	2025-11-13 09:15:26.299113
1c44b2ed-6a41-4242-86fe-56ab5f6c940f	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0008	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0008.html", "size": 8072, "generated_at": "2025-11-13T09:17:16.560Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:17:16.665667	2025-11-13 09:17:16.665667
bfc9a5e4-755a-41b4-aa27-11546a16516e	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0012	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0012.html", "size": 11580, "generated_at": "2025-11-13T09:18:43.698Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:18:43.854053	2025-11-13 09:18:43.854053
cd6aa7b2-b17b-4f09-bc0a-b024a28d8237	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	DELIVERY-2511-NORTH-0004	sales_order	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	{"html": {"path": "storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0004.html", "size": 10352, "generated_at": "2025-11-13T09:20:08.033Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:20:08.188632	2025-11-13 09:20:08.188632
288dbb7a-996d-4687-94de-fe6be9e03993	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0016	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0016.html", "size": 6564, "generated_at": "2025-11-13T09:55:23.087Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:55:23.201029	2025-11-13 09:55:23.201029
0f326f4c-9913-4978-80e4-d5dc73d16d33	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0010	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0010.html", "size": 6011, "generated_at": "2025-11-13T09:56:30.016Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:56:30.129899	2025-11-13 09:56:30.129899
3eb6fd80-2474-4195-aa9c-8f8801e0aa0b	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0009	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0009.html", "size": 6538, "generated_at": "2025-11-13T09:57:07.500Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:57:07.613805	2025-11-13 09:57:07.613805
d47cd34c-5507-4ec9-a479-5d39710e256d	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0009	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0009.html", "size": 7818, "generated_at": "2025-11-13T10:00:02.155Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:00:02.269116	2025-11-13 10:00:02.269116
7278f041-a72c-4599-a99d-1b6a0cd2dea4	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0013	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0013.html", "size": 11308, "generated_at": "2025-11-13T10:01:34.071Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:01:34.183142	2025-11-13 10:01:34.183142
7149a468-671d-4ab7-b33b-0e17df445770	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	DELIVERY-2511-NORTH-0005	sales_order	efb53562-d2e9-49a7-8ca8-364c8c760457	{"html": {"path": "storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0005.html", "size": 9823, "generated_at": "2025-11-13T10:02:47.643Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:02:47.757063	2025-11-13 10:02:47.757063
a245aaeb-75ab-4176-b93a-f6bf96a5b5aa	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0017	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0017.html", "size": 6566, "generated_at": "2025-11-13T10:19:38.242Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:19:38.347907	2025-11-13 10:19:38.347907
01c33517-bcf7-44ef-843f-33338db85af7	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0011	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0011.html", "size": 6016, "generated_at": "2025-11-13T10:20:19.898Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:20:20.017539	2025-11-13 10:20:20.017539
12f9f065-95de-49ff-ab0b-fa4d15c61d88	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0010	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0010.html", "size": 6543, "generated_at": "2025-11-13T10:21:14.221Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:21:14.324617	2025-11-13 10:21:14.324617
b98126e8-5633-4048-a67f-4326d8826019	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0010	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0010.html", "size": 7823, "generated_at": "2025-11-13T10:23:55.323Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:23:55.478014	2025-11-13 10:23:55.478014
ab2e7c0e-0b5b-4b2d-85ae-ff60bad9190f	8e017478-2f5f-4be3-b8b6-e389436ca28a	DELIVERY	DELIVERY-2511-NORTH-0006	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/deliveries/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/DELIVERY-2511-NORTH-0006.html", "size": 10784, "generated_at": "2025-11-13T10:27:11.113Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:27:11.269154	2025-11-13 10:27:11.269154
38123127-bf2d-40ec-824e-495e8e7ce344	8e017478-2f5f-4be3-b8b6-e389436ca28a	SHIP	SHIP-2511-DHL-0014	sales_order	76a1aa22-f63c-48f1-9d91-2edb698d6742	{"html": {"path": "storage/sales-order/ships/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/SHIP-2511-DHL-0014.html", "size": 11305, "generated_at": "2025-11-13T10:25:19.051Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:25:19.212683	2025-11-13 10:25:19.212683
260e9f24-1598-4f04-81f7-6c768412e585	8e017478-2f5f-4be3-b8b6-e389436ca28a	goods_receipt_note	GRN-2511-WH1-0002	purchase_order_receipt	0f404c14-2cc6-4ed2-9c27-fe009e2c6957	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/grn/2025/GRN-2511-WH1-0002.html", "size": 8041, "generated_at": "2025-11-13T10:31:41.079Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:31:33.957081	2025-11-13 10:31:33.957081
36e8d968-d063-4405-979e-da3f2c37949c	8e017478-2f5f-4be3-b8b6-e389436ca28a	PUTAWAY	PUTAWAY-2511-WH1-0001	receipt	0f404c14-2cc6-4ed2-9c27-fe009e2c6957	{"html": {"path": "storage/purchase-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/putaway/2025/PUTAWAY-2511-WH1-0001.html", "size": 6519, "mimeType": "text/html"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 11:03:58.49294	2025-11-13 11:03:58.49294
ca15845c-3a6c-4867-9571-40f46c3bd0ee	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0018	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0018.html", "size": 6564, "generated_at": "2025-11-14T02:04:30.672Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:04:30.777427	2025-11-14 02:04:30.777427
f260aabd-a3af-4156-a3a8-79cb0e20e80f	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0019	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0019.html", "size": 6552, "generated_at": "2025-11-14T02:05:11.105Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:05:11.212623	2025-11-14 02:05:11.212623
2b50103c-a5f9-4297-9206-4bc1aa6e6a6f	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0012	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0012.html", "size": 6014, "generated_at": "2025-11-14T02:06:14.836Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:06:14.944472	2025-11-14 02:06:14.944472
91486c2a-e3db-4a2b-902b-9048e68190da	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0013	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0013.html", "size": 6011, "generated_at": "2025-11-14T02:06:37.456Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:06:37.56353	2025-11-14 02:06:37.56353
dd696a99-7bb1-4af1-a746-591ae5d4a579	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0011	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0011.html", "size": 6541, "generated_at": "2025-11-14T02:07:05.311Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:07:05.436459	2025-11-14 02:07:05.436459
fafee2d1-06cc-420f-81ca-5d069526060b	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0012	sales_order	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0012.html", "size": 6538, "generated_at": "2025-11-14T02:07:28.379Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:07:28.485854	2025-11-14 02:07:28.485854
9a4e90fd-d625-413e-b533-f34b14a40a44	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0020	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0020.html", "size": 6564, "generated_at": "2025-11-14T02:16:26.410Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:16:26.556787	2025-11-14 02:16:26.556787
ff36fc55-38b3-463b-959d-bc46401bcc2a	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0021	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0021.html", "size": 6554, "generated_at": "2025-11-14T02:17:16.233Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:17:16.379245	2025-11-14 02:17:16.379245
fd084679-bef7-4a47-b42a-7d16e3bf0e2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0014	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0014.html", "size": 6011, "generated_at": "2025-11-14T02:17:53.190Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:17:53.307747	2025-11-14 02:17:53.307747
8472635e-ca83-45aa-82c6-8869e589072f	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0015	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0015.html", "size": 6015, "generated_at": "2025-11-14T02:18:17.287Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:18:17.410593	2025-11-14 02:18:17.410593
c65b9608-cb9b-428b-8ce0-45072b9b7230	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0013	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0013.html", "size": 6538, "generated_at": "2025-11-14T02:18:46.544Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:18:46.667433	2025-11-14 02:18:46.667433
b40aec9f-e2a4-4ff6-80de-b2a2a723b489	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0014	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0014.html", "size": 6542, "generated_at": "2025-11-14T02:20:11.421Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:20:11.539573	2025-11-14 02:20:11.539573
464dfe3e-1743-4b08-90d0-66c340683448	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0011	sales_order	0be43aa0-0e67-4329-8021-719c6aec65b4	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0011.html", "size": 7821, "generated_at": "2025-11-14T02:21:31.803Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:21:31.927719	2025-11-14 02:21:31.927719
4ec66e6b-77ec-4d54-a8fc-d1131c6177f7	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0012	sales_order	74e9c94c-13ea-4819-a948-524f40e2dbd2	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0012.html", "size": 7818, "generated_at": "2025-11-14T02:28:37.414Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:28:37.530691	2025-11-14 02:28:37.530691
03c1f1bb-e796-4a45-a291-c94d06b1f5d4	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0013	sales_order	dba473ab-546d-45ea-a2f5-b0e354d16684	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0013.html", "size": 7822, "generated_at": "2025-11-14T02:55:58.712Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:55:58.829795	2025-11-14 02:55:58.829795
74df2871-ecd2-4d3d-81bb-6678a6e9ef5b	8e017478-2f5f-4be3-b8b6-e389436ca28a	sales_order	SO-2511-NORTH-0022	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"html": {"path": "storage/sales-order/documents/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/so/2025/SO-2511-NORTH-0022.html", "size": 6552, "generated_at": "2025-11-14T02:56:51.950Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:56:52.05408	2025-11-14 02:56:52.05408
20704618-eaae-44f8-89f3-0ebbe82f379c	8e017478-2f5f-4be3-b8b6-e389436ca28a	allocation	ALLOC-2511-WH-0016	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"html": {"path": "storage/sales-order/allocations/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/ALLOC-2511-WH-0016.html", "size": 6014, "generated_at": "2025-11-14T02:57:30.496Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:57:30.614757	2025-11-14 02:57:30.614757
3f0fadbe-0003-4efa-a147-e075e1936764	8e017478-2f5f-4be3-b8b6-e389436ca28a	PICK	PICK-2511-WH1-0015	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"html": {"path": "storage/sales-order/picks/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PICK-2511-WH1-0015.html", "size": 6541, "generated_at": "2025-11-14T02:57:58.686Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:57:58.791225	2025-11-14 02:57:58.791225
485880b5-7f05-4658-8964-f879092cd6ac	8e017478-2f5f-4be3-b8b6-e389436ca28a	PACK	PACK-2511-WH1-0014	sales_order	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	{"html": {"path": "storage/sales-order/packs/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/PACK-2511-WH1-0014.html", "size": 7821, "generated_at": "2025-11-14T02:59:12.189Z"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:59:12.313403	2025-11-14 02:59:12.313403
15c4be43-d952-452f-8bf1-9c24477d8802	8e017478-2f5f-4be3-b8b6-e389436ca28a	ADJUSTMENT	STOCKADJ-2511-WH1-0003	adjustment	d2576d4c-b4c1-4ecf-915d-a10491e70fa4	{"html": {"path": "storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0003.html", "size": 8052, "generated_at": "2025-11-19T14:18:21.782Z"}, "metadata": {"type": "regular", "status": "approved", "totalItems": 2, "adjustmentNumber": "STOCKADJ-2511-WH1-0003"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:18:19.825123	2025-11-19 14:18:19.825123
a34fc510-a192-489d-9b67-d44562d781df	8e017478-2f5f-4be3-b8b6-e389436ca28a	ADJUSTMENT	STOCKADJ-2511-WH1-0004	adjustment	86d252f6-039b-46a1-b0a3-442ed8a8d8de	{"html": {"path": "storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0004.html", "size": 7493, "generated_at": "2025-11-19T14:27:28.284Z"}, "metadata": {"type": "regular", "status": "approved", "totalItems": 1, "adjustmentNumber": "STOCKADJ-2511-WH1-0004"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:27:26.777768	2025-11-19 14:27:26.777768
5de840a8-85c2-4487-91b2-7e38f0a929df	8e017478-2f5f-4be3-b8b6-e389436ca28a	ADJUSTMENT	STOCKADJ-2511-WH1-0005	adjustment	11f14712-9574-43f0-a9c2-8877d7a8900a	{"html": {"path": "storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0005.html", "size": 7561, "generated_at": "2025-11-19T14:31:02.344Z"}, "metadata": {"type": "regular", "status": "approved", "totalItems": 1, "adjustmentNumber": "STOCKADJ-2511-WH1-0005"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 14:31:00.762039	2025-11-19 14:31:00.762039
8b5a8d93-8de6-4ff5-90e8-55050b9360fd	8e017478-2f5f-4be3-b8b6-e389436ca28a	CYCCOUNT	CYCCOUNT-2511-WH1-0002	cycle_count	04a19822-ac4f-4421-b427-55a00d08e96c	{"html": {"path": "storage/inventory/cycle-count/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/CYCCOUNT-2511-WH1-0002.html", "size": 9363, "generated_at": "2025-11-19T15:47:18.418Z"}, "metadata": {"countType": "partial", "totalItems": 2, "countNumber": "CYCCOUNT-2511-WH1-0002", "itemsWithVariance": 1}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:47:16.460695	2025-11-19 15:47:16.460695
122141e2-13b7-41ca-8e58-44fb474f54f3	8e017478-2f5f-4be3-b8b6-e389436ca28a	ADJUSTMENT	STOCKADJ-2511-WH1-0006	adjustment	e35d0db6-bbbc-493e-a9b1-2f9c00799be6	{"html": {"path": "storage/inventory/adjustment/tenants/8e017478-2f5f-4be3-b8b6-e389436ca28a/2025/STOCKADJ-2511-WH1-0006.html", "size": 7581, "generated_at": "2025-11-19T15:47:23.081Z"}, "metadata": {"type": "cycle_count", "status": "created", "totalItems": 1, "adjustmentNumber": "STOCKADJ-2511-WH1-0006"}}	1	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-19 15:47:16.460695	2025-11-19 15:47:16.460695
\.


--
-- Data for Name: inventory_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.inventory_items (id, tenant_id, product_id, bin_id, available_quantity, reserved_quantity, expiry_date, batch_number, lot_number, received_date, cost_per_unit, created_at, updated_at) FROM stdin;
a0b29b7f-906c-4c94-8b10-d2d52c5fa607	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	fa169f29-c1cc-48fc-9c71-c41712b3a498	16	0	\N	\N	\N	2025-10-03	35.80	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
97152a94-74cb-40c9-935f-14c97501f643	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	9396e377-215e-4bb5-9942-089a93855011	52	0	\N	\N	\N	2025-10-06	36.33	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
a07e98ad-68df-41d7-b143-42eac79fa120	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	2003cb26-5a23-4db2-a061-412d9d6ee258	89	0	\N	\N	\N	2025-10-04	5.81	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
67c16e14-a332-4612-88c8-959acfe099fd	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	ae9fbd03-58bd-4599-bd7b-57300a67247a	83	0	\N	\N	\N	2025-10-16	39.32	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
59dbb4c1-1a4c-4eed-b698-cadfa7d1d65c	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	aac222bc-5159-4eb2-b1c1-525d3304bc53	110	0	\N	\N	\N	2025-10-04	22.22	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
0b853b75-320f-4a03-8c09-bdb7959f09ca	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	220520fd-0b86-407b-9521-63f342c47885	13	0	\N	\N	\N	2025-10-10	20.15	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
b726a5aa-cc7b-4d4c-abae-54d895635971	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	12548e32-edd5-49b8-a757-80c6c4196cee	67	0	\N	\N	\N	2025-10-09	8.52	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
ff9ed953-af6d-4ee2-80d1-67c396b15327	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	65d68866-6b17-4b3e-8756-52a8c0cad38e	39	0	\N	\N	\N	2025-10-11	51.04	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
896c1868-39d3-44ae-b232-ee6c2b041e83	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	a8c27a92-91c9-4dda-af12-b19a07133b23	99	0	\N	\N	\N	2025-10-13	28.22	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
a47efb9d-5dcd-497f-bbd7-d25a86a07307	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	d23d96e6-7346-4363-9b25-16655df1766d	95	0	\N	\N	\N	2025-10-15	31.28	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
536bf8f9-2760-4df7-9d83-42a8859ba046	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	aac222bc-5159-4eb2-b1c1-525d3304bc53	64	0	\N	\N	\N	2025-10-18	37.22	2025-10-21 10:48:08.860832	2025-10-21 10:48:08.860832
dd95263c-9000-4585-a03d-32c22c002bae	8e017478-2f5f-4be3-b8b6-e389436ca28a	4c03131a-ffe3-40fd-9ac8-c26189aa94a6	fa169f29-c1cc-48fc-9c71-c41712b3a498	50	0	\N	\N	\N	2025-10-29	60.00	2025-10-29 13:20:22.52205	2025-10-29 13:20:22.52205
e4d443e4-7984-402f-8d73-1f2625d40b10	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	fa169f29-c1cc-48fc-9c71-c41712b3a498	1	0	\N	\N	\N	2025-11-13	5.00	2025-11-13 11:03:58.49294	2025-11-13 11:03:58.49294
6b44dd9c-92ae-462b-a622-0c585b85d30e	8e017478-2f5f-4be3-b8b6-e389436ca28a	f7e708fe-ca3a-41d1-954b-cad17ae4b534	fa169f29-c1cc-48fc-9c71-c41712b3a498	20	20	\N	\N	\N	2025-10-29	50.00	2025-10-29 13:20:22.52205	2025-11-09 04:30:14.483
3d5dd90e-f254-4682-a4c4-4a651d693580	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	df65c0f4-2b6b-4381-bc59-c2e7c98b8962	-1	56	\N	\N	\N	2025-09-29	33.52	2025-10-21 10:48:08.860832	2025-11-12 04:14:28.019
b6064332-e55f-4267-9da8-5d6a60af6082	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	844dbca1-a1cf-424b-b8de-1715689d4de0	0	100	\N	\N	\N	2025-09-22	23.72	2025-10-21 10:48:08.860832	2025-11-09 05:28:56.075
dc987787-2f48-430c-8a6d-9a7e9907580a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	de79eb10-fb8d-4c5c-8a54-0fa57cfa85b1	0	14	\N	\N	\N	2025-09-22	39.53	2025-10-21 10:48:08.860832	2025-11-09 05:28:56.989
6836222a-3b52-4835-bcea-4b3383ac5b88	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	fa169f29-c1cc-48fc-9c71-c41712b3a498	0	46	\N	\N	\N	2025-09-27	42.93	2025-10-21 10:48:08.860832	2025-11-10 07:07:28.567
0c2a72d8-80cf-450a-b1a9-445d9869c86e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	dcec4544-efd0-422f-b368-9ba6acaf1e5c	31	0	\N	\N	\N	2025-10-02	48.69	2025-10-21 10:48:08.860832	2025-11-14 02:57:51.94
16ccfb36-6851-4156-ab2e-a15de9028958	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	9396e377-215e-4bb5-9942-089a93855011	0	50	\N	\N	\N	2025-10-01	53.19	2025-10-21 10:48:08.860832	2025-11-12 04:42:53.504
dc729873-5d8c-47c1-8e5a-35979188bf5f	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	ae9fbd03-58bd-4599-bd7b-57300a67247a	80	0	\N	\N	\N	2025-10-02	30.91	2025-10-21 10:48:08.860832	2025-11-19 14:18:20.863
3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	8e017478-2f5f-4be3-b8b6-e389436ca28a	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2003cb26-5a23-4db2-a061-412d9d6ee258	35	54	\N	\N	\N	2025-09-25	41.04	2025-10-21 10:48:08.860832	2025-11-19 14:31:01.37
4a977db2-8e8f-417e-886f-4d862be115bd	8e017478-2f5f-4be3-b8b6-e389436ca28a	4ff81248-f3b0-450d-a0f5-d666d7256399	6480201e-c617-4fce-a6ed-b4ea05c718f0	-3	0	\N	\N	\N	2025-09-29	33.79	2025-10-21 10:48:08.860832	2025-11-12 02:19:23.217
d8b0a093-2d83-4561-aafb-dfcc6560a763	caa7a5cb-6029-47e9-b60a-aa213dfdfb58	b33f6e3e-5c16-4617-816e-7ca81b158433	fa169f29-c1cc-48fc-9c71-c41712b3a498	500	0	\N	\N	\N	2025-10-22	\N	2025-10-22 08:10:50.389494	2025-10-22 08:10:50.389494
\.


--
-- Data for Name: package_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.package_items (id, tenant_id, package_id, product_id, quantity, created_at, updated_at, sales_order_item_id) FROM stdin;
a6a455a5-3c5e-4031-b487-460f7295d160	8e017478-2f5f-4be3-b8b6-e389436ca28a	576eb6b4-8576-4c6b-91a0-da9034864bb6	f7e708fe-ca3a-41d1-954b-cad17ae4b534	5.000	2025-11-09 02:36:10.746832	2025-11-09 02:36:10.746832	feec7bc1-94cc-426a-b211-523caece6ad1
9b8d936f-67f2-4e0e-b8ad-b66247466afe	8e017478-2f5f-4be3-b8b6-e389436ca28a	8a34132a-b543-4c47-8758-6f9dbf285324	f7e708fe-ca3a-41d1-954b-cad17ae4b534	5.000	2025-11-09 02:36:11.734899	2025-11-09 02:36:11.734899	feec7bc1-94cc-426a-b211-523caece6ad1
1d26c555-30c5-4e2d-8c6c-0dc375547abe	8e017478-2f5f-4be3-b8b6-e389436ca28a	09cc2e1b-6a6d-4db8-a937-5250413bc6a4	8cb6b866-53e5-4d79-b902-f4b0d56fd705	10.000	2025-11-10 07:10:59.731226	2025-11-10 07:10:59.731226	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96
2c4dfe29-55e5-4c13-872c-6ed7078d8ff6	8e017478-2f5f-4be3-b8b6-e389436ca28a	09cc2e1b-6a6d-4db8-a937-5250413bc6a4	4ff81248-f3b0-450d-a0f5-d666d7256399	10.000	2025-11-10 07:11:00.214774	2025-11-10 07:11:00.214774	4fc78d91-7487-4e82-98be-3c390e14761a
566b2eb5-4d1c-4023-9f67-b516b9bdab2b	8e017478-2f5f-4be3-b8b6-e389436ca28a	0e8b2f0d-a97c-4fb0-b414-97c4d3ae0bc6	8cb6b866-53e5-4d79-b902-f4b0d56fd705	10.000	2025-11-10 07:11:01.159242	2025-11-10 07:11:01.159242	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96
b4247c27-4719-460c-80b4-7e7d462e31d6	8e017478-2f5f-4be3-b8b6-e389436ca28a	0e8b2f0d-a97c-4fb0-b414-97c4d3ae0bc6	4ff81248-f3b0-450d-a0f5-d666d7256399	10.000	2025-11-10 07:11:01.630867	2025-11-10 07:11:01.630867	4fc78d91-7487-4e82-98be-3c390e14761a
b5f6358c-479a-44c9-86cb-4497d3acf4d6	8e017478-2f5f-4be3-b8b6-e389436ca28a	18eed184-fa0a-4522-9884-6f3780f8e4c0	8cb6b866-53e5-4d79-b902-f4b0d56fd705	5.000	2025-11-12 02:20:58.301911	2025-11-12 02:20:58.301911	57791718-f3e0-4042-82ab-721bb8246e14
9a998e9e-6716-4134-92fe-10a723f2a229	8e017478-2f5f-4be3-b8b6-e389436ca28a	62b902dd-33e8-4c30-a17f-9003a86f3b54	4ff81248-f3b0-450d-a0f5-d666d7256399	5.000	2025-11-12 02:20:59.293251	2025-11-12 02:20:59.293251	95d2bfb1-a763-4ba9-96c5-e2e68101df9f
ee6ab029-2704-4d58-8425-eac9ca7d0234	8e017478-2f5f-4be3-b8b6-e389436ca28a	553f5248-b23b-45e2-852d-29f0afc396dc	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2.000	2025-11-12 04:17:22.384793	2025-11-12 04:17:22.384793	4711e0ed-0648-46db-b973-0cb6aec04df4
40495082-79f6-492e-b2d2-b008c5374da3	8e017478-2f5f-4be3-b8b6-e389436ca28a	553f5248-b23b-45e2-852d-29f0afc396dc	4ff81248-f3b0-450d-a0f5-d666d7256399	2.000	2025-11-12 04:17:22.864272	2025-11-12 04:17:22.864272	c9af996f-3cd5-468d-8635-00af763a8885
7798afec-3ba2-4909-94d5-1a752d12531b	8e017478-2f5f-4be3-b8b6-e389436ca28a	c1b7d8a6-dce0-4bc2-9b20-44cfca92d8de	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	2025-11-12 04:44:44.732136	2025-11-12 04:44:44.732136	3821f93e-f28c-4d10-940f-101bf71a273f
b28c2813-7af5-491a-a6d7-22f90eaf7632	8e017478-2f5f-4be3-b8b6-e389436ca28a	c1b7d8a6-dce0-4bc2-9b20-44cfca92d8de	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-12 04:44:45.263466	2025-11-12 04:44:45.263466	5fe3f1b9-68ec-4725-a159-e9757a9aa636
4162238b-dc0e-4e3a-8cc2-548b8396341f	8e017478-2f5f-4be3-b8b6-e389436ca28a	6229be6b-b810-4bf0-b23b-3771acc4f696	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	2025-11-12 08:38:55.527609	2025-11-12 08:38:55.527609	5036138f-6147-4758-91d8-c7c8510ae5d7
27f56658-c4c5-4da3-be4c-608f7326ac1c	8e017478-2f5f-4be3-b8b6-e389436ca28a	6229be6b-b810-4bf0-b23b-3771acc4f696	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-12 08:38:56.012969	2025-11-12 08:38:56.012969	bf0111ea-d94a-4645-8ae4-fb116600b1c7
57de0abc-c5a9-479c-8ba2-5b698c2da0c4	8e017478-2f5f-4be3-b8b6-e389436ca28a	c50a650d-fc8c-4a49-b757-742f4043d4e2	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	2025-11-12 08:38:56.958158	2025-11-12 08:38:56.958158	5036138f-6147-4758-91d8-c7c8510ae5d7
c0070970-539c-43b6-ac39-1448fa1f6b91	8e017478-2f5f-4be3-b8b6-e389436ca28a	c50a650d-fc8c-4a49-b757-742f4043d4e2	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-12 08:38:57.430011	2025-11-12 08:38:57.430011	bf0111ea-d94a-4645-8ae4-fb116600b1c7
cd5d6011-e23f-45e1-82e2-b05de6a742e9	8e017478-2f5f-4be3-b8b6-e389436ca28a	c3e91b70-b3bc-4acf-85bd-3ab775b2a2a0	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	2025-11-13 08:42:25.530845	2025-11-13 08:42:25.530845	55b46f69-1aa1-4241-bfa6-17de98965aaa
545c46a8-b37a-4b36-95cf-381ba5c69e76	8e017478-2f5f-4be3-b8b6-e389436ca28a	c3e91b70-b3bc-4acf-85bd-3ab775b2a2a0	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-13 08:42:26.09024	2025-11-13 08:42:26.09024	c24461d7-bad1-4ccd-a726-7f596d81490c
d6a73c69-10c9-4da8-a455-ecedf77adb44	8e017478-2f5f-4be3-b8b6-e389436ca28a	0d49f037-6021-4e5f-8c60-8426c2e51e5f	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	2025-11-13 09:16:25.248652	2025-11-13 09:16:25.248652	dc5982bf-8262-4978-9fef-2f1fbfbd8944
69dd1457-0f83-4966-9ab7-c46743b8c095	8e017478-2f5f-4be3-b8b6-e389436ca28a	0d49f037-6021-4e5f-8c60-8426c2e51e5f	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-13 09:16:25.734816	2025-11-13 09:16:25.734816	10e63015-88f4-4144-9420-a74ef29016e8
9af6d7e4-3dff-4891-b44a-e202ef7ddf92	8e017478-2f5f-4be3-b8b6-e389436ca28a	8734fa96-abfc-4d4a-ad41-2ed0c5a9b763	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-13 09:59:15.890994	2025-11-13 09:59:15.890994	0ebd39cb-c1f5-49ac-9bee-8e034b118b20
b63cd5ac-7034-4be6-84d6-457a16a05a80	8e017478-2f5f-4be3-b8b6-e389436ca28a	3e4e730a-028b-4755-b590-a4e1396d8e66	4ff81248-f3b0-450d-a0f5-d666d7256399	3.000	2025-11-13 10:22:26.090578	2025-11-13 10:22:26.090578	93d54581-ca0a-4e5f-ab51-f5bd71d116e8
ffd4de93-48d5-4082-8d37-8dcbfea12f1e	8e017478-2f5f-4be3-b8b6-e389436ca28a	1f7b91af-4e75-44df-bb36-b3ab925efb17	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-14 02:08:23.754054	2025-11-14 02:08:23.754054	d3c373b3-d65b-45b9-8708-f00ba16afd98
86d07aca-355b-4ad7-b4e5-f6b356f53aec	8e017478-2f5f-4be3-b8b6-e389436ca28a	f4a3f0dd-fffd-4467-92f4-2fe4b9762a0c	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-14 02:22:20.797487	2025-11-14 02:22:20.797487	ec7efa1c-410f-489e-b297-e4ec797b8145
545e6262-f591-490b-a680-7dd780593768	8e017478-2f5f-4be3-b8b6-e389436ca28a	ebbe60b6-a0f0-4940-a909-ab9656adaf56	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-14 02:29:24.896708	2025-11-14 02:29:24.896708	ff8be314-eef3-464e-99c4-95c45c256517
e9eb6527-a1b5-4144-8052-1324f2aa4b35	8e017478-2f5f-4be3-b8b6-e389436ca28a	c455873d-6f45-41d4-b3ce-967cd3bb2c5b	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-14 02:55:38.539404	2025-11-14 02:55:38.539404	80e74f61-d016-4820-ab46-32ec9011d4ee
bbbcdde6-0684-4da9-9660-4cf3b0931427	8e017478-2f5f-4be3-b8b6-e389436ca28a	a5d52867-c2d0-4a74-bb63-415e16289bca	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	2025-11-14 02:58:51.718539	2025-11-14 02:58:51.718539	48a78aee-8668-4121-8dc6-93f3deed213f
\.


--
-- Data for Name: package_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.package_types (id, tenant_id, name, description, units_per_package, barcode, dimensions, weight, is_active, created_at, updated_at) FROM stdin;
9551e6f7-43b0-47f5-a161-fcce8dfb44e8	8e017478-2f5f-4be3-b8b6-e389436ca28a	Carton Box	Standard carton box for shipping	24	PKG-CARTON-001	40x30x30 cm	0.500	t	2025-10-21 11:37:54.191206	2025-10-21 11:37:54.191206
979c58f1-a54d-45c9-be17-366048fc5259	8e017478-2f5f-4be3-b8b6-e389436ca28a	Pallet	Standard wooden pallet	100	PKG-PALLET-001	120x100x15 cm	25.000	t	2025-10-21 11:37:54.191206	2025-10-21 11:37:54.191206
0ab5273b-3a8b-4503-be14-aedadbc62929	8e017478-2f5f-4be3-b8b6-e389436ca28a	Small Box	Small packaging box	12	PKG-SMALL-001	20x15x10 cm	0.200	t	2025-10-21 11:37:54.191206	2025-10-21 11:37:54.191206
b0fc8e48-5101-4b5b-9bd8-3a08a6ea83c0	8e017478-2f5f-4be3-b8b6-e389436ca28a	Bulk Container	Large bulk storage container	500	PKG-BULK-001	200x100x100 cm	50.000	t	2025-10-21 11:37:54.191206	2025-10-21 11:37:54.191206
\.


--
-- Data for Name: packages; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.packages (id, tenant_id, shipment_id, package_number, barcode, weight, length, width, height, volume, notes, created_at, updated_at, sales_order_id, package_id) FROM stdin;
576eb6b4-8576-4c6b-91a0-da9034864bb6	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0003-001	\N	50.000	500.00	500.00	100.00	\N	\N	2025-11-09 02:36:10.253471	2025-11-09 02:36:10.253471	089902ea-9c3d-41ee-a9e6-25520780d2b0	PKG-SO-2511-NORTH-0003-001
8a34132a-b543-4c47-8758-6f9dbf285324	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0003-002	\N	50.000	500.00	500.00	100.00	\N	\N	2025-11-09 02:36:11.240067	2025-11-09 02:36:11.240067	089902ea-9c3d-41ee-a9e6-25520780d2b0	PKG-SO-2511-NORTH-0003-002
09cc2e1b-6a6d-4db8-a937-5250413bc6a4	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0008-001	\N	10.000	100.00	100.00	100.00	\N	\N	2025-11-10 07:10:59.245213	2025-11-10 07:10:59.245213	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	PKG-SO-2511-NORTH-0008-001
0e8b2f0d-a97c-4fb0-b414-97c4d3ae0bc6	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0008-002	\N	10.000	100.00	100.00	100.00	\N	\N	2025-11-10 07:11:00.688053	2025-11-10 07:11:00.688053	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	PKG-SO-2511-NORTH-0008-002
18eed184-fa0a-4522-9884-6f3780f8e4c0	8e017478-2f5f-4be3-b8b6-e389436ca28a	b1adf5da-3a11-46e8-8e85-452e150d8bc0	PKG-SO-2511-NORTH-0010-001	\N	5.000	50.00	50.00	50.00	\N	\N	2025-11-12 02:20:57.803567	2025-11-12 02:20:57.803567	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	PKG-SO-2511-NORTH-0010-001
62b902dd-33e8-4c30-a17f-9003a86f3b54	8e017478-2f5f-4be3-b8b6-e389436ca28a	b1adf5da-3a11-46e8-8e85-452e150d8bc0	PKG-SO-2511-NORTH-0010-002	\N	5.000	50.00	50.00	50.00	\N	\N	2025-11-12 02:20:58.799734	2025-11-12 02:20:58.799734	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	PKG-SO-2511-NORTH-0010-002
553f5248-b23b-45e2-852d-29f0afc396dc	8e017478-2f5f-4be3-b8b6-e389436ca28a	f3b7a96a-026c-4db9-8c30-cb78f125be2b	PKG-SO-2511-NORTH-0011-001	\N	4.000	40.00	40.00	40.00	\N	\N	2025-11-12 04:17:21.920277	2025-11-12 04:17:21.920277	773238c7-aed6-4049-8aa2-782df99182ba	PKG-SO-2511-NORTH-0011-001
c1b7d8a6-dce0-4bc2-9b20-44cfca92d8de	8e017478-2f5f-4be3-b8b6-e389436ca28a	378ff23f-3084-47c2-9f8d-301012502049	PKG-SO-2511-NORTH-0012-001	\N	2.000	20.00	20.00	20.00	\N	\N	2025-11-12 04:44:44.203301	2025-11-12 04:44:44.203301	4db87969-8444-49ea-af53-7f7f80fcd8b9	PKG-SO-2511-NORTH-0012-001
6229be6b-b810-4bf0-b23b-3771acc4f696	8e017478-2f5f-4be3-b8b6-e389436ca28a	dae70b8b-b5b6-45a9-baff-f8e7883d0a2f	PKG-SO-2511-NORTH-0013-001	\N	2.000	20.00	20.00	20.00	\N	\N	2025-11-12 08:38:54.606509	2025-11-12 08:38:54.606509	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	PKG-SO-2511-NORTH-0013-001
c50a650d-fc8c-4a49-b757-742f4043d4e2	8e017478-2f5f-4be3-b8b6-e389436ca28a	dae70b8b-b5b6-45a9-baff-f8e7883d0a2f	PKG-SO-2511-NORTH-0013-002	\N	2.000	20.00	20.00	20.00	\N	\N	2025-11-12 08:38:56.484658	2025-11-12 08:38:56.484658	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	PKG-SO-2511-NORTH-0013-002
c3e91b70-b3bc-4acf-85bd-3ab775b2a2a0	8e017478-2f5f-4be3-b8b6-e389436ca28a	2651a23c-b1a8-4601-b09e-c78982d72ff6	PKG-SO-2511-NORTH-0014-001	\N	2.000	20.00	20.00	20.00	\N	\N	2025-11-13 08:42:24.928145	2025-11-13 08:42:24.928145	1f65dc4e-93ca-476c-8254-c8cd25cc574e	PKG-SO-2511-NORTH-0014-001
0d49f037-6021-4e5f-8c60-8426c2e51e5f	8e017478-2f5f-4be3-b8b6-e389436ca28a	342f6ef4-2719-48f1-bfad-6825deed9284	PKG-SO-2511-NORTH-0015-001	\N	2.000	20.00	20.00	20.00	\N	\N	2025-11-13 09:16:24.773732	2025-11-13 09:16:24.773732	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	PKG-SO-2511-NORTH-0015-001
8734fa96-abfc-4d4a-ad41-2ed0c5a9b763	8e017478-2f5f-4be3-b8b6-e389436ca28a	57939ebe-dedc-40d8-8949-755eff5345ce	PKG-SO-2511-NORTH-0016-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-13 09:59:15.40054	2025-11-13 09:59:15.40054	efb53562-d2e9-49a7-8ca8-364c8c760457	PKG-SO-2511-NORTH-0016-001
3e4e730a-028b-4755-b590-a4e1396d8e66	8e017478-2f5f-4be3-b8b6-e389436ca28a	cb39e6ba-d84a-40f4-9610-5f5d9dd61f52	PKG-SO-2511-NORTH-0017-001	\N	3.000	30.00	30.00	30.00	\N	\N	2025-11-13 10:22:25.615132	2025-11-13 10:22:25.615132	76a1aa22-f63c-48f1-9d91-2edb698d6742	PKG-SO-2511-NORTH-0017-001
1f7b91af-4e75-44df-bb36-b3ab925efb17	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0019-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-14 02:08:23.273143	2025-11-14 02:08:23.273143	0be43aa0-0e67-4329-8021-719c6aec65b4	PKG-SO-2511-NORTH-0019-001
f4a3f0dd-fffd-4467-92f4-2fe4b9762a0c	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0021-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-14 02:22:20.318726	2025-11-14 02:22:20.318726	74e9c94c-13ea-4819-a948-524f40e2dbd2	PKG-SO-2511-NORTH-0021-001
ebbe60b6-a0f0-4940-a909-ab9656adaf56	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0018-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-14 02:29:24.411809	2025-11-14 02:29:24.411809	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	PKG-SO-2511-NORTH-0018-001
c455873d-6f45-41d4-b3ce-967cd3bb2c5b	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0020-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-14 02:55:38.056924	2025-11-14 02:55:38.056924	dba473ab-546d-45ea-a2f5-b0e354d16684	PKG-SO-2511-NORTH-0020-001
a5d52867-c2d0-4a74-bb63-415e16289bca	8e017478-2f5f-4be3-b8b6-e389436ca28a	\N	PKG-SO-2511-NORTH-0022-001	\N	1.000	10.00	10.00	10.00	\N	\N	2025-11-14 02:58:51.248756	2025-11-14 02:58:51.248756	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	PKG-SO-2511-NORTH-0022-001
\.


--
-- Data for Name: product_types; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.product_types (id, tenant_id, name, description, category, is_active, created_at, updated_at) FROM stdin;
965ce49a-cb96-4883-b09a-6e928d1bda0e	8e017478-2f5f-4be3-b8b6-e389436ca28a	Electronics	Electronic items and components	Technology	t	2025-10-21 11:37:51.002784	2025-10-21 11:37:51.002784
df6d93bb-bee6-4e1e-b365-25bd7f8fd749	8e017478-2f5f-4be3-b8b6-e389436ca28a	Perishables	Food and perishable goods	Food	t	2025-10-21 11:37:51.002784	2025-10-21 11:37:51.002784
75f57226-e697-40f0-a74f-de5b74ab1644	8e017478-2f5f-4be3-b8b6-e389436ca28a	Clothing	Apparel and textile products	Fashion	t	2025-10-21 11:37:51.002784	2025-10-21 11:37:51.002784
6d5e0151-7d16-4c74-a807-a06ed6046b87	8e017478-2f5f-4be3-b8b6-e389436ca28a	Industrial Parts	Machine parts and industrial components	Manufacturing	t	2025-10-21 11:37:51.002784	2025-10-21 11:37:51.002784
d8a37471-d8aa-4de2-881d-14f1992daed7	8e017478-2f5f-4be3-b8b6-e389436ca28a	Pharmaceuticals	Medical and pharmaceutical products	Healthcare	t	2025-10-21 11:37:51.002784	2025-10-21 11:37:51.002784
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.products (id, tenant_id, inventory_type_id, package_type_id, sku, name, description, minimum_stock_level, reorder_point, required_temperature_min, required_temperature_max, weight, dimensions, active, has_expiry_date, created_at, updated_at) FROM stdin;
4ff81248-f3b0-450d-a0f5-d666d7256399	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	ELECT-001	Wireless Mouse - Ergonomic	High-precision wireless mouse with ergonomic design	50	100	\N	\N	0.150	12x7x4 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:38:48.565581
8cb6b866-53e5-4d79-b902-f4b0d56fd705	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	ELECT-002	USB-C Hub - 7 Port	7-port USB-C hub with power delivery	30	60	\N	\N	0.200	10x5x2 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:38:48.565581
ef6ce9ce-d19c-409c-8ef1-a640d46856d6	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	ELECT-003	LED Monitor 27"	27-inch LED monitor, 4K resolution	10	20	\N	\N	5.500	61x46x18 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:38:48.565581
b90148b0-8777-4b1c-b612-499b1d8b3a8c	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	ELECT-004	Mechanical Keyboard - RGB	Full-size mechanical keyboard with RGB lighting	25	50	\N	\N	1.200	44x13x4 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:38:48.565581
480c18ba-011b-477d-a187-7ee358676a05	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	ELECT-005	Webcam HD 1080p	HD webcam with built-in microphone	40	80	\N	\N	0.180	9x7x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:38:48.565581
f7e708fe-ca3a-41d1-954b-cad17ae4b534	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	979c58f1-a54d-45c9-be17-366048fc5259	FURN-001	Office Chair - Executive	Ergonomic executive office chair with lumbar support	5	15	\N	\N	18.000	65x65x120 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
4c03131a-ffe3-40fd-9ac8-c26189aa94a6	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	979c58f1-a54d-45c9-be17-366048fc5259	FURN-002	Standing Desk - Adjustable	Electric height-adjustable standing desk	3	10	\N	\N	35.000	160x80x75 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
038dbd33-9575-4aaa-814c-5b4003ed8338	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	979c58f1-a54d-45c9-be17-366048fc5259	FURN-003	Filing Cabinet - 4 Drawer	4-drawer metal filing cabinet with lock	8	20	\N	\N	25.000	46x62x132 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
c3a42e04-15e5-463f-b48f-54096364a8cb	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	0ab5273b-3a8b-4503-be14-aedadbc62929	SUPP-001	Printer Paper - A4 Ream	500 sheets premium white A4 paper	200	400	\N	\N	2.500	30x21x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
b871341b-61af-4097-9eb9-84318e309bb6	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	0ab5273b-3a8b-4503-be14-aedadbc62929	SUPP-002	Ballpoint Pens - Box of 50	Blue ink ballpoint pens, medium point	100	200	\N	\N	0.750	20x15x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
67ad0087-6bfc-45b1-9aaf-5711dbe50f87	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	0ab5273b-3a8b-4503-be14-aedadbc62929	SUPP-003	Sticky Notes - Pack of 12	Assorted colors, 3x3 inch sticky notes	150	300	\N	\N	0.400	15x8x8 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
9c179ae1-c33c-40ce-87f1-7fdca6a973a2	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	0ab5273b-3a8b-4503-be14-aedadbc62929	SUPP-004	Stapler - Heavy Duty	Heavy-duty stapler, 100-sheet capacity	60	120	\N	\N	0.850	20x8x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
a4043b1b-9887-4bf1-b08b-dbb7f2eadc99	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	0ab5273b-3a8b-4503-be14-aedadbc62929	SUPP-005	File Folders - Letter Size Box	Box of 100 manila file folders	80	160	\N	\N	3.200	35x25x10 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
85abd327-a2ec-48e5-9e91-a47ac967f8d5	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	TECH-001	HDMI Cable - 6ft	High-speed HDMI 2.1 cable, 6 feet	100	200	\N	\N	0.120	20x15x3 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
74f591f4-e688-4480-b88f-242cbcaf4cbe	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	TECH-002	Power Strip - 10 Outlet	10-outlet surge protector power strip	50	100	\N	\N	1.500	45x8x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
ff03808b-08ba-46b8-9a7e-f80f8df78fab	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	TECH-003	External SSD - 1TB	Portable 1TB SSD with USB-C	20	40	\N	\N	0.080	10x6x1 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
83f36cb3-ee4e-445e-ba69-e21236e2d602	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	TECH-004	Wireless Charger Pad	Qi-compatible wireless charging pad	70	140	\N	\N	0.150	10x10x1 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
49f45543-0961-45b3-9eea-1998b8260baa	8e017478-2f5f-4be3-b8b6-e389436ca28a	965ce49a-cb96-4883-b09a-6e928d1bda0e	0ab5273b-3a8b-4503-be14-aedadbc62929	TECH-005	Bluetooth Speaker - Portable	Waterproof portable Bluetooth speaker	35	70	\N	\N	0.600	18x7x7 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
6e338b6f-b19f-4df3-90f4-a26f16536b27	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	SAFE-001	Safety Goggles - Pack of 10	Clear safety goggles, anti-fog	50	100	\N	\N	0.800	25x20x10 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
1e959d63-5c67-4618-ba49-ec27644e323b	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	SAFE-002	Work Gloves - Pair	Heavy-duty work gloves, size L	120	240	\N	\N	0.250	12x8x3 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
aece63dc-2bd0-46d6-b86a-c09f61be9800	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	SAFE-003	First Aid Kit - Complete	Complete workplace first aid kit	25	50	\N	\N	2.000	30x20x10 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
f0217449-1774-4206-97e0-601b6ab81e26	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	SAFE-004	Hard Hat - Adjustable	OSHA-compliant adjustable hard hat	60	120	\N	\N	0.400	28x25x15 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
35f8f592-9886-432e-bf54-cbc4d6f6aa2e	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	SAFE-005	Safety Vest - High Visibility	Reflective high-visibility safety vest	90	180	\N	\N	0.300	30x25x5 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
149d53dc-8ac1-4cef-a225-745b6a5551e7	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	DESK-001	Desk Lamp - LED	Adjustable LED desk lamp with USB charging	40	80	\N	\N	1.200	40x15x10 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
8bcd46c7-9297-4a53-bc12-9a3fee670a62	8e017478-2f5f-4be3-b8b6-e389436ca28a	6d5e0151-7d16-4c74-a807-a06ed6046b87	9551e6f7-43b0-47f5-a161-fcce8dfb44e8	DESK-002	Monitor Stand - Adjustable	Ergonomic monitor stand with storage drawer	30	60	\N	\N	2.500	50x25x12 cm	t	f	2025-10-21 10:36:53.219281	2025-10-21 11:39:43.517205
b33f6e3e-5c16-4617-816e-7ca81b158433	caa7a5cb-6029-47e9-b60a-aa213dfdfb58	\N	\N	TENANT2-SKU-001	Test Product for Tenant 2	\N	10	\N	\N	\N	\N	\N	t	f	2025-10-22 08:10:34.833308	2025-10-22 08:10:34.833308
\.


--
-- Data for Name: purchase_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_order_items (id, purchase_order_id, product_id, tenant_id, ordered_quantity, received_quantity, unit_cost, total_cost, expected_expiry_date, notes, created_at, updated_at) FROM stdin;
b4e96f29-4aa6-4d4a-88a8-24e37aa3c591	8560794d-7e1b-4ba5-b607-0cfaa598cc00	4ff81248-f3b0-450d-a0f5-d666d7256399	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	0	2.00	100.00	\N	\N	2025-10-26 02:48:25.233245	2025-10-26 02:48:25.233245
8a6f3b46-5270-4ebf-a5ce-21f232976578	8560794d-7e1b-4ba5-b607-0cfaa598cc00	149d53dc-8ac1-4cef-a225-745b6a5551e7	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	0	5.00	500.00	\N	\N	2025-10-26 02:48:25.233245	2025-10-26 02:48:25.233245
5dd482b0-9d59-4153-aa77-143dd41c59a7	8560794d-7e1b-4ba5-b607-0cfaa598cc00	8bcd46c7-9297-4a53-bc12-9a3fee670a62	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	0	50.00	2500.00	\N	\N	2025-10-26 02:48:25.233245	2025-10-26 02:48:25.233245
9b9b7981-a15c-4ba1-b1c5-67ffdb177392	22104b29-d3d1-4131-bb78-76933c076f60	4c03131a-ffe3-40fd-9ac8-c26189aa94a6	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	50	60.00	3000.00	\N	\N	2025-10-26 11:18:24.973087	2025-10-28 04:42:55.135
e9096afe-6131-4338-ae15-b91d6eaea907	d49945db-3965-47a0-887f-00919842d45f	149d53dc-8ac1-4cef-a225-745b6a5551e7	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	0	2.50	250.00	\N	\N	2025-10-30 01:28:00.137525	2025-10-30 01:28:00.137525
a6a00889-b253-4063-b950-ae601d28476b	61423a15-574d-40b1-8d9c-11c888ecaf8d	8bcd46c7-9297-4a53-bc12-9a3fee670a62	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	0	50.00	5000.00	\N	\N	2025-10-30 01:56:39.403241	2025-10-30 01:56:39.403241
7fe41804-2df1-42d5-86aa-183595fa412b	8f0d475e-f727-4c8f-a1e9-7ebc3d870ca3	ef6ce9ce-d19c-409c-8ef1-a640d46856d6	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	0	80.00	8000.00	\N	\N	2025-10-30 02:07:26.871781	2025-10-30 02:07:26.871781
0f856e46-b343-4e8c-87ee-37609f7dbc5a	8a143b8d-7e64-4e1f-b58c-9165a79060bc	b90148b0-8777-4b1c-b612-499b1d8b3a8c	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	0	40.00	4000.00	\N	\N	2025-10-30 04:25:18.437659	2025-10-30 04:25:18.437659
7d9c9dbc-41f1-4639-9e56-1f3f1e21bd14	3189b935-c1c6-45b3-b13c-c17912e12a92	f0217449-1774-4206-97e0-601b6ab81e26	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	100	20.00	2000.00	\N	\N	2025-10-26 12:49:55.962114	2025-10-30 09:18:41.86
624164a5-7c06-4f1b-9cff-aae05075532f	3189b935-c1c6-45b3-b13c-c17912e12a92	aece63dc-2bd0-46d6-b86a-c09f61be9800	8e017478-2f5f-4be3-b8b6-e389436ca28a	100	95	5.00	500.00	\N	\N	2025-10-26 12:49:55.962114	2025-11-06 05:00:41.616
4195cd0e-3555-480e-881f-0e97ce235e5f	80371d32-8e5f-4d49-bf34-e520f10c2c77	4ff81248-f3b0-450d-a0f5-d666d7256399	8e017478-2f5f-4be3-b8b6-e389436ca28a	1	1	5.00	5.00	\N	1  rusak	2025-11-13 10:27:00.74856	2025-11-13 10:31:34.579
92c94681-9081-445f-9526-9190bbb3ef1a	22104b29-d3d1-4131-bb78-76933c076f60	f7e708fe-ca3a-41d1-954b-cad17ae4b534	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	50	50.00	2500.00	\N	\N	2025-10-26 11:18:24.973087	2025-10-28 04:42:54.201
\.


--
-- Data for Name: purchase_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_orders (id, tenant_id, order_number, supplier_id, supplier_location_id, status, workflow_state, order_date, expected_delivery_date, total_amount, notes, created_by, created_at, updated_at, warehouse_id, delivery_method, is_return) FROM stdin;
80371d32-8e5f-4d49-bf34-e520f10c2c77	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-return-SO-2511-NORTH-0017-13112025	\N	\N	received	putaway	2025-11-13	\N	\N	Return from Sales Order SO-2511-NORTH-0017 - Partial Delivery 11/13/2025	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:27:00.74856	2025-11-13 10:31:43.082	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	t
8560794d-7e1b-4ba5-b607-0cfaa598cc00	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0001	929fe31e-3c78-4980-aaec-7b7b85b6f37a	\N	rejected	create	2025-10-24	2025-11-08	3100.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-24 13:20:36.860188	2025-10-27 04:31:36.898	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
22104b29-d3d1-4131-bb78-76933c076f60	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0002	1252cb0b-d532-4278-974e-047b5ca4b828	\N	received	putaway	2025-10-26	\N	5500.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-26 11:17:26.793218	2025-10-28 04:43:04.286	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
d49945db-3965-47a0-887f-00919842d45f	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0004	929fe31e-3c78-4980-aaec-7b7b85b6f37a	\N	pending	approve	2025-10-30	2025-11-07	250.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 01:28:00.137525	2025-10-30 01:28:00.137525	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
61423a15-574d-40b1-8d9c-11c888ecaf8d	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0005	1252cb0b-d532-4278-974e-047b5ca4b828	\N	pending	approve	2025-10-30	\N	5000.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 01:56:39.403241	2025-10-30 01:56:39.403241	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
8f0d475e-f727-4c8f-a1e9-7ebc3d870ca3	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0006	1252cb0b-d532-4278-974e-047b5ca4b828	\N	pending	approve	2025-10-30	2025-11-08	8000.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 02:07:26.871781	2025-10-30 02:07:26.871781	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
8a143b8d-7e64-4e1f-b58c-9165a79060bc	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0007	1252cb0b-d532-4278-974e-047b5ca4b828	\N	pending	approve	2025-10-30	2025-11-08	4000.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-30 04:25:18.437659	2025-10-30 04:25:18.437659	1a936892-d57c-491d-a5f9-b0fe1b32d90d	delivery	f
3189b935-c1c6-45b3-b13c-c17912e12a92	8e017478-2f5f-4be3-b8b6-e389436ca28a	PO-2510-WH-0003	7fe4c8d4-2b25-4ea9-8cf6-b3b37044396d	35e83d99-9d5c-47f9-9bf9-97dd30f5440c	incomplete	receive	2025-10-26	2025-10-31	2500.00	\N	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-10-26 12:49:55.962114	2025-11-06 05:00:52.38	1a936892-d57c-491d-a5f9-b0fe1b32d90d	pickup	f
\.


--
-- Data for Name: purchase_orders_receipt; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.purchase_orders_receipt (id, purchase_order_id, grn_document_id, tenant_id, receipt_date, received_by, notes, created_at, updated_at, putaway_status) FROM stdin;
0a389eed-ba9f-4c63-aab7-e86fbdf1f263	3189b935-c1c6-45b3-b13c-c17912e12a92	bd1bbf63-b565-4728-b9c1-c870fd8597f6	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-28 05:53:04.239003	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-10-28 05:53:04.239003	2025-10-28 05:53:15.409	pending
9b799e3e-889d-45cb-8419-ef423e69c18f	22104b29-d3d1-4131-bb78-76933c076f60	04a78226-abef-4030-b50a-17b531176701	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-28 04:42:53.612467	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-10-28 04:42:53.612467	2025-10-29 13:20:31.516	completed
5f2b6521-3df1-4d7a-82a2-050e71c90f84	3189b935-c1c6-45b3-b13c-c17912e12a92	b175c2fb-fb15-457a-9429-a9484cf2e4a1	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-30 09:18:40.267617	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-10-30 09:18:40.267617	2025-10-30 09:18:49.544	pending
bd19577f-d1a3-4706-80fe-d69d31aa6a70	3189b935-c1c6-45b3-b13c-c17912e12a92	b005acce-03fe-46c7-b7df-273afc86b775	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-11-06 05:00:40.992935	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-06 05:00:40.992935	2025-11-06 05:00:50.892	pending
0f404c14-2cc6-4ed2-9c27-fe009e2c6957	80371d32-8e5f-4d49-bf34-e520f10c2c77	260e9f24-1598-4f04-81f7-6c768412e585	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-11-13 10:31:33.957081	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	2025-11-13 10:31:33.957081	2025-11-13 11:04:05.355	completed
\.


--
-- Data for Name: receipt_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.receipt_items (id, receipt_id, po_item_id, tenant_id, received_quantity, expiry_date, discrepancy_note, created_at, updated_at) FROM stdin;
66558d9f-706a-4da1-91c8-11c3b6ac44ba	9b799e3e-889d-45cb-8419-ef423e69c18f	92c94681-9081-445f-9526-9190bbb3ef1a	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	\N	\N	2025-10-28 04:42:53.612467	2025-10-28 04:42:53.612467
95b560eb-57c3-4087-94a5-598d414cbbdc	9b799e3e-889d-45cb-8419-ef423e69c18f	9b9b7981-a15c-4ba1-b1c5-67ffdb177392	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	\N	\N	2025-10-28 04:42:53.612467	2025-10-28 04:42:53.612467
80ab8e65-7b97-4bdd-a729-6b8c774af886	0a389eed-ba9f-4c63-aab7-e86fbdf1f263	624164a5-7c06-4f1b-9cff-aae05075532f	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	\N	Incomeplete delivery	2025-10-28 05:53:04.239003	2025-10-28 05:53:04.239003
c17208bd-dcbf-4bfe-b373-2307540437f7	0a389eed-ba9f-4c63-aab7-e86fbdf1f263	7d9c9dbc-41f1-4639-9e56-1f3f1e21bd14	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	\N	Incomeplete delivery	2025-10-28 05:53:04.239003	2025-10-28 05:53:04.239003
8b63a641-34d7-4db4-85ee-521cd609d590	5f2b6521-3df1-4d7a-82a2-050e71c90f84	624164a5-7c06-4f1b-9cff-aae05075532f	8e017478-2f5f-4be3-b8b6-e389436ca28a	40	\N	YG 10 rusak	2025-10-30 09:18:40.267617	2025-10-30 09:18:40.267617
d9d358fe-bef7-4a2e-92fb-ce68ec4a03ef	5f2b6521-3df1-4d7a-82a2-050e71c90f84	7d9c9dbc-41f1-4639-9e56-1f3f1e21bd14	8e017478-2f5f-4be3-b8b6-e389436ca28a	50	\N	\N	2025-10-30 09:18:40.267617	2025-10-30 09:18:40.267617
25f7ef2e-18a8-4d87-bf11-d101d10d9fde	bd19577f-d1a3-4706-80fe-d69d31aa6a70	624164a5-7c06-4f1b-9cff-aae05075532f	8e017478-2f5f-4be3-b8b6-e389436ca28a	5	\N	\N	2025-11-06 05:00:40.992935	2025-11-06 05:00:40.992935
eced1817-4275-43af-8b26-ef7cfd6d1107	0f404c14-2cc6-4ed2-9c27-fe009e2c6957	4195cd0e-3555-480e-881f-0e97ce235e5f	8e017478-2f5f-4be3-b8b6-e389436ca28a	1	\N	\N	2025-11-13 10:31:33.957081	2025-11-13 10:31:33.957081
\.


--
-- Data for Name: reports; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.reports (id, tenant_id, name, description, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sales_order_allocations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_allocations (id, tenant_id, sales_order_item_id, inventory_item_id, allocated_quantity, allocation_date, allocated_by, created_at, updated_at) FROM stdin;
cd9b400f-3108-481a-aceb-7ed050a2d8e5	8e017478-2f5f-4be3-b8b6-e389436ca28a	feec7bc1-94cc-426a-b211-523caece6ad1	6b44dd9c-92ae-462b-a622-0c585b85d30e	10.000	2025-11-05 13:58:40.158806	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-05 13:58:40.158806	2025-11-05 13:58:40.158806
f9938d52-e53f-4d3b-8bc3-757c01410060	8e017478-2f5f-4be3-b8b6-e389436ca28a	7da70d3c-61fa-4b19-be7d-34177b48a2f5	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	30.000	2025-11-09 04:29:36.157253	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:29:36.157253	2025-11-09 04:29:36.157253
b85161ec-da6d-4b22-909c-f4332f91d746	8e017478-2f5f-4be3-b8b6-e389436ca28a	4da45f3c-c929-420b-ba2f-d99103376acf	b6064332-e55f-4267-9da8-5d6a60af6082	50.000	2025-11-09 04:29:36.157253	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:29:36.157253	2025-11-09 04:29:36.157253
c5a8d301-22ba-4a02-8c50-8de07df0c637	8e017478-2f5f-4be3-b8b6-e389436ca28a	e75c0cc6-a845-457c-b378-1c9c83f7c3dc	6b44dd9c-92ae-462b-a622-0c585b85d30e	20.000	2025-11-09 04:30:12.903001	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:30:12.903001	2025-11-09 04:30:12.903001
3371e754-4e03-4708-ba2c-aff2b33aae58	8e017478-2f5f-4be3-b8b6-e389436ca28a	5826952e-a011-4cc6-bbca-c027bde45a57	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	20.000	2025-11-09 04:34:59.80028	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:34:59.80028	2025-11-09 04:34:59.80028
b5085a27-0a33-4486-8af0-b0711bf20f6e	8e017478-2f5f-4be3-b8b6-e389436ca28a	f552fcd2-6b4f-430d-9b65-a496e04741e1	b6064332-e55f-4267-9da8-5d6a60af6082	20.000	2025-11-09 04:34:59.80028	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 04:34:59.80028	2025-11-09 04:34:59.80028
5c3af1b0-f052-4275-943a-7f44ff964929	8e017478-2f5f-4be3-b8b6-e389436ca28a	64258558-ec2f-48d0-905f-de6fa0029d8f	3b78b5dd-e9a3-4540-8f53-62e8439e2fa2	4.000	2025-11-09 05:28:51.142416	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 05:28:51.142416	2025-11-09 05:28:51.142416
8a9a4473-e70e-4cb0-a866-e686dc20c351	8e017478-2f5f-4be3-b8b6-e389436ca28a	64258558-ec2f-48d0-905f-de6fa0029d8f	6836222a-3b52-4835-bcea-4b3383ac5b88	46.000	2025-11-09 05:28:51.142416	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 05:28:51.142416	2025-11-09 05:28:51.142416
5547c5b3-092f-4c1b-ba10-333a0fe02b85	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	b6064332-e55f-4267-9da8-5d6a60af6082	30.000	2025-11-09 05:28:51.142416	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 05:28:51.142416	2025-11-09 05:28:51.142416
bd0c2a4c-ce16-4ba0-b654-185199ef7e37	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	dc987787-2f48-430c-8a6d-9a7e9907580a	14.000	2025-11-09 05:28:51.142416	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 05:28:51.142416	2025-11-09 05:28:51.142416
86ec7715-a467-4ffc-a26e-933c8a19675d	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	3d5dd90e-f254-4682-a4c4-4a651d693580	56.000	2025-11-09 05:28:51.142416	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-09 05:28:51.142416	2025-11-09 05:28:51.142416
f998ca6c-3d49-474b-9fb5-8859cad99adf	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	6836222a-3b52-4835-bcea-4b3383ac5b88	13.000	2025-11-10 07:05:00.601826	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:05:00.601826	2025-11-10 07:05:00.601826
66a777c9-aac5-44e1-b7a3-0cf5c9dfc0bb	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	16ccfb36-6851-4156-ab2e-a15de9028958	7.000	2025-11-10 07:05:00.601826	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:05:00.601826	2025-11-10 07:05:00.601826
1e66f31a-9c22-4977-a0da-718de1cfb4d2	8e017478-2f5f-4be3-b8b6-e389436ca28a	4fc78d91-7487-4e82-98be-3c390e14761a	4a977db2-8e8f-417e-886f-4d862be115bd	20.000	2025-11-10 07:05:00.601826	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:05:00.601826	2025-11-10 07:05:00.601826
04b24f67-d622-47fc-a410-58f099015fd9	8e017478-2f5f-4be3-b8b6-e389436ca28a	996fb9f9-28e4-4d9a-8936-b95e343cd79d	16ccfb36-6851-4156-ab2e-a15de9028958	50.000	2025-11-10 08:23:07.692487	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 08:23:07.692487	2025-11-10 08:23:07.692487
fa5486e2-7c92-4ab7-b908-bcf7b08451fb	8e017478-2f5f-4be3-b8b6-e389436ca28a	57791718-f3e0-4042-82ab-721bb8246e14	16ccfb36-6851-4156-ab2e-a15de9028958	5.000	2025-11-12 02:18:37.593319	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:18:37.593319	2025-11-12 02:18:37.593319
15720fcb-e7bf-4055-9513-d9baab0b128a	8e017478-2f5f-4be3-b8b6-e389436ca28a	95d2bfb1-a763-4ba9-96c5-e2e68101df9f	4a977db2-8e8f-417e-886f-4d862be115bd	5.000	2025-11-12 02:18:37.593319	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:18:37.593319	2025-11-12 02:18:37.593319
ee5ba8a1-81c0-4156-921b-908e83e2e231	8e017478-2f5f-4be3-b8b6-e389436ca28a	4711e0ed-0648-46db-b973-0cb6aec04df4	16ccfb36-6851-4156-ab2e-a15de9028958	2.000	2025-11-12 04:13:30.378073	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:13:30.378073	2025-11-12 04:13:30.378073
4c87ed96-5d11-42cd-8c08-9144d9f3c129	8e017478-2f5f-4be3-b8b6-e389436ca28a	c9af996f-3cd5-468d-8635-00af763a8885	3d5dd90e-f254-4682-a4c4-4a651d693580	1.000	2025-11-12 04:13:30.378073	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:13:30.378073	2025-11-12 04:13:30.378073
0ca46b8f-3741-4ad3-858c-cf030caa3ffe	8e017478-2f5f-4be3-b8b6-e389436ca28a	c9af996f-3cd5-468d-8635-00af763a8885	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-12 04:13:30.378073	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:13:30.378073	2025-11-12 04:13:30.378073
2fd554eb-cfe3-4347-a77a-cc8090e50581	8e017478-2f5f-4be3-b8b6-e389436ca28a	3821f93e-f28c-4d10-940f-101bf71a273f	16ccfb36-6851-4156-ab2e-a15de9028958	1.000	2025-11-12 04:41:47.493983	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:41:47.493983	2025-11-12 04:41:47.493983
4f4a6d17-669f-43da-9020-9dbb32581bfa	8e017478-2f5f-4be3-b8b6-e389436ca28a	5fe3f1b9-68ec-4725-a159-e9757a9aa636	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-12 04:41:47.493983	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:41:47.493983	2025-11-12 04:41:47.493983
1af828c8-33ff-41e1-a8fd-3969ed7f43bb	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	dc729873-5d8c-47c1-8e5a-35979188bf5f	2.000	2025-11-12 08:35:36.296717	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:35:36.296717	2025-11-12 08:35:36.296717
8f540aa7-b238-4695-96cc-b850c7ec25fd	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	0c2a72d8-80cf-450a-b1a9-445d9869c86e	2.000	2025-11-12 08:35:36.296717	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:35:36.296717	2025-11-12 08:35:36.296717
a7a8691f-455d-4eb5-afa8-6ff1749347ca	8e017478-2f5f-4be3-b8b6-e389436ca28a	55b46f69-1aa1-4241-bfa6-17de98965aaa	dc729873-5d8c-47c1-8e5a-35979188bf5f	1.000	2025-11-13 08:40:09.140043	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:40:09.140043	2025-11-13 08:40:09.140043
9a4d2959-051c-4992-860d-2790cccde0de	8e017478-2f5f-4be3-b8b6-e389436ca28a	c24461d7-bad1-4ccd-a726-7f596d81490c	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-13 08:40:09.140043	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:40:09.140043	2025-11-13 08:40:09.140043
52a0b3e3-b441-4e7f-881d-0499b780bd92	8e017478-2f5f-4be3-b8b6-e389436ca28a	dc5982bf-8262-4978-9fef-2f1fbfbd8944	dc729873-5d8c-47c1-8e5a-35979188bf5f	1.000	2025-11-13 09:14:26.313367	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:14:26.313367	2025-11-13 09:14:26.313367
f60a0d19-be3b-4b8f-85a4-71c59d77a11d	8e017478-2f5f-4be3-b8b6-e389436ca28a	10e63015-88f4-4144-9420-a74ef29016e8	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-13 09:14:26.313367	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:14:26.313367	2025-11-13 09:14:26.313367
f0de4ff3-2e89-4032-bd91-ecf9bce02507	8e017478-2f5f-4be3-b8b6-e389436ca28a	0ebd39cb-c1f5-49ac-9bee-8e034b118b20	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-13 09:56:20.549122	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:56:20.549122	2025-11-13 09:56:20.549122
ceff3f58-c4e1-4c4f-9d28-54debc9fc453	8e017478-2f5f-4be3-b8b6-e389436ca28a	93d54581-ca0a-4e5f-ab51-f5bd71d116e8	0c2a72d8-80cf-450a-b1a9-445d9869c86e	3.000	2025-11-13 10:20:10.745502	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:20:10.745502	2025-11-13 10:20:10.745502
2cfdd502-1df7-4495-ab70-b4acc846b8b6	8e017478-2f5f-4be3-b8b6-e389436ca28a	d3c373b3-d65b-45b9-8708-f00ba16afd98	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-14 02:06:05.489649	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:06:05.489649	2025-11-14 02:06:05.489649
1e212774-a898-4008-a7be-d70346e10999	8e017478-2f5f-4be3-b8b6-e389436ca28a	ff8be314-eef3-464e-99c4-95c45c256517	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-14 02:06:28.469679	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:06:28.469679	2025-11-14 02:06:28.469679
16570df8-abff-4041-9c71-e1488b0d2994	8e017478-2f5f-4be3-b8b6-e389436ca28a	ec7efa1c-410f-489e-b297-e4ec797b8145	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-14 02:17:43.969116	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:17:43.969116	2025-11-14 02:17:43.969116
514c8c23-ad42-404f-ad85-c78a98eeb4df	8e017478-2f5f-4be3-b8b6-e389436ca28a	80e74f61-d016-4820-ab46-32ec9011d4ee	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-14 02:18:08.084616	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:18:08.084616	2025-11-14 02:18:08.084616
c52585f7-01c0-4756-9e63-0b1168ff273f	8e017478-2f5f-4be3-b8b6-e389436ca28a	48a78aee-8668-4121-8dc6-93f3deed213f	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	2025-11-14 02:57:21.590331	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:57:21.590331	2025-11-14 02:57:21.590331
\.


--
-- Data for Name: sales_order_item_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_item_locations (id, tenant_id, sales_order_item_id, customer_location_id, quantity, delivery_notes, created_at, updated_at) FROM stdin;
4452ef1a-1f38-43aa-acec-fd3ebd5e86e1	8e017478-2f5f-4be3-b8b6-e389436ca28a	feec7bc1-94cc-426a-b211-523caece6ad1	f4e9f365-6ec1-4e61-b013-87fd733fd856	5.000	\N	2025-11-05 04:25:21.200263	2025-11-05 04:25:21.200263
b19d094d-8341-4b64-8d57-ffc435cb7663	8e017478-2f5f-4be3-b8b6-e389436ca28a	feec7bc1-94cc-426a-b211-523caece6ad1	db91c31b-ea68-426d-a934-6d3784826aec	5.000	\N	2025-11-05 04:25:21.200263	2025-11-05 04:25:21.200263
0269fecd-e6f8-4f62-b0ea-d510abdee24e	8e017478-2f5f-4be3-b8b6-e389436ca28a	e75c0cc6-a845-457c-b378-1c9c83f7c3dc	feee4b0b-2fef-493f-ac5b-b2be91fa1ba7	20.000	\N	2025-11-05 07:55:39.257741	2025-11-05 07:55:39.257741
f857a058-9533-4184-ba5f-ea722ff993ef	8e017478-2f5f-4be3-b8b6-e389436ca28a	64258558-ec2f-48d0-905f-de6fa0029d8f	9aca801e-b684-4866-a649-bffe241c1629	20.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
232d822e-b91d-4d9e-9e71-c0916a024787	8e017478-2f5f-4be3-b8b6-e389436ca28a	64258558-ec2f-48d0-905f-de6fa0029d8f	e8c25b5f-47a6-4099-94b4-afedb14daa73	20.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
6910fa43-a036-4e67-8174-66e6f3a525e8	8e017478-2f5f-4be3-b8b6-e389436ca28a	64258558-ec2f-48d0-905f-de6fa0029d8f	1664543f-493f-4d26-8a22-413063818a8d	10.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
0e16ee28-4a4a-43e7-9065-2ca2dce65cbe	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	9aca801e-b684-4866-a649-bffe241c1629	50.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
7a9a5a4b-f439-488e-9b2d-3acd2b0e6ed6	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	e8c25b5f-47a6-4099-94b4-afedb14daa73	35.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
9d4afcd7-c837-4a85-acfe-e66248a903b0	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d5dbc60-60b2-4458-9710-04dfd5030aec	1664543f-493f-4d26-8a22-413063818a8d	15.000	\N	2025-11-09 03:36:34.100509	2025-11-09 03:36:34.100509
7ac14a9c-e3b0-43b5-bee1-f9e82309a8c8	8e017478-2f5f-4be3-b8b6-e389436ca28a	5826952e-a011-4cc6-bbca-c027bde45a57	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	15.000	\N	2025-11-09 03:39:45.106277	2025-11-09 03:39:45.106277
37505911-475c-49d9-9c06-76874a72afd9	8e017478-2f5f-4be3-b8b6-e389436ca28a	5826952e-a011-4cc6-bbca-c027bde45a57	b83c4019-9e33-4dc2-aff3-905e6a56785c	5.000	\N	2025-11-09 03:39:45.106277	2025-11-09 03:39:45.106277
4796e4cd-3d24-4cfa-a6f5-6af4c43022ac	8e017478-2f5f-4be3-b8b6-e389436ca28a	f552fcd2-6b4f-430d-9b65-a496e04741e1	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	8.000	\N	2025-11-09 03:39:45.106277	2025-11-09 03:39:45.106277
ed0a7c39-f004-45d7-b6c4-4fc43101cdb5	8e017478-2f5f-4be3-b8b6-e389436ca28a	f552fcd2-6b4f-430d-9b65-a496e04741e1	b83c4019-9e33-4dc2-aff3-905e6a56785c	12.000	\N	2025-11-09 03:39:45.106277	2025-11-09 03:39:45.106277
1685b5c0-c704-4546-a129-0340bacd7115	8e017478-2f5f-4be3-b8b6-e389436ca28a	7da70d3c-61fa-4b19-be7d-34177b48a2f5	9aca801e-b684-4866-a649-bffe241c1629	20.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
eb5856b9-a811-4fee-b1ad-54b611e7df5d	8e017478-2f5f-4be3-b8b6-e389436ca28a	7da70d3c-61fa-4b19-be7d-34177b48a2f5	e8c25b5f-47a6-4099-94b4-afedb14daa73	7.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
72ce8859-0f6f-4c10-a267-e16b6fc447c2	8e017478-2f5f-4be3-b8b6-e389436ca28a	7da70d3c-61fa-4b19-be7d-34177b48a2f5	1664543f-493f-4d26-8a22-413063818a8d	3.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
c5d6ed22-e21e-4f6b-9b70-f5f2762b7d49	8e017478-2f5f-4be3-b8b6-e389436ca28a	4da45f3c-c929-420b-ba2f-d99103376acf	9aca801e-b684-4866-a649-bffe241c1629	20.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
8bbe94f3-7931-488f-8660-7de7bd2f5c07	8e017478-2f5f-4be3-b8b6-e389436ca28a	4da45f3c-c929-420b-ba2f-d99103376acf	e8c25b5f-47a6-4099-94b4-afedb14daa73	20.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
dc7c7fca-025f-4dee-9ac9-31b05f1d4d31	8e017478-2f5f-4be3-b8b6-e389436ca28a	4da45f3c-c929-420b-ba2f-d99103376acf	1664543f-493f-4d26-8a22-413063818a8d	10.000	\N	2025-11-09 04:28:40.574923	2025-11-09 04:28:40.574923
6c5aa259-8645-4e82-8f3c-effea7f61d06	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	9aca801e-b684-4866-a649-bffe241c1629	10.000	\N	2025-11-10 06:47:51.718456	2025-11-10 06:47:51.718456
3fc0d5b3-a1f3-459f-ad81-7b9193d16982	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	e8c25b5f-47a6-4099-94b4-afedb14daa73	10.000	\N	2025-11-10 06:47:51.718456	2025-11-10 06:47:51.718456
d9c4a58a-f4a9-46eb-996f-ac0c943a61fb	8e017478-2f5f-4be3-b8b6-e389436ca28a	4fc78d91-7487-4e82-98be-3c390e14761a	9aca801e-b684-4866-a649-bffe241c1629	5.000	\N	2025-11-10 06:47:51.718456	2025-11-10 06:47:51.718456
a13ac678-f82e-404a-8509-04c3a78b4a77	8e017478-2f5f-4be3-b8b6-e389436ca28a	4fc78d91-7487-4e82-98be-3c390e14761a	e8c25b5f-47a6-4099-94b4-afedb14daa73	15.000	\N	2025-11-10 06:47:51.718456	2025-11-10 06:47:51.718456
304b26e8-21f4-4ea0-a3ae-909f9038e525	8e017478-2f5f-4be3-b8b6-e389436ca28a	996fb9f9-28e4-4d9a-8936-b95e343cd79d	f4e9f365-6ec1-4e61-b013-87fd733fd856	25.000	\N	2025-11-10 08:21:32.804071	2025-11-10 08:21:32.804071
10873c70-bb73-44d0-a9be-090f09eff3bc	8e017478-2f5f-4be3-b8b6-e389436ca28a	996fb9f9-28e4-4d9a-8936-b95e343cd79d	db91c31b-ea68-426d-a934-6d3784826aec	25.000	\N	2025-11-10 08:21:32.804071	2025-11-10 08:21:32.804071
72460d18-1923-4681-9749-51529dd9d58b	8e017478-2f5f-4be3-b8b6-e389436ca28a	57791718-f3e0-4042-82ab-721bb8246e14	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	5.000	\N	2025-11-12 02:14:12.552689	2025-11-12 02:14:12.552689
813e5745-9686-49f0-a913-2ed3b5c00273	8e017478-2f5f-4be3-b8b6-e389436ca28a	95d2bfb1-a763-4ba9-96c5-e2e68101df9f	b83c4019-9e33-4dc2-aff3-905e6a56785c	5.000	\N	2025-11-12 02:14:12.552689	2025-11-12 02:14:12.552689
ddadd85a-936c-496c-82ba-3105e247644e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4711e0ed-0648-46db-b973-0cb6aec04df4	9aca801e-b684-4866-a649-bffe241c1629	2.000	\N	2025-11-12 04:12:53.503397	2025-11-12 04:12:53.503397
3a987ea3-fbbb-4324-82f7-7a3b2d052b70	8e017478-2f5f-4be3-b8b6-e389436ca28a	c9af996f-3cd5-468d-8635-00af763a8885	9aca801e-b684-4866-a649-bffe241c1629	2.000	\N	2025-11-12 04:12:53.503397	2025-11-12 04:12:53.503397
096599c2-f5dd-4ac8-8569-619c21af8409	8e017478-2f5f-4be3-b8b6-e389436ca28a	3821f93e-f28c-4d10-940f-101bf71a273f	f4e9f365-6ec1-4e61-b013-87fd733fd856	1.000	\N	2025-11-12 04:40:27.874839	2025-11-12 04:40:27.874839
3e37d89d-8b95-4f40-a6f8-e57d5ed1dcca	8e017478-2f5f-4be3-b8b6-e389436ca28a	5fe3f1b9-68ec-4725-a159-e9757a9aa636	f4e9f365-6ec1-4e61-b013-87fd733fd856	1.000	\N	2025-11-12 04:40:27.874839	2025-11-12 04:40:27.874839
e0a1b1a6-c03b-43ec-a27b-99943418d852	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	e8c25b5f-47a6-4099-94b4-afedb14daa73	1.000	\N	2025-11-12 08:33:33.285201	2025-11-12 08:33:33.285201
bb7e0032-9a72-4e65-946a-b2de6431e518	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	1664543f-493f-4d26-8a22-413063818a8d	1.000	\N	2025-11-12 08:33:33.285201	2025-11-12 08:33:33.285201
ddc9a020-d104-4966-9600-90dd65a08717	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	e8c25b5f-47a6-4099-94b4-afedb14daa73	1.000	\N	2025-11-12 08:33:33.285201	2025-11-12 08:33:33.285201
2c3a212b-e596-4108-ba59-b70baedd3b3e	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	1664543f-493f-4d26-8a22-413063818a8d	1.000	\N	2025-11-12 08:33:33.285201	2025-11-12 08:33:33.285201
7e4dd593-bd04-47c3-9fd2-0440850efe60	8e017478-2f5f-4be3-b8b6-e389436ca28a	55b46f69-1aa1-4241-bfa6-17de98965aaa	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	1.000	\N	2025-11-13 08:39:38.000229	2025-11-13 08:39:38.000229
87198b5a-734b-4508-b28f-de8611466682	8e017478-2f5f-4be3-b8b6-e389436ca28a	c24461d7-bad1-4ccd-a726-7f596d81490c	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	1.000	\N	2025-11-13 08:39:38.000229	2025-11-13 08:39:38.000229
67ee00ae-24ca-4396-a1b0-316ce88836ef	8e017478-2f5f-4be3-b8b6-e389436ca28a	dc5982bf-8262-4978-9fef-2f1fbfbd8944	9aca801e-b684-4866-a649-bffe241c1629	1.000	\N	2025-11-13 09:13:49.432007	2025-11-13 09:13:49.432007
e135e2d0-8c54-426c-a8b1-b073bf118055	8e017478-2f5f-4be3-b8b6-e389436ca28a	10e63015-88f4-4144-9420-a74ef29016e8	9aca801e-b684-4866-a649-bffe241c1629	1.000	\N	2025-11-13 09:13:49.432007	2025-11-13 09:13:49.432007
56b8ea06-8316-439f-b510-ff949cb76988	8e017478-2f5f-4be3-b8b6-e389436ca28a	0ebd39cb-c1f5-49ac-9bee-8e034b118b20	9aca801e-b684-4866-a649-bffe241c1629	1.000	\N	2025-11-13 09:55:16.923178	2025-11-13 09:55:16.923178
801f04d0-25bf-4275-9c2b-3045a61b16fa	8e017478-2f5f-4be3-b8b6-e389436ca28a	93d54581-ca0a-4e5f-ab51-f5bd71d116e8	f4e9f365-6ec1-4e61-b013-87fd733fd856	3.000	\N	2025-11-13 10:19:32.212319	2025-11-13 10:19:32.212319
d27c1ee9-9a3c-4c0f-9d1e-5005b5fa74b2	8e017478-2f5f-4be3-b8b6-e389436ca28a	ff8be314-eef3-464e-99c4-95c45c256517	9aca801e-b684-4866-a649-bffe241c1629	1.000	\N	2025-11-14 02:04:24.557762	2025-11-14 02:04:24.557762
b62784cd-28d5-4d6d-9799-7b4642fedc61	8e017478-2f5f-4be3-b8b6-e389436ca28a	d3c373b3-d65b-45b9-8708-f00ba16afd98	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	1.000	\N	2025-11-14 02:05:05.015347	2025-11-14 02:05:05.015347
3b75176c-a4e6-4b4d-9d73-f73697f934d3	8e017478-2f5f-4be3-b8b6-e389436ca28a	80e74f61-d016-4820-ab46-32ec9011d4ee	f4e9f365-6ec1-4e61-b013-87fd733fd856	1.000	\N	2025-11-14 02:16:19.55013	2025-11-14 02:16:19.55013
c5750a49-a015-40d1-9825-a8fa6d68a2ce	8e017478-2f5f-4be3-b8b6-e389436ca28a	ec7efa1c-410f-489e-b297-e4ec797b8145	fbd94a06-158a-4d19-8f0b-3f3e4bf0fd96	1.000	\N	2025-11-14 02:17:09.391139	2025-11-14 02:17:09.391139
b8cf747f-edd2-4b1e-80de-c19135f85c66	8e017478-2f5f-4be3-b8b6-e389436ca28a	48a78aee-8668-4121-8dc6-93f3deed213f	40f761b6-e503-4f1b-b99a-b8643f5c2b4a	1.000	\N	2025-11-14 02:56:45.961487	2025-11-14 02:56:45.961487
\.


--
-- Data for Name: sales_order_items; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_items (id, tenant_id, sales_order_id, line_number, product_id, allocated_quantity, picked_quantity, unit_price, total_price, notes, created_at, updated_at, ordered_quantity) FROM stdin;
bf0111ea-d94a-4645-8ae4-fb116600b1c7	8e017478-2f5f-4be3-b8b6-e389436ca28a	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	2	4ff81248-f3b0-450d-a0f5-d666d7256399	2.000	2.000	5.00	10.00	\N	2025-11-12 08:33:33.285201	2025-11-12 08:36:45.832	2.000
feec7bc1-94cc-426a-b211-523caece6ad1	8e017478-2f5f-4be3-b8b6-e389436ca28a	089902ea-9c3d-41ee-a9e6-25520780d2b0	1	f7e708fe-ca3a-41d1-954b-cad17ae4b534	10.000	10.000	100.00	1000.00	\N	2025-11-05 04:25:21.200263	2025-11-07 00:15:52.061	10.000
7da70d3c-61fa-4b19-be7d-34177b48a2f5	8e017478-2f5f-4be3-b8b6-e389436ca28a	52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	30.000	0.000	20.00	600.00	\N	2025-11-09 04:28:40.574923	2025-11-09 04:29:38.259	30.000
4da45f3c-c929-420b-ba2f-d99103376acf	8e017478-2f5f-4be3-b8b6-e389436ca28a	52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	2	4ff81248-f3b0-450d-a0f5-d666d7256399	50.000	0.000	25.00	1250.00	\N	2025-11-09 04:28:40.574923	2025-11-09 04:29:40.966	50.000
e75c0cc6-a845-457c-b378-1c9c83f7c3dc	8e017478-2f5f-4be3-b8b6-e389436ca28a	af4d9683-8428-4a9c-a269-f38f2b012202	1	f7e708fe-ca3a-41d1-954b-cad17ae4b534	20.000	0.000	150.00	3000.00	\N	2025-11-05 07:55:39.257741	2025-11-09 04:30:14.969	20.000
5826952e-a011-4cc6-bbca-c027bde45a57	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d90cf0f-3e76-40a9-a697-cb07862b7855	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	20.000	0.000	20.00	400.00	\N	2025-11-09 03:39:45.106277	2025-11-09 04:35:01.883	20.000
f552fcd2-6b4f-430d-9b65-a496e04741e1	8e017478-2f5f-4be3-b8b6-e389436ca28a	7d90cf0f-3e76-40a9-a697-cb07862b7855	2	4ff81248-f3b0-450d-a0f5-d666d7256399	20.000	0.000	25.00	500.00	\N	2025-11-09 03:39:45.106277	2025-11-09 04:35:04.323	20.000
64258558-ec2f-48d0-905f-de6fa0029d8f	8e017478-2f5f-4be3-b8b6-e389436ca28a	9ef0d521-b587-43bf-9c3e-705fea4f84c0	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	50.000	0.000	20.00	1000.00	\N	2025-11-09 03:36:34.100509	2025-11-09 05:28:54.019	50.000
7d5dbc60-60b2-4458-9710-04dfd5030aec	8e017478-2f5f-4be3-b8b6-e389436ca28a	9ef0d521-b587-43bf-9c3e-705fea4f84c0	2	4ff81248-f3b0-450d-a0f5-d666d7256399	100.000	0.000	25.00	2500.00	\N	2025-11-09 03:36:34.100509	2025-11-09 05:28:58.361	100.000
7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	8e017478-2f5f-4be3-b8b6-e389436ca28a	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	20.000	20.000	100.00	2000.00	\N	2025-11-10 06:47:51.718456	2025-11-10 07:07:30.528	20.000
4fc78d91-7487-4e82-98be-3c390e14761a	8e017478-2f5f-4be3-b8b6-e389436ca28a	a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	2	4ff81248-f3b0-450d-a0f5-d666d7256399	20.000	20.000	25.00	500.00	\N	2025-11-10 06:47:51.718456	2025-11-10 07:07:32.979	20.000
996fb9f9-28e4-4d9a-8936-b95e343cd79d	8e017478-2f5f-4be3-b8b6-e389436ca28a	690ebd60-7169-4beb-b53f-c44392bd715e	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	50.000	0.000	100.00	5000.00	\N	2025-11-10 08:21:32.804071	2025-11-10 08:23:09.776	50.000
80e74f61-d016-4820-ab46-32ec9011d4ee	8e017478-2f5f-4be3-b8b6-e389436ca28a	dba473ab-546d-45ea-a2f5-b0e354d16684	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-14 02:16:19.55013	2025-11-14 02:20:04.882	1.000
57791718-f3e0-4042-82ab-721bb8246e14	8e017478-2f5f-4be3-b8b6-e389436ca28a	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	5.000	5.000	10.00	50.00	\N	2025-11-12 02:14:12.552689	2025-11-12 02:19:21.366	5.000
95d2bfb1-a763-4ba9-96c5-e2e68101df9f	8e017478-2f5f-4be3-b8b6-e389436ca28a	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	2	4ff81248-f3b0-450d-a0f5-d666d7256399	5.000	5.000	10.00	50.00	\N	2025-11-12 02:14:12.552689	2025-11-12 02:19:23.679	5.000
55b46f69-1aa1-4241-bfa6-17de98965aaa	8e017478-2f5f-4be3-b8b6-e389436ca28a	1f65dc4e-93ca-476c-8254-c8cd25cc574e	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	5.00	5.00	\N	2025-11-13 08:39:38.000229	2025-11-13 08:40:53.267	1.000
c24461d7-bad1-4ccd-a726-7f596d81490c	8e017478-2f5f-4be3-b8b6-e389436ca28a	1f65dc4e-93ca-476c-8254-c8cd25cc574e	2	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-13 08:39:38.000229	2025-11-13 08:40:55.609	1.000
4711e0ed-0648-46db-b973-0cb6aec04df4	8e017478-2f5f-4be3-b8b6-e389436ca28a	773238c7-aed6-4049-8aa2-782df99182ba	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2.000	2.000	5.00	10.00	\N	2025-11-12 04:12:53.503397	2025-11-12 04:14:26.191	2.000
c9af996f-3cd5-468d-8635-00af763a8885	8e017478-2f5f-4be3-b8b6-e389436ca28a	773238c7-aed6-4049-8aa2-782df99182ba	2	4ff81248-f3b0-450d-a0f5-d666d7256399	2.000	2.000	5.00	10.00	\N	2025-11-12 04:12:53.503397	2025-11-12 04:14:29.845	2.000
3821f93e-f28c-4d10-940f-101bf71a273f	8e017478-2f5f-4be3-b8b6-e389436ca28a	4db87969-8444-49ea-af53-7f7f80fcd8b9	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	5.00	5.00	\N	2025-11-12 04:40:27.874839	2025-11-12 04:42:53.969	1.000
5fe3f1b9-68ec-4725-a159-e9757a9aa636	8e017478-2f5f-4be3-b8b6-e389436ca28a	4db87969-8444-49ea-af53-7f7f80fcd8b9	2	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-12 04:40:27.874839	2025-11-12 04:42:56.293	1.000
48a78aee-8668-4121-8dc6-93f3deed213f	8e017478-2f5f-4be3-b8b6-e389436ca28a	9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-14 02:56:45.961487	2025-11-14 02:57:52.393	1.000
5036138f-6147-4758-91d8-c7c8510ae5d7	8e017478-2f5f-4be3-b8b6-e389436ca28a	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	2.000	2.000	5.00	10.00	\N	2025-11-12 08:33:33.285201	2025-11-12 08:36:43.444	2.000
dc5982bf-8262-4978-9fef-2f1fbfbd8944	8e017478-2f5f-4be3-b8b6-e389436ca28a	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	1	8cb6b866-53e5-4d79-b902-f4b0d56fd705	1.000	1.000	5.00	5.00	\N	2025-11-13 09:13:49.432007	2025-11-13 09:15:17.257	1.000
10e63015-88f4-4144-9420-a74ef29016e8	8e017478-2f5f-4be3-b8b6-e389436ca28a	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	2	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-13 09:13:49.432007	2025-11-13 09:15:19.619	1.000
0ebd39cb-c1f5-49ac-9bee-8e034b118b20	8e017478-2f5f-4be3-b8b6-e389436ca28a	efb53562-d2e9-49a7-8ca8-364c8c760457	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-13 09:55:16.923178	2025-11-13 09:57:00.535	1.000
93d54581-ca0a-4e5f-ab51-f5bd71d116e8	8e017478-2f5f-4be3-b8b6-e389436ca28a	76a1aa22-f63c-48f1-9d91-2edb698d6742	1	4ff81248-f3b0-450d-a0f5-d666d7256399	3.000	3.000	5.00	15.00	\N	2025-11-13 10:19:32.212319	2025-11-13 10:21:07.858	3.000
d3c373b3-d65b-45b9-8708-f00ba16afd98	8e017478-2f5f-4be3-b8b6-e389436ca28a	0be43aa0-0e67-4329-8021-719c6aec65b4	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-14 02:05:05.015347	2025-11-14 02:06:59.004	1.000
ff8be314-eef3-464e-99c4-95c45c256517	8e017478-2f5f-4be3-b8b6-e389436ca28a	8a85b1d6-e597-4fe3-a21a-5a04026ade9d	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-14 02:04:24.557762	2025-11-14 02:07:21.961	1.000
ec7efa1c-410f-489e-b297-e4ec797b8145	8e017478-2f5f-4be3-b8b6-e389436ca28a	74e9c94c-13ea-4819-a948-524f40e2dbd2	1	4ff81248-f3b0-450d-a0f5-d666d7256399	1.000	1.000	5.00	5.00	\N	2025-11-14 02:17:09.391139	2025-11-14 02:18:39.994	1.000
\.


--
-- Data for Name: sales_order_picks; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_order_picks (id, tenant_id, sales_order_item_id, inventory_item_id, picked_quantity, batch_number, lot_number, serial_number, pick_date, picked_by, created_at, updated_at) FROM stdin;
d7fe1e40-1f9f-4849-bd33-fa85a0ad1891	8e017478-2f5f-4be3-b8b6-e389436ca28a	feec7bc1-94cc-426a-b211-523caece6ad1	6b44dd9c-92ae-462b-a622-0c585b85d30e	10.000	\N	\N	\N	2025-11-07 00:15:49.998335	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-07 00:15:49.998335	2025-11-07 00:15:49.998335
59aea387-7dd0-48ab-8c4e-5a9c0d7b1796	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	6836222a-3b52-4835-bcea-4b3383ac5b88	13.000	\N	\N	\N	2025-11-10 07:07:26.965456	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:07:26.965456	2025-11-10 07:07:26.965456
4d393352-b218-4b93-a19b-eb8ac6a33513	8e017478-2f5f-4be3-b8b6-e389436ca28a	7c84cbb9-41aa-4eda-9f21-0de8cdf21b96	16ccfb36-6851-4156-ab2e-a15de9028958	7.000	\N	\N	\N	2025-11-10 07:07:26.965456	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:07:26.965456	2025-11-10 07:07:26.965456
135191bb-dbac-4da9-b05a-6c77853c0b5a	8e017478-2f5f-4be3-b8b6-e389436ca28a	4fc78d91-7487-4e82-98be-3c390e14761a	4a977db2-8e8f-417e-886f-4d862be115bd	20.000	\N	\N	\N	2025-11-10 07:07:26.965456	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-10 07:07:26.965456	2025-11-10 07:07:26.965456
b0b15d73-b83e-48d3-b867-f569d52fbfed	8e017478-2f5f-4be3-b8b6-e389436ca28a	57791718-f3e0-4042-82ab-721bb8246e14	16ccfb36-6851-4156-ab2e-a15de9028958	5.000	\N	\N	\N	2025-11-12 02:19:19.381195	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:19:19.381195	2025-11-12 02:19:19.381195
0b9c733b-94e0-4f59-aaee-5815e64362f0	8e017478-2f5f-4be3-b8b6-e389436ca28a	95d2bfb1-a763-4ba9-96c5-e2e68101df9f	4a977db2-8e8f-417e-886f-4d862be115bd	5.000	\N	\N	\N	2025-11-12 02:19:19.381195	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 02:19:19.381195	2025-11-12 02:19:19.381195
3ab2609d-3d88-4bc1-a7ab-66a07bfa785e	8e017478-2f5f-4be3-b8b6-e389436ca28a	4711e0ed-0648-46db-b973-0cb6aec04df4	16ccfb36-6851-4156-ab2e-a15de9028958	2.000	\N	\N	\N	2025-11-12 04:14:24.223452	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:14:24.223452	2025-11-12 04:14:24.223452
23a604fa-b8c9-4fb4-b015-83b75567f953	8e017478-2f5f-4be3-b8b6-e389436ca28a	c9af996f-3cd5-468d-8635-00af763a8885	3d5dd90e-f254-4682-a4c4-4a651d693580	1.000	\N	\N	\N	2025-11-12 04:14:24.223452	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:14:24.223452	2025-11-12 04:14:24.223452
d634017c-d3ef-4824-9db3-b362e1fff437	8e017478-2f5f-4be3-b8b6-e389436ca28a	c9af996f-3cd5-468d-8635-00af763a8885	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-12 04:14:24.223452	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:14:24.223452	2025-11-12 04:14:24.223452
4a4a3e5a-25d6-44e9-8f55-851ebf422af0	8e017478-2f5f-4be3-b8b6-e389436ca28a	3821f93e-f28c-4d10-940f-101bf71a273f	16ccfb36-6851-4156-ab2e-a15de9028958	1.000	\N	\N	\N	2025-11-12 04:42:51.980143	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:42:51.980143	2025-11-12 04:42:51.980143
bf222b8a-2aef-4292-87e3-b55e9dcb4781	8e017478-2f5f-4be3-b8b6-e389436ca28a	5fe3f1b9-68ec-4725-a159-e9757a9aa636	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-12 04:42:51.980143	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 04:42:51.980143	2025-11-12 04:42:51.980143
beaf6083-0328-4d60-87db-9f4e6e2e2247	8e017478-2f5f-4be3-b8b6-e389436ca28a	5036138f-6147-4758-91d8-c7c8510ae5d7	dc729873-5d8c-47c1-8e5a-35979188bf5f	2.000	\N	\N	\N	2025-11-12 08:36:41.400882	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:36:41.400882	2025-11-12 08:36:41.400882
29528feb-0ca7-4094-b156-7b802ac06a9b	8e017478-2f5f-4be3-b8b6-e389436ca28a	bf0111ea-d94a-4645-8ae4-fb116600b1c7	0c2a72d8-80cf-450a-b1a9-445d9869c86e	2.000	\N	\N	\N	2025-11-12 08:36:41.400882	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-12 08:36:41.400882	2025-11-12 08:36:41.400882
eb1d3ec2-a321-40fa-a47a-9e6f20efea13	8e017478-2f5f-4be3-b8b6-e389436ca28a	55b46f69-1aa1-4241-bfa6-17de98965aaa	dc729873-5d8c-47c1-8e5a-35979188bf5f	1.000	\N	\N	\N	2025-11-13 08:40:51.268574	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:40:51.268574	2025-11-13 08:40:51.268574
863ce046-c6b3-468e-a789-160d3d617b22	8e017478-2f5f-4be3-b8b6-e389436ca28a	c24461d7-bad1-4ccd-a726-7f596d81490c	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-13 08:40:51.268574	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 08:40:51.268574	2025-11-13 08:40:51.268574
0ec09ecb-f228-4848-af5d-98c025cc6f54	8e017478-2f5f-4be3-b8b6-e389436ca28a	dc5982bf-8262-4978-9fef-2f1fbfbd8944	dc729873-5d8c-47c1-8e5a-35979188bf5f	1.000	\N	\N	\N	2025-11-13 09:15:15.236142	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:15:15.236142	2025-11-13 09:15:15.236142
cf91cd77-2184-4a66-af7d-ca7b4957dbc8	8e017478-2f5f-4be3-b8b6-e389436ca28a	10e63015-88f4-4144-9420-a74ef29016e8	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-13 09:15:15.236142	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:15:15.236142	2025-11-13 09:15:15.236142
7851bd84-24b2-4609-989a-8db576f8715a	8e017478-2f5f-4be3-b8b6-e389436ca28a	0ebd39cb-c1f5-49ac-9bee-8e034b118b20	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-13 09:56:58.502214	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 09:56:58.502214	2025-11-13 09:56:58.502214
54743f67-ea1c-4047-bf5b-5237a6510209	8e017478-2f5f-4be3-b8b6-e389436ca28a	93d54581-ca0a-4e5f-ab51-f5bd71d116e8	0c2a72d8-80cf-450a-b1a9-445d9869c86e	3.000	\N	\N	\N	2025-11-13 10:21:05.907316	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-13 10:21:05.907316	2025-11-13 10:21:05.907316
f1b9cfc0-0067-49aa-92a7-cc3f068f0432	8e017478-2f5f-4be3-b8b6-e389436ca28a	d3c373b3-d65b-45b9-8708-f00ba16afd98	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-14 02:06:57.065882	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:06:57.065882	2025-11-14 02:06:57.065882
dd776a5a-8f22-48d2-b6d3-cde057e26532	8e017478-2f5f-4be3-b8b6-e389436ca28a	ff8be314-eef3-464e-99c4-95c45c256517	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-14 02:07:19.961212	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:07:19.961212	2025-11-14 02:07:19.961212
4bdf49a2-3ed3-4fdd-884a-5c3e7b34c968	8e017478-2f5f-4be3-b8b6-e389436ca28a	ec7efa1c-410f-489e-b297-e4ec797b8145	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-14 02:18:38.005288	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:18:38.005288	2025-11-14 02:18:38.005288
a14573e8-ca89-4bbe-b7c6-1e3c4dd62430	8e017478-2f5f-4be3-b8b6-e389436ca28a	80e74f61-d016-4820-ab46-32ec9011d4ee	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-14 02:20:02.889201	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:20:02.889201	2025-11-14 02:20:02.889201
76ca0058-0712-419e-87a2-c9602db7f51b	8e017478-2f5f-4be3-b8b6-e389436ca28a	48a78aee-8668-4121-8dc6-93f3deed213f	0c2a72d8-80cf-450a-b1a9-445d9869c86e	1.000	\N	\N	\N	2025-11-14 02:57:50.450041	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	2025-11-14 02:57:50.450041	2025-11-14 02:57:50.450041
\.


--
-- Data for Name: sales_orders; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sales_orders (id, tenant_id, order_number, customer_id, order_date, status, workflow_state, total_amount, notes, created_at, updated_at, created_by, updated_by, shipping_location_id, shipping_method_id, tracking_number, delivery_instructions, requested_delivery_date) FROM stdin;
0be43aa0-0e67-4329-8021-719c6aec65b4	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0019	b47cb571-8386-4429-b4c8-c784354e3d12	2025-11-14	packed	ship	5.00	\N	2025-11-14 02:05:05.015347	2025-11-14 02:21:26.432	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-14
089902ea-9c3d-41ee-a9e6-25520780d2b0	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0003	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	2025-11-05	packed	ship	1000.00	\N	2025-11-05 04:25:21.200263	2025-11-09 02:52:33.668	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-13
74e9c94c-13ea-4819-a948-524f40e2dbd2	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0021	c27afe7c-e2a9-4525-a4fe-96983a02c9bb	2025-11-14	packed	ship	5.00	\N	2025-11-14 02:17:09.391139	2025-11-14 02:28:32.192	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-14
dba473ab-546d-45ea-a2f5-b0e354d16684	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0020	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	2025-11-14	packed	ship	5.00	\N	2025-11-14 02:16:19.55013	2025-11-14 02:55:53.365	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-14
52b517eb-ff0f-476e-9e1d-f48e4d2daf6b	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0007	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-09	allocated	pick	1850.00	\N	2025-11-09 04:28:40.574923	2025-11-09 04:29:41.951	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-19
af4d9683-8428-4a9c-a269-f38f2b012202	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0004	b61622e4-9ea7-44de-8598-7e897818c023	2025-11-05	allocated	pick	3000.00	\N	2025-11-05 07:55:39.257741	2025-11-09 04:30:15.941	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-28
7d90cf0f-3e76-40a9-a697-cb07862b7855	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0006	b47cb571-8386-4429-b4c8-c784354e3d12	2025-11-09	allocated	pick	900.00	\N	2025-11-09 03:39:45.106277	2025-11-09 04:35:05.299	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-20
9ef0d521-b587-43bf-9c3e-705fea4f84c0	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0005	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-09	allocated	pick	3500.00	\N	2025-11-09 03:36:34.100509	2025-11-09 05:28:59.292	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-19
9db8730f-fed4-4dc1-aacd-2e9d2edc3e56	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0022	b47cb571-8386-4429-b4c8-c784354e3d12	2025-11-14	packed	ship	5.00	\N	2025-11-14 02:56:45.961487	2025-11-14 02:59:06.962	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-14
a2e3ccdf-83fb-493b-9fc1-5724c9fe863a	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0008	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-10	packed	ship	2500.00	\N	2025-11-10 06:47:51.718456	2025-11-10 07:11:55.932	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-20
690ebd60-7169-4beb-b53f-c44392bd715e	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0009	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	2025-11-10	allocated	pick	5000.00	\N	2025-11-10 08:21:32.804071	2025-11-10 08:23:10.755	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-20
b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0010	b47cb571-8386-4429-b4c8-c784354e3d12	2025-11-12	shipped	deliver	100.00	\N	2025-11-12 02:14:12.552689	2025-11-12 04:07:54.439	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	NFI251112001	\N	2025-11-20
773238c7-aed6-4049-8aa2-782df99182ba	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0011	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-12	shipped	deliver	20.00	\N	2025-11-12 04:12:53.503397	2025-11-12 04:28:21.554	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	JNEYES251112001	\N	2025-11-12
4db87969-8444-49ea-af53-7f7f80fcd8b9	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0012	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	2025-11-12	delivered	complete	10.00	\N	2025-11-12 04:40:27.874839	2025-11-13 07:44:58.388	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	JNEREG251112001	\N	2025-11-12
a5da06d3-8233-41c1-b34a-4f0fe8e22dde	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0013	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-12	delivered	complete	20.00	dse	2025-11-12 08:33:33.285201	2025-11-13 08:10:09.793	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	NFI251112002	DI	2025-11-12
1f65dc4e-93ca-476c-8254-c8cd25cc574e	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0014	b47cb571-8386-4429-b4c8-c784354e3d12	2025-11-13	delivered	complete	10.00	\N	2025-11-13 08:39:38.000229	2025-11-13 08:50:03.087	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	NAF251113001	\N	2025-11-13
877ebb32-a9c9-4df3-af4f-5038c8cb43ac	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0015	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-13	delivered	complete	10.00	\N	2025-11-13 09:13:49.432007	2025-11-13 09:20:02.656	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	JNEYES251113001	\N	2025-11-13
efb53562-d2e9-49a7-8ca8-364c8c760457	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0016	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-13	delivered	complete	5.00	\N	2025-11-13 09:55:16.923178	2025-11-13 10:02:42.657	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	JNEYES251113002	\N	2025-11-13
76a1aa22-f63c-48f1-9d91-2edb698d6742	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0017	2c0bbfda-f400-4386-a79f-9b6a15fd3c1f	2025-11-13	delivered	complete	15.00	\N	2025-11-13 10:19:32.212319	2025-11-13 10:27:05.302	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	JNEYES251113003	\N	2025-11-13
8a85b1d6-e597-4fe3-a21a-5a04026ade9d	8e017478-2f5f-4be3-b8b6-e389436ca28a	SO-2511-NORTH-0018	b8746e22-3661-4c44-864f-05d7a2d56b2f	2025-11-14	picked	pack	5.00	\N	2025-11-14 02:04:24.557762	2025-11-14 02:07:22.897	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	\N	\N	\N	\N	2025-11-14
\.


--
-- Data for Name: sample_module; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sample_module (id, name, description, status, is_public, tenant_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: shelves; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shelves (id, aisle_id, tenant_id, name, description, created_at) FROM stdin;
44f8b721-9d36-49c7-ae98-9a9e05cab684	05957666-6e8a-43c6-98f1-2db56373ab30	8e017478-2f5f-4be3-b8b6-e389436ca28a	Shelf L1	Level 1 shelf	2025-10-21 10:47:45.2641
\.


--
-- Data for Name: shipments; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shipments (id, tenant_id, sales_order_id, shipment_number, shipping_method_id, shipping_date, delivery_date, actual_delivery_date, tracking_number, carrier_name, total_weight, total_volume, total_cost, status, shipment_document_id, notes, created_at, updated_at, created_by, updated_by, transporter_id) FROM stdin;
b1adf5da-3a11-46e8-8e85-452e150d8bc0	8e017478-2f5f-4be3-b8b6-e389436ca28a	b6ac2523-a958-494d-9e3a-7ed95f1c0bc4	SHIP-2511-DHL-0007	120d141b-be21-42fa-9cd6-b019daa7bb54	2025-11-12 00:00:00	2025-11-13 00:00:00	\N	NFI251112001	\N	\N	\N	\N	ready	d2527c62-8d64-49f5-b31f-b7361cba6e05	notes	2025-11-12 04:07:47.647485	2025-11-12 04:07:58.657	\N	\N	8921b1ce-d30d-4f10-949e-000fc8873353
f3b7a96a-026c-4db9-8c30-cb78f125be2b	8e017478-2f5f-4be3-b8b6-e389436ca28a	773238c7-aed6-4049-8aa2-782df99182ba	SHIP-2511-DHL-0008	dbc16482-0c15-4c36-99bd-84d3b525503c	2025-11-12 00:00:00	2025-11-13 00:00:00	\N	JNEYES251112001	\N	\N	\N	\N	ready	8adc6981-ad63-4578-89bf-f6a739d5f893	testd	2025-11-12 04:28:14.599929	2025-11-12 04:28:25.49	\N	\N	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9
378ff23f-3084-47c2-9f8d-301012502049	8e017478-2f5f-4be3-b8b6-e389436ca28a	4db87969-8444-49ea-af53-7f7f80fcd8b9	SHIP-2511-DHL-0009	8606dc86-149b-4fb6-8d27-37c284505947	2025-11-12 00:00:00	2025-11-12 00:00:00	\N	JNEREG251112001	\N	\N	\N	\N	delivered	8aa81058-4744-439f-a284-5d5551fa22f4	serf	2025-11-12 04:47:55.481995	2025-11-13 07:44:57.891	\N	\N	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9
dae70b8b-b5b6-45a9-baff-f8e7883d0a2f	8e017478-2f5f-4be3-b8b6-e389436ca28a	a5da06d3-8233-41c1-b34a-4f0fe8e22dde	SHIP-2511-DHL-0010	120d141b-be21-42fa-9cd6-b019daa7bb54	2025-11-12 00:00:00	2025-11-12 00:00:00	\N	NFI251112002	\N	\N	\N	22.00	delivered	4ee4cce4-3831-4ec4-9182-f22bcca0c40b	\N	2025-11-12 08:58:52.384288	2025-11-13 08:10:09.261	\N	\N	8921b1ce-d30d-4f10-949e-000fc8873353
2651a23c-b1a8-4601-b09e-c78982d72ff6	8e017478-2f5f-4be3-b8b6-e389436ca28a	1f65dc4e-93ca-476c-8254-c8cd25cc574e	SHIP-2511-DHL-0011	120d141b-be21-42fa-9cd6-b019daa7bb54	2025-11-13 00:00:00	2025-11-13 00:00:00	\N	NAF251113001	\N	\N	\N	12.00	delivered	709ca278-c5af-4780-aee3-3a33ccfd9172	\N	2025-11-13 08:48:44.804186	2025-11-13 08:50:02.532	\N	\N	8921b1ce-d30d-4f10-949e-000fc8873353
342f6ef4-2719-48f1-bfad-6825deed9284	8e017478-2f5f-4be3-b8b6-e389436ca28a	877ebb32-a9c9-4df3-af4f-5038c8cb43ac	SHIP-2511-DHL-0012	dbc16482-0c15-4c36-99bd-84d3b525503c	2025-11-13 00:00:00	2025-11-13 00:00:00	\N	JNEYES251113001	\N	\N	\N	11.00	delivered	bfc9a5e4-755a-41b4-aa27-11546a16516e	\N	2025-11-13 09:18:34.559257	2025-11-13 09:20:02.202	\N	\N	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9
57939ebe-dedc-40d8-8949-755eff5345ce	8e017478-2f5f-4be3-b8b6-e389436ca28a	efb53562-d2e9-49a7-8ca8-364c8c760457	SHIP-2511-DHL-0013	dbc16482-0c15-4c36-99bd-84d3b525503c	2025-11-13 00:00:00	2025-11-13 00:00:00	\N	JNEYES251113002	\N	\N	\N	10.00	delivered	7278f041-a72c-4599-a99d-1b6a0cd2dea4	\N	2025-11-13 10:01:25.642725	2025-11-13 10:02:42.172	\N	\N	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9
cb39e6ba-d84a-40f4-9610-5f5d9dd61f52	8e017478-2f5f-4be3-b8b6-e389436ca28a	76a1aa22-f63c-48f1-9d91-2edb698d6742	SHIP-2511-DHL-0014	dbc16482-0c15-4c36-99bd-84d3b525503c	2025-11-13 00:00:00	2025-11-13 00:00:00	\N	JNEYES251113003	\N	\N	\N	9.00	delivered	38123127-bf2d-40ec-824e-495e8e7ce344	\N	2025-11-13 10:25:09.697755	2025-11-13 10:27:04.751	\N	\N	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9
\.


--
-- Data for Name: shipping_methods; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.shipping_methods (id, tenant_id, name, code, type, transporter_id, cost_calculation_method, base_cost, estimated_days, is_active, description, created_at, updated_at, created_by, updated_by) FROM stdin;
dbc16482-0c15-4c36-99bd-84d3b525503c	8e017478-2f5f-4be3-b8b6-e389436ca28a	JNE-YES	JNEYES	third_party	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9	fixed	18000.00	1	t	JNE YES	2025-11-11 08:43:16.118982	2025-11-11 08:43:16.118982	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
8606dc86-149b-4fb6-8d27-37c284505947	8e017478-2f5f-4be3-b8b6-e389436ca28a	JNE-REG	JNEREG	third_party	ed2cfc86-567a-4b36-92d0-fb6212dfb6e9	fixed	10000.00	\N	t	JNE Reguler	2025-11-11 08:40:59.145444	2025-11-11 08:55:35.542	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
120d141b-be21-42fa-9cd6-b019daa7bb54	8e017478-2f5f-4be3-b8b6-e389436ca28a	NAFIEN	NAFIEN	third_party	8921b1ce-d30d-4f10-949e-000fc8873353	fixed	11000.00	2	t	\N	2025-11-11 08:56:35.975189	2025-11-11 08:56:35.975189	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
486d6053-bc0a-4321-8162-325e9349542c	8e017478-2f5f-4be3-b8b6-e389436ca28a	Internal Pick Up	INTPU	internal	\N	fixed	14000.00	2	t	\N	2025-11-11 09:42:14.241705	2025-11-11 09:42:14.241705	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
8a0ae33e-3c1e-4809-9445-c4f8f9fcbc5f	8e017478-2f5f-4be3-b8b6-e389436ca28a	Internal Trucking	INTTCK	internal	\N	fixed	9000.00	2	t	\N	2025-11-11 08:42:09.712317	2025-11-11 09:42:25.211	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
\.


--
-- Data for Name: supplier_locations; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.supplier_locations (id, supplier_id, tenant_id, location_type, address, city, state, postal_code, country, latitude, longitude, contact_person, phone, email, is_active, created_at) FROM stdin;
6ad47e4d-3ed1-4e48-9291-1ba06e45cebd	13529b60-d2cb-4301-ac8d-2c2ed549eca5	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	3400 Industrial Parkway	Chicago	Illinois	60601	USA	41.878113	-87.629799	David Thompson	+1-555-0303	chicago@metroparts.com	t	2025-11-02 08:10:06.765097
cdfb0265-a157-4086-907a-53199747be63	13529b60-d2cb-4301-ac8d-2c2ed549eca5	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	7200 Commerce Street	Dallas	Texas	75201	USA	32.776665	-96.796989	Amanda Foster	+1-555-0313	dallas@metroparts.com	t	2025-11-02 08:10:06.765097
a5cda5f0-f8ea-479c-88be-7a2ad3a05959	929fe31e-3c78-4980-aaec-7b7b85b6f37a	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	1500 Technology Drive	San Jose	California	95110	USA	37.335480	-121.893028	John Martinez	+1-555-0101	warehouse.sj@globelectronics.com	t	2025-11-02 08:18:58.214101
62b2f7dc-46bd-4d00-8ea0-954c63946a7b	1252cb0b-d532-4278-974e-047b5ca4b828	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	8900 Harbor Boulevard	Seattle	Washington	98101	USA	47.606209	-122.332069	Sarah Chen	+1-555-0202	seattle@pacificwholesale.com	t	2025-11-02 08:19:54.990244
ccffda3f-3fcf-48fd-9a2c-e5b944cc8793	23910dd6-6148-45a6-9756-e73e646d1bdc	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	9800 Corporate Center Drive	Atlanta	Georgia	30301	USA	33.748995	-84.387982	Michael O'Connor	+1-555-0505	atlanta@nationwidemfg.com	t	2025-11-02 08:20:18.483457
573d10d1-fcae-41f4-af0b-512d0c371b34	23910dd6-6148-45a6-9756-e73e646d1bdc	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	4500 Distribution Parkway	Phoenix	Arizona	85001	USA	33.448377	-112.074037	Jennifer Lopez	+1-555-0515	phoenix@nationwidemfg.com	t	2025-11-02 08:20:18.483457
28fbf175-820e-4a59-b8e3-887ee4aab8f0	23910dd6-6148-45a6-9756-e73e646d1bdc	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	1200 Logistics Lane	Denver	Colorado	80201	USA	39.739236	-104.990251	Carlos Rivera	+1-555-0525	denver@nationwidemfg.com	t	2025-11-02 08:20:18.483457
119cff19-1e92-4b78-a626-4b65905c06e0	7fe4c8d4-2b25-4ea9-8cf6-b3b37044396d	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	5600 Manufacturing Way	Detroit	Michigan	48201	USA	42.331427	-83.045754	Lisa Rodriguez	+1-555-0404	detroit@amindust.com	t	2025-10-21 10:30:34.851347
35e83d99-9d5c-47f9-9bf9-97dd30f5440c	7fe4c8d4-2b25-4ea9-8cf6-b3b37044396d	8e017478-2f5f-4be3-b8b6-e389436ca28a	pickup	2100 Atlantic Avenue	Boston	Massachusetts	02101	USA	42.360082	-71.058880	Robert Kim	+1-555-0414	boston@amindust.com	t	2025-10-21 10:30:34.851347
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.suppliers (id, tenant_id, name, contact_person, email, phone, tax_id, created_at, updated_at) FROM stdin;
13529b60-d2cb-4301-ac8d-2c2ed549eca5	8e017478-2f5f-4be3-b8b6-e389436ca28a	Metro Parts & Components Ltd.	David Thompson	d.thompson@metroparts.com	+1-555-0303	TAX-MPC-2024	2025-10-21 10:30:04.090059	2025-11-02 08:10:05.726
929fe31e-3c78-4980-aaec-7b7b85b6f37a	8e017478-2f5f-4be3-b8b6-e389436ca28a	Global Electronics Supply Co.	John Martinez	j.martinez@globelectronics.com	+1-555-0101	TAX-GES-2024	2025-10-21 10:30:04.090059	2025-11-02 08:18:57.128
1252cb0b-d532-4278-974e-047b5ca4b828	8e017478-2f5f-4be3-b8b6-e389436ca28a	Pacific Wholesale Distribution	Sarah Chen	s.chen@pacificwholesale.com	+1-555-0202	TAX-PWD-2024	2025-10-21 10:30:04.090059	2025-11-02 08:19:53.919
23910dd6-6148-45a6-9756-e73e646d1bdc	8e017478-2f5f-4be3-b8b6-e389436ca28a	Nationwide Manufacturing Group	Michael O'Connor	m.oconnor@nationwidemfg.com	+1-555-0505	TAX-NMG-2024	2025-10-21 10:30:04.090059	2025-11-02 08:20:17.412
7fe4c8d4-2b25-4ea9-8cf6-b3b37044396d	8e017478-2f5f-4be3-b8b6-e389436ca28a	American Industrial Supplies	Lisa Rodriguez	l.rodriguez@amindust.com	+1-555-0404	TAX-AIS-2024	2025-10-21 10:30:04.090059	2025-11-03 01:56:26.899
\.


--
-- Data for Name: sys_module_auth; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_module_auth (id, module_id, module_name, tenant_id, is_enabled, enabled_at, enabled_by, created_at, updated_at) FROM stdin;
7d1595dc-3823-411e-a067-36fdb1a359ff	master-data	Master Data Management	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
af95b7a3-cdc7-42c2-821d-0ac559b2410a	warehouse-setup	Warehouse Setup	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
3665d2e8-4bc2-4344-84cc-5e634e5f35ea	inventory-items	Inventory Items	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
fd4a4ac6-69f6-4e15-bb30-691ddbb027ee	purchase-order	Purchase Order	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
1d78e302-8467-474c-8812-5232454ce336	workflow	Workflow Configuration	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
ee0ce141-2376-448f-b40f-91c3389bcd8c	master-data	Master Data Management	d1ce11d6-4950-4a6a-9c1d-42a719416498	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
b7a07f88-78da-4809-8121-ba510a1976fc	warehouse-setup	Warehouse Setup	d1ce11d6-4950-4a6a-9c1d-42a719416498	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
9c04d086-b073-43ab-869a-ff4354458e86	inventory-items	Inventory Items	d1ce11d6-4950-4a6a-9c1d-42a719416498	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
1dc5fffc-8046-4696-894a-18f0db24982e	purchase-order	Purchase Order	d1ce11d6-4950-4a6a-9c1d-42a719416498	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
0a96a01b-ec7e-4b58-aa70-82904ba0aa24	workflow	Workflow Configuration	d1ce11d6-4950-4a6a-9c1d-42a719416498	t	2025-10-21 08:29:27.839576	\N	2025-10-21 08:29:27.839576	2025-10-21 08:29:27.839576
0888c0f5-ffc4-40e2-b081-86df4c95d365	reports	Repoerts Module	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-25 12:11:40.366	sysadmin	2025-10-25 12:11:40.472191	2025-10-25 12:11:40.472191
5b4e7e6a-3fab-4ff7-af6c-3e6d2e37a062	sales-order	Sales Order	8e017478-2f5f-4be3-b8b6-e389436ca28a	t	2025-10-31 08:29:45.201	sysadmin	2025-10-31 08:29:45.314824	2025-10-31 08:29:45.314824
\.


--
-- Data for Name: sys_module_registry; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_module_registry (id, "moduleId", "moduleName", description, version, category, "isActive", "repositoryUrl", "documentationUrl", "createdAt", "updatedAt") FROM stdin;
7b646fb7-e3bf-467b-a144-a2d46c5819a7	sample-module	Sample Module	Sample module for demonstrating the modular architecture with CRUD operations	1.0.0	Sample	t	https://github.com/sample/sample-module	https://docs.sample.com/sample-module	2025-10-21 08:05:05.22444+00	2025-10-21 08:05:05.22444+00
8afa3d37-cea1-4ad6-a5a7-09fec95e1d11	reports	Repoerts Module	Reports Module; will include audit log, financial reportts, etc.	1.0.0	Business Logic	t			2025-10-25 12:11:26.260585+00	2025-10-25 12:11:26.260585+00
26e42c43-c0d3-458e-b8e9-9b9fa0e73a6f	sales-order	Sales Order	Comprehensive sales order management module with workflow-based order processing including allocation, picking, packing, shipping, and delivery tracking	1.0.0	Business	t	https://github.com/your-org/react-admin.git	https://github.com/your-org/react-admin/blob/main/src/modules/sales-order/docs	2025-10-31 07:43:41.242731+00	2025-10-31 07:43:41.242731+00
\.


--
-- Data for Name: sys_option; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_option (id, code, name, value, tenant_id, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: sys_permission; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_permission (id, code, name, description, tenant_id, "createdAt", "updatedAt") FROM stdin;
b8e8201f-12c2-48ac-92f4-13e9f97b52c0	system.tenant.view	View Tenant	Permission to view tenant	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
44dd7599-3c46-4d7a-a89f-c4947b2ef07f	system.tenant.create	Create Tenant	Permission to add tenant	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
bdcbf97c-a0ed-4010-b483-5ffb3f8e761e	system.tenant.edit	Edit Tenant	Permission to edit tenant	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
4a9af5ce-73b7-4c6c-8757-54854d496d68	system.tenant.delete	Delete Tenant	Permission to delete tenant	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
3bb5a975-ce10-4623-82cb-081212ff6998	system.user.view	View User	Permission to view user	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
36fe4905-eac5-4a14-a63a-7200160890f4	system.user.create	Create User	Permission to add user	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
6fd18699-6f20-4c3a-a78e-c60dcea2f09a	system.user.edit	Edit User	Permission to edit user	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
dc3d4df9-c4e8-4099-be14-f034075fbcd0	system.user.delete	Delete User	Permission to delete user	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
72122390-c467-4b5d-96c6-2ede83897b40	system.user.reset_password	Reset Password	Permission to reset password user	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
ec94ebef-a2d7-4a22-bbd0-13d95f8679d4	system.role.view	View Role	Permission to view role	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
bdd55b24-67ab-4efb-8f92-cab23abf9ca4	system.role.create	Create Role	Permission to add role	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
e295bc91-9adf-4d3d-8de2-34051686feab	system.role.edit	Edit Role	Permission to edit role	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
c5977b99-f1e2-4a56-9e04-a72544f5c14c	system.role.delete	Delete Role	Permission to delete role	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
f91c9820-afd5-47fd-ae71-b3768a70bf6b	system.permission.view	View Permission	Permission to view permission	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
dc74165f-2469-4a2e-b0dd-4dcfc891ae92	system.permission.create	Create Permission	Permission to add permission	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
f7df1bcf-157c-4f95-b41c-2f85799ecfaa	system.permission.edit	Edit Permission	Permission to edit permission	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
0d8838a7-2818-4d2a-a993-8033704e1bbd	system.permission.delete	Delete Permission	Permission to delete permission	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
c173b676-c2c2-478e-9fa2-b460dbb5474a	system.option.view	View Option	Permission to view option	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
0061c3c7-0368-4178-8fa2-1b7623fb1a5e	system.option.create	Create Option	Permission to add option	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
07a7c0c8-8c66-4e58-8b66-bdd9c33a37d4	system.option.edit	Edit Option	Permission to edit option	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
87e70fcc-0bb5-4958-9b5e-e839640a0184	system.option.delete	Delete Option	Permission to delete option	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
c268193a-e3f2-4fc3-b823-82fa76ee8111	system.module.view	View Module	Permission to view module	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
dcb0b2bd-6c62-44b1-a572-ad3e46698c3f	system.module.manage	Manage Module	Permission to manage module	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
fb7e0741-9097-4913-bc6a-c4e3a6a3f5fb	system.tenant.view	View Tenant	Permission to view tenant	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
0f92934f-8d3f-4dad-b978-0a5c4daa9116	system.tenant.edit	Edit Tenant	Permission to edit tenant	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
61e794ba-a6ee-4d22-a973-2c8b89333c3d	system.user.view	View User	Permission to view user	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
90922f62-eb7c-4a4a-8fd4-c3f63a6c5ec6	system.user.create	Create User	Permission to add user	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
927a4a7f-71cb-4b47-a50e-f3ea727570e4	system.user.edit	Edit User	Permission to edit user	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
a02f609f-8d26-45b3-88d2-5948d23a8ab9	system.user.delete	Delete User	Permission to delete user	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
05a2a8ed-e61d-4566-81be-e65663e974b7	system.user.reset_password	Reset Password	Permission to reset password user	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
6740e2c5-f4d4-4232-83c8-4caca0187325	system.role.view	View Role	Permission to view role	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
e2c26588-42b3-4810-bf13-8878dc07705b	system.role.create	Create Role	Permission to add role	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
410c3b13-bc38-4ce4-8963-6294edc67ea9	system.role.edit	Edit Role	Permission to edit role	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
a6b65933-291f-4696-b545-94e32a9a209f	system.role.delete	Delete Role	Permission to delete role	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
4aeae7f1-025c-487b-9b6b-deaffc977375	system.permission.view	View Permission	Permission to view permission	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
92df90cb-863c-4d81-b89e-75d0ceb67783	system.permission.create	Create Permission	Permission to add permission	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
29e700c2-34b9-4b2b-8f83-dbe8f11b3d91	system.permission.edit	Edit Permission	Permission to edit permission	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
532e0fa9-27f8-4243-af50-6c162a89af06	system.permission.delete	Delete Permission	Permission to delete permission	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
a72b1d7a-a064-4604-abcd-58fbcb93a1e8	system.option.view	View Option	Permission to view option	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
9572b136-714e-4c28-9245-24298887be43	system.option.create	Create Option	Permission to add option	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
cc69571e-fdcf-41d8-8370-3d0eb22a6fce	system.option.edit	Edit Option	Permission to edit option	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
df34c856-39e3-4820-8ecf-7cb822fbaea5	system.option.delete	Delete Option	Permission to delete option	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
6c40235d-1603-4d14-913a-81350a770c1e	system.module.view	View Module	Permission to view module	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
822c41b2-3e25-4482-b83a-7434064ba97a	system.module.manage	Manage Module	Permission to manage module	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:04.725532	2025-10-21 08:05:04.725532
\.


--
-- Data for Name: sys_role; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_role (id, code, name, description, is_system, tenant_id, "createdAt", "updatedAt") FROM stdin;
989104c2-47ea-4641-bef8-82790e1dcba5	SYSADMIN	System Admin	Role System Admin	t	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:03.234422	2025-10-21 08:05:03.234422
85e161be-79cd-4cd8-9f03-e2cdc81c3d7c	USER	Role User	Regular user role	f	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:03.234422	2025-10-21 08:05:03.234422
daa85808-5d78-44e8-a0af-9aa0c04c3925	SYSADMIN	System Admin	Role System Admin	t	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:03.234422	2025-10-21 08:05:03.234422
6112d5b2-b008-4d62-b279-a6d9dc7c2df1	USER	Role User	Regular user role	f	d1ce11d6-4950-4a6a-9c1d-42a719416498	2025-10-21 08:05:03.234422	2025-10-21 08:05:03.234422
\.


--
-- Data for Name: sys_role_permission; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_role_permission (role_id, permission_id, tenant_id) FROM stdin;
\.


--
-- Data for Name: sys_tenant; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_tenant (id, code, name, description, "createdAt", "updatedAt") FROM stdin;
8e017478-2f5f-4be3-b8b6-e389436ca28a	SYSTEM	System	System Tenant	2025-10-21 08:05:02.151173	2025-10-21 08:05:02.151173
d1ce11d6-4950-4a6a-9c1d-42a719416498	PUBLIC	Public	Public Tenant	2025-10-21 08:05:02.151173	2025-10-21 08:05:02.151173
caa7a5cb-6029-47e9-b60a-aa213dfdfb58	TEST-TENANT-2	Test Tenant Two	For testing cross-tenant data isolation	2025-10-22 08:10:19.867822	2025-10-22 08:10:19.867822
\.


--
-- Data for Name: sys_user; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_user (id, username, password_hash, fullname, status, email, avatar, tenant_id, "createdAt", "updatedAt") FROM stdin;
4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	sysadmin	$2b$10$5FHz0bYyAGcgbLCL9wViJOeyM91QeAPoAvLR37UKMY/gX8YAu.IW2	System Admin	active	\N	\N	8e017478-2f5f-4be3-b8b6-e389436ca28a	2025-10-21 08:05:02.7353	2025-10-21 08:05:02.7353
\.


--
-- Data for Name: sys_user_role; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_user_role (user_id, role_id, tenant_id) FROM stdin;
4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	989104c2-47ea-4641-bef8-82790e1dcba5	8e017478-2f5f-4be3-b8b6-e389436ca28a
4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	daa85808-5d78-44e8-a0af-9aa0c04c3925	d1ce11d6-4950-4a6a-9c1d-42a719416498
\.


--
-- Data for Name: sys_user_tenant; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sys_user_tenant (user_id, tenant_id) FROM stdin;
4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	8e017478-2f5f-4be3-b8b6-e389436ca28a
4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	d1ce11d6-4950-4a6a-9c1d-42a719416498
\.


--
-- Data for Name: transporters; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.transporters (id, tenant_id, name, code, contact_person, phone, email, website, service_areas, is_active, notes, created_at, updated_at, created_by, updated_by) FROM stdin;
8921b1ce-d30d-4f10-949e-000fc8873353	8e017478-2f5f-4be3-b8b6-e389436ca28a	Nafien	NFI	Agus		agus@neo-fusion.com		\N	t		2025-11-10 10:25:41.209019	2025-11-10 10:25:41.209019	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
ed2cfc86-567a-4b36-92d0-fb6212dfb6e9	8e017478-2f5f-4be3-b8b6-e389436ca28a	JNE	JNE	Tama		tama@jne.com		\N	t		2025-11-10 10:26:08.023535	2025-11-11 08:40:10.116	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82	4f56c3b2-9e5e-4a75-9326-ccb3ef02bd82
\.


--
-- Data for Name: warehouse_configs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.warehouse_configs (id, warehouse_id, tenant_id, picking_strategy, auto_assign_bins, require_batch_tracking, require_expiry_tracking, created_at, updated_at) FROM stdin;
cea651a3-6816-4bcb-8f3b-73c7c674b02c	1a936892-d57c-491d-a5f9-b0fe1b32d90d	8e017478-2f5f-4be3-b8b6-e389436ca28a	FEFO	f	f	f	2025-10-21 11:57:28.33799	2025-10-24 09:56:01.794
\.


--
-- Data for Name: warehouses; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.warehouses (id, tenant_id, name, address, is_active, created_at, updated_at) FROM stdin;
1a936892-d57c-491d-a5f9-b0fe1b32d90d	8e017478-2f5f-4be3-b8b6-e389436ca28a	Main Warehouse	Building A, 123 Industrial Drive Logan UT 94321	t	2025-10-21 10:46:37.588223	2025-10-24 09:56:01.279
\.


--
-- Data for Name: workflow_steps; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workflow_steps (id, workflow_id, step_key, step_name, step_order, is_initial, is_terminal, required_fields, created_at, updated_at, is_active) FROM stdin;
2debd54c-54d4-4009-9c8b-d85c3bfa264a	cc53cb48-1fc1-4b13-9014-cd488069044f	create	Create	1	t	f	\N	2025-10-21 08:05:08.208056	2025-10-21 08:05:08.208056	t
943fc1e0-591a-4984-9990-2f3dec8748df	cc53cb48-1fc1-4b13-9014-cd488069044f	approve	Approve	2	f	f	\N	2025-10-21 08:05:08.208056	2025-10-21 08:05:08.208056	t
5b45eec0-d426-4f07-9911-d14ead8af2c2	cc53cb48-1fc1-4b13-9014-cd488069044f	receive	Receive	3	f	f	\N	2025-10-21 08:05:08.208056	2025-10-21 08:05:08.208056	t
1d6057e2-65d0-4faf-9ea7-f8341d8c24a9	cc53cb48-1fc1-4b13-9014-cd488069044f	putaway	Putaway	4	f	f	\N	2025-10-21 08:05:08.208056	2025-10-21 08:05:08.208056	t
1545437d-fc37-4b08-927e-0cfde13ac389	cc53cb48-1fc1-4b13-9014-cd488069044f	complete	Complete	5	f	t	\N	2025-10-21 08:05:08.208056	2025-10-21 08:05:08.208056	t
c5f2d7a0-bc1f-47ca-9789-340c685b3c39	c073eacb-0670-47ab-8aef-ebdfbb6dea27	create	Create	1	t	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
7f968199-5c85-4340-8547-d3f225df7ac6	c073eacb-0670-47ab-8aef-ebdfbb6dea27	allocate	Allocate	2	f	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
f0a219a7-f0e8-4229-8426-d78436cd3cad	c073eacb-0670-47ab-8aef-ebdfbb6dea27	pick	Pick	3	f	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
0796fc3b-225f-4c51-9c80-b51bd3ec239a	c073eacb-0670-47ab-8aef-ebdfbb6dea27	pack	Pack	4	f	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
e051bd3a-9353-4277-a502-14d2ebb22b51	c073eacb-0670-47ab-8aef-ebdfbb6dea27	ship	Ship	5	f	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
f079e311-e22c-4de3-9d30-76bb625c72be	c073eacb-0670-47ab-8aef-ebdfbb6dea27	deliver	Deliver	6	f	f	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
c057f3db-3837-4f37-a767-d254eec37e27	c073eacb-0670-47ab-8aef-ebdfbb6dea27	complete	Complete	7	f	t	\N	2025-10-21 08:05:09.198502	2025-10-21 08:05:09.198502	t
fd67c998-9916-414f-978b-b748f9f46e0d	9767d7ba-242f-4313-a8cb-29780e4984d0	create	Create	1	t	f	\N	2025-10-21 08:05:06.224119	2025-10-31 11:11:49.956	t
f5eaf97b-1301-4d56-82d8-a4826f8bbad6	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	create	Create	1	t	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:50.284	t
1effc4ca-f632-4ca7-8e0a-fb3af70e0b2b	9767d7ba-242f-4313-a8cb-29780e4984d0	complete	Complete	5	f	t	\N	2025-10-21 08:05:06.224119	2025-10-31 11:11:50.375	t
d31fd278-33ef-4c5c-9a66-f35fa1ed01c8	9767d7ba-242f-4313-a8cb-29780e4984d0	approve	Approve	2	f	f	\N	2025-10-21 08:05:06.224119	2025-10-31 11:11:50.388	t
6d04df8d-e4a3-4a62-846a-482478d827ad	9767d7ba-242f-4313-a8cb-29780e4984d0	putaway	Putaway	4	f	f	\N	2025-10-21 08:05:06.224119	2025-10-31 11:11:50.389	t
f7c11a0e-cbc0-4ca3-a2a3-4be342d43726	9767d7ba-242f-4313-a8cb-29780e4984d0	receive	Receive	3	f	f	\N	2025-10-21 08:05:06.224119	2025-10-31 11:11:50.411	t
3ea953d7-702e-4436-bee9-b7860faf08df	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	allocate	Allocate	2	f	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.469	t
60b2090f-c318-467d-890f-612818bfa2b1	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	pick	Pick	3	f	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.818	t
dfeab92f-9fef-4bb1-8e7e-01f02b5eed8c	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	pack	Pack	4	f	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.987	t
d6afe1e2-7c65-4a7a-9be9-150f1075e69f	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	deliver	Deliver	6	f	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.988	t
fb97e8d2-6cc4-4c46-93c5-73472f8fffc1	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	ship	Ship	5	f	f	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.993	t
bb69a01d-0f1f-43a9-8589-88192210dbcb	b6b3d3e5-2668-4137-8785-e2c1b8a42f35	complete	Complete	7	f	t	\N	2025-10-21 08:05:07.217368	2025-10-31 11:11:52.834	t
\.


--
-- Data for Name: workflows; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.workflows (id, tenant_id, name, type, is_default, is_active, created_at, updated_at) FROM stdin;
9767d7ba-242f-4313-a8cb-29780e4984d0	8e017478-2f5f-4be3-b8b6-e389436ca28a	Standard Purchase Order Workflow	PURCHASE_ORDER	t	t	2025-10-21 08:05:05.725334	2025-10-21 08:05:05.725334
b6b3d3e5-2668-4137-8785-e2c1b8a42f35	8e017478-2f5f-4be3-b8b6-e389436ca28a	Standard Sales Order Workflow	SALES_ORDER	t	t	2025-10-21 08:05:06.722275	2025-10-21 08:05:06.722275
cc53cb48-1fc1-4b13-9014-cd488069044f	d1ce11d6-4950-4a6a-9c1d-42a719416498	Standard Purchase Order Workflow	PURCHASE_ORDER	t	t	2025-10-21 08:05:07.713168	2025-10-21 08:05:07.713168
c073eacb-0670-47ab-8aef-ebdfbb6dea27	d1ce11d6-4950-4a6a-9c1d-42a719416498	Standard Sales Order Workflow	SALES_ORDER	t	t	2025-10-21 08:05:08.703383	2025-10-21 08:05:08.703383
\.


--
-- Data for Name: zones; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.zones (id, warehouse_id, tenant_id, name, description, created_at) FROM stdin;
24905214-b18c-4938-8d25-703bf5bce779	1a936892-d57c-491d-a5f9-b0fe1b32d90d	8e017478-2f5f-4be3-b8b6-e389436ca28a	Zone A - General Storage	Main storage zone	2025-10-21 10:47:45.2641
\.


--
-- Name: adjustment_items adjustment_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustment_items
    ADD CONSTRAINT adjustment_items_pkey PRIMARY KEY (id);


--
-- Name: adjustments adjustments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_pkey PRIMARY KEY (id);


--
-- Name: aisles aisles_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.aisles
    ADD CONSTRAINT aisles_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bins bins_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_pkey PRIMARY KEY (id);


--
-- Name: customer_locations customer_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_pkey PRIMARY KEY (id);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: cycle_count_items cycle_count_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_pkey PRIMARY KEY (id);


--
-- Name: cycle_counts cycle_counts_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_counts
    ADD CONSTRAINT cycle_counts_pkey PRIMARY KEY (id);


--
-- Name: cycle_counts cycle_counts_tenant_count_number_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_counts
    ADD CONSTRAINT cycle_counts_tenant_count_number_unique UNIQUE (tenant_id, count_number);


--
-- Name: deliveries deliveries_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_pkey PRIMARY KEY (id);


--
-- Name: deliveries deliveries_shipment_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_shipment_id_key UNIQUE (shipment_id);


--
-- Name: delivery_items delivery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_pkey PRIMARY KEY (id);


--
-- Name: demo_department demo_department_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.demo_department
    ADD CONSTRAINT demo_department_pkey PRIMARY KEY (id);


--
-- Name: document_number_config document_number_config_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_config
    ADD CONSTRAINT document_number_config_pkey PRIMARY KEY (id);


--
-- Name: document_number_history document_number_history_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_history
    ADD CONSTRAINT document_number_history_pkey PRIMARY KEY (id);


--
-- Name: document_sequence_tracker document_sequence_tracker_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_sequence_tracker
    ADD CONSTRAINT document_sequence_tracker_pkey PRIMARY KEY (id);


--
-- Name: generated_documents generated_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_pkey PRIMARY KEY (id);


--
-- Name: inventory_items inventory_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_pkey PRIMARY KEY (id);


--
-- Name: package_items package_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_items
    ADD CONSTRAINT package_items_pkey PRIMARY KEY (id);


--
-- Name: package_types package_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_types
    ADD CONSTRAINT package_types_pkey PRIMARY KEY (id);


--
-- Name: packages packages_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_pkey PRIMARY KEY (id);


--
-- Name: packages packages_tenant_id_shipment_id_package_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_tenant_id_shipment_id_package_number_key UNIQUE (tenant_id, shipment_id, package_number);


--
-- Name: product_types product_types_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders_receipt purchase_orders_receipt_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders_receipt
    ADD CONSTRAINT purchase_orders_receipt_pkey PRIMARY KEY (id);


--
-- Name: receipt_items receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: sales_order_allocations sales_order_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_allocations
    ADD CONSTRAINT sales_order_allocations_pkey PRIMARY KEY (id);


--
-- Name: sales_order_item_locations sales_order_item_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_item_locations
    ADD CONSTRAINT sales_order_item_locations_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_tenant_id_sales_order_id_line_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_tenant_id_sales_order_id_line_number_key UNIQUE (tenant_id, sales_order_id, line_number);


--
-- Name: sales_order_picks sales_order_picks_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_picks
    ADD CONSTRAINT sales_order_picks_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_tenant_id_order_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_tenant_id_order_number_key UNIQUE (tenant_id, order_number);


--
-- Name: sample_module sample_module_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sample_module
    ADD CONSTRAINT sample_module_pkey PRIMARY KEY (id);


--
-- Name: shelves shelves_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_pkey PRIMARY KEY (id);


--
-- Name: shipments shipments_tenant_id_sales_order_id_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_tenant_id_sales_order_id_key UNIQUE (tenant_id, sales_order_id);


--
-- Name: shipments shipments_tenant_id_shipment_number_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_tenant_id_shipment_number_key UNIQUE (tenant_id, shipment_number);


--
-- Name: shipping_methods shipping_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_pkey PRIMARY KEY (id);


--
-- Name: shipping_methods shipping_methods_tenant_id_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: supplier_locations supplier_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_locations
    ADD CONSTRAINT supplier_locations_pkey PRIMARY KEY (id);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: sys_module_auth sys_module_auth_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_module_auth
    ADD CONSTRAINT sys_module_auth_pkey PRIMARY KEY (id);


--
-- Name: sys_module_registry sys_module_registry_moduleId_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_module_registry
    ADD CONSTRAINT "sys_module_registry_moduleId_unique" UNIQUE ("moduleId");


--
-- Name: sys_module_registry sys_module_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_module_registry
    ADD CONSTRAINT sys_module_registry_pkey PRIMARY KEY (id);


--
-- Name: sys_option sys_option_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_option
    ADD CONSTRAINT sys_option_pkey PRIMARY KEY (id);


--
-- Name: sys_permission sys_permission_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_pkey PRIMARY KEY (id);


--
-- Name: sys_role_permission sys_role_permission_role_id_permission_id_tenant_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_role_id_permission_id_tenant_id_pk PRIMARY KEY (role_id, permission_id, tenant_id);


--
-- Name: sys_role sys_role_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_pkey PRIMARY KEY (id);


--
-- Name: sys_tenant sys_tenant_code_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_tenant
    ADD CONSTRAINT sys_tenant_code_unique UNIQUE (code);


--
-- Name: sys_tenant sys_tenant_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_tenant
    ADD CONSTRAINT sys_tenant_pkey PRIMARY KEY (id);


--
-- Name: sys_user sys_user_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_pkey PRIMARY KEY (id);


--
-- Name: sys_user_role sys_user_role_user_id_role_id_tenant_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_role
    ADD CONSTRAINT sys_user_role_user_id_role_id_tenant_id_pk PRIMARY KEY (user_id, role_id, tenant_id);


--
-- Name: sys_user_tenant sys_user_tenant_user_id_tenant_id_pk; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_tenant
    ADD CONSTRAINT sys_user_tenant_user_id_tenant_id_pk PRIMARY KEY (user_id, tenant_id);


--
-- Name: sys_user sys_user_username_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_username_unique UNIQUE (username);


--
-- Name: transporters transporters_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_pkey PRIMARY KEY (id);


--
-- Name: transporters transporters_tenant_id_code_key; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_tenant_id_code_key UNIQUE (tenant_id, code);


--
-- Name: warehouse_configs warehouse_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouse_configs
    ADD CONSTRAINT warehouse_configs_pkey PRIMARY KEY (id);


--
-- Name: warehouses warehouses_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_pkey PRIMARY KEY (id);


--
-- Name: workflow_steps workflow_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_pkey PRIMARY KEY (id);


--
-- Name: workflows workflows_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_pkey PRIMARY KEY (id);


--
-- Name: zones zones_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_pkey PRIMARY KEY (id);


--
-- Name: adjustment_items_adjustment_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustment_items_adjustment_idx ON public.adjustment_items USING btree (adjustment_id);


--
-- Name: adjustment_items_inventory_item_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustment_items_inventory_item_idx ON public.adjustment_items USING btree (inventory_item_id);


--
-- Name: adjustment_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustment_items_tenant_idx ON public.adjustment_items USING btree (tenant_id);


--
-- Name: adjustments_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustments_created_at_idx ON public.adjustments USING btree (created_at);


--
-- Name: adjustments_cycle_count_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustments_cycle_count_idx ON public.adjustments USING btree (cycle_count_id);


--
-- Name: adjustments_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustments_status_idx ON public.adjustments USING btree (status);


--
-- Name: adjustments_tenant_adjustment_number_unique; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX adjustments_tenant_adjustment_number_unique ON public.adjustments USING btree (tenant_id, adjustment_number);


--
-- Name: adjustments_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX adjustments_tenant_idx ON public.adjustments USING btree (tenant_id);


--
-- Name: aisles_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX aisles_unique_idx ON public.aisles USING btree (zone_id, name);


--
-- Name: audit_logs_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_created_at_idx ON public.audit_logs USING btree (created_at DESC NULLS LAST);


--
-- Name: audit_logs_resource_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_resource_idx ON public.audit_logs USING btree (resource_type, resource_id);


--
-- Name: audit_logs_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_tenant_idx ON public.audit_logs USING btree (tenant_id);


--
-- Name: audit_logs_tenant_time_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX audit_logs_tenant_time_idx ON public.audit_logs USING btree (tenant_id, created_at DESC NULLS LAST);


--
-- Name: bins_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX bins_unique_idx ON public.bins USING btree (shelf_id, name);


--
-- Name: customers_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX customers_unique_idx ON public.customers USING btree (tenant_id, name);


--
-- Name: cycle_count_items_bin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_count_items_bin_idx ON public.cycle_count_items USING btree (bin_id);


--
-- Name: cycle_count_items_cycle_count_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_count_items_cycle_count_idx ON public.cycle_count_items USING btree (cycle_count_id);


--
-- Name: cycle_count_items_product_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_count_items_product_idx ON public.cycle_count_items USING btree (product_id);


--
-- Name: cycle_count_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_count_items_tenant_idx ON public.cycle_count_items USING btree (tenant_id);


--
-- Name: cycle_counts_created_at_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_counts_created_at_idx ON public.cycle_counts USING btree (created_at DESC);


--
-- Name: cycle_counts_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_counts_status_idx ON public.cycle_counts USING btree (status);


--
-- Name: cycle_counts_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX cycle_counts_tenant_idx ON public.cycle_counts USING btree (tenant_id);


--
-- Name: deliveries_shipment_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX deliveries_shipment_unique_idx ON public.deliveries USING btree (shipment_id);


--
-- Name: deliveries_so_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deliveries_so_idx ON public.deliveries USING btree (sales_order_id);


--
-- Name: deliveries_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deliveries_status_idx ON public.deliveries USING btree (status);


--
-- Name: deliveries_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX deliveries_tenant_idx ON public.deliveries USING btree (tenant_id);


--
-- Name: delivery_items_delivery_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX delivery_items_delivery_idx ON public.delivery_items USING btree (delivery_id);


--
-- Name: delivery_items_product_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX delivery_items_product_idx ON public.delivery_items USING btree (product_id);


--
-- Name: delivery_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX delivery_items_tenant_idx ON public.delivery_items USING btree (tenant_id);


--
-- Name: demo_department_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX demo_department_unique_idx ON public.demo_department USING btree (name, tenant_id);


--
-- Name: doc_num_config_tenant_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX doc_num_config_tenant_type_idx ON public.document_number_config USING btree (tenant_id, document_type);


--
-- Name: doc_num_history_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX doc_num_history_number_idx ON public.document_number_history USING btree (tenant_id, generated_number);


--
-- Name: doc_seq_tracker_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX doc_seq_tracker_unique_idx ON public.document_sequence_tracker USING btree (tenant_id, document_type, period, prefix1, prefix2);


--
-- Name: gen_docs_number_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX gen_docs_number_idx ON public.generated_documents USING btree (tenant_id, document_number);


--
-- Name: gen_docs_ref_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX gen_docs_ref_idx ON public.generated_documents USING btree (tenant_id, reference_type, reference_id, document_type);


--
-- Name: idx_package_items_package; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_package_items_package ON public.package_items USING btree (package_id);


--
-- Name: idx_package_items_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_package_items_product ON public.package_items USING btree (product_id);


--
-- Name: idx_package_items_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_package_items_tenant ON public.package_items USING btree (tenant_id);


--
-- Name: idx_packages_barcode; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_packages_barcode ON public.packages USING btree (barcode);


--
-- Name: idx_packages_shipment; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_packages_shipment ON public.packages USING btree (shipment_id);


--
-- Name: idx_packages_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_packages_tenant ON public.packages USING btree (tenant_id);


--
-- Name: idx_sales_order_allocations_inventory; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_allocations_inventory ON public.sales_order_allocations USING btree (inventory_item_id);


--
-- Name: idx_sales_order_allocations_item; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_allocations_item ON public.sales_order_allocations USING btree (sales_order_item_id);


--
-- Name: idx_sales_order_allocations_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_allocations_tenant ON public.sales_order_allocations USING btree (tenant_id);


--
-- Name: idx_sales_order_items_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_items_order ON public.sales_order_items USING btree (sales_order_id);


--
-- Name: idx_sales_order_items_product; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_items_product ON public.sales_order_items USING btree (product_id);


--
-- Name: idx_sales_order_items_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_items_tenant ON public.sales_order_items USING btree (tenant_id);


--
-- Name: idx_sales_order_picks_batch; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_batch ON public.sales_order_picks USING btree (batch_number);


--
-- Name: idx_sales_order_picks_inventory; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_inventory ON public.sales_order_picks USING btree (inventory_item_id);


--
-- Name: idx_sales_order_picks_item; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_item ON public.sales_order_picks USING btree (sales_order_item_id);


--
-- Name: idx_sales_order_picks_lot; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_lot ON public.sales_order_picks USING btree (lot_number);


--
-- Name: idx_sales_order_picks_serial; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_serial ON public.sales_order_picks USING btree (serial_number);


--
-- Name: idx_sales_order_picks_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_order_picks_tenant ON public.sales_order_picks USING btree (tenant_id);


--
-- Name: idx_sales_orders_customer; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_date; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_orders_date ON public.sales_orders USING btree (tenant_id, order_date);


--
-- Name: idx_sales_orders_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_orders_number ON public.sales_orders USING btree (tenant_id, order_number);


--
-- Name: idx_sales_orders_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_orders_status ON public.sales_orders USING btree (tenant_id, status);


--
-- Name: idx_sales_orders_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_sales_orders_tenant ON public.sales_orders USING btree (tenant_id);


--
-- Name: idx_shipments_number; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipments_number ON public.shipments USING btree (tenant_id, shipment_number);


--
-- Name: idx_shipments_order; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipments_order ON public.shipments USING btree (sales_order_id);


--
-- Name: idx_shipments_status; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipments_status ON public.shipments USING btree (tenant_id, status);


--
-- Name: idx_shipments_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipments_tenant ON public.shipments USING btree (tenant_id);


--
-- Name: idx_shipments_tracking; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipments_tracking ON public.shipments USING btree (tracking_number);


--
-- Name: idx_shipping_methods_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_active ON public.shipping_methods USING btree (tenant_id, is_active);


--
-- Name: idx_shipping_methods_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_tenant ON public.shipping_methods USING btree (tenant_id);


--
-- Name: idx_shipping_methods_transporter; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_transporter ON public.shipping_methods USING btree (transporter_id);


--
-- Name: idx_shipping_methods_type; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_shipping_methods_type ON public.shipping_methods USING btree (tenant_id, type);


--
-- Name: idx_transporters_active; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_transporters_active ON public.transporters USING btree (tenant_id, is_active);


--
-- Name: idx_transporters_code; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_transporters_code ON public.transporters USING btree (tenant_id, code);


--
-- Name: idx_transporters_tenant; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX idx_transporters_tenant ON public.transporters USING btree (tenant_id);


--
-- Name: inventory_items_tenant_batch_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_items_tenant_batch_idx ON public.inventory_items USING btree (tenant_id, batch_number);


--
-- Name: inventory_items_tenant_expiry_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_items_tenant_expiry_idx ON public.inventory_items USING btree (tenant_id, expiry_date);


--
-- Name: inventory_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_items_tenant_idx ON public.inventory_items USING btree (tenant_id);


--
-- Name: inventory_items_tenant_product_bin_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX inventory_items_tenant_product_bin_idx ON public.inventory_items USING btree (tenant_id, product_id, bin_id);


--
-- Name: option_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX option_unique_idx ON public.sys_option USING btree (code, tenant_id);


--
-- Name: package_items_so_item_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX package_items_so_item_idx ON public.package_items USING btree (sales_order_item_id);


--
-- Name: package_types_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX package_types_unique_idx ON public.package_types USING btree (tenant_id, name);


--
-- Name: packages_package_id_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX packages_package_id_unique_idx ON public.packages USING btree (package_id);


--
-- Name: packages_so_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX packages_so_idx ON public.packages USING btree (sales_order_id);


--
-- Name: permission_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX permission_unique_idx ON public.sys_permission USING btree (code, tenant_id);


--
-- Name: product_types_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX product_types_unique_idx ON public.product_types USING btree (tenant_id, name);


--
-- Name: products_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX products_unique_idx ON public.products USING btree (tenant_id, sku);


--
-- Name: purchase_order_items_po_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_order_items_po_idx ON public.purchase_order_items USING btree (purchase_order_id);


--
-- Name: purchase_order_items_product_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_order_items_product_idx ON public.purchase_order_items USING btree (product_id);


--
-- Name: purchase_order_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_order_items_tenant_idx ON public.purchase_order_items USING btree (tenant_id);


--
-- Name: purchase_orders_order_number_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX purchase_orders_order_number_unique_idx ON public.purchase_orders USING btree (order_number);


--
-- Name: purchase_orders_receipt_grn_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_receipt_grn_idx ON public.purchase_orders_receipt USING btree (grn_document_id);


--
-- Name: purchase_orders_receipt_po_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_receipt_po_idx ON public.purchase_orders_receipt USING btree (purchase_order_id);


--
-- Name: purchase_orders_receipt_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_receipt_tenant_idx ON public.purchase_orders_receipt USING btree (tenant_id);


--
-- Name: purchase_orders_status_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_status_idx ON public.purchase_orders USING btree (status);


--
-- Name: purchase_orders_supplier_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_supplier_idx ON public.purchase_orders USING btree (supplier_id);


--
-- Name: purchase_orders_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_tenant_idx ON public.purchase_orders USING btree (tenant_id);


--
-- Name: purchase_orders_warehouse_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX purchase_orders_warehouse_idx ON public.purchase_orders USING btree (warehouse_id);


--
-- Name: receipt_items_po_item_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX receipt_items_po_item_idx ON public.receipt_items USING btree (po_item_id);


--
-- Name: receipt_items_receipt_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX receipt_items_receipt_idx ON public.receipt_items USING btree (receipt_id);


--
-- Name: receipt_items_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX receipt_items_tenant_idx ON public.receipt_items USING btree (tenant_id);


--
-- Name: role_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX role_unique_idx ON public.sys_role USING btree (code, tenant_id);


--
-- Name: shelves_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX shelves_unique_idx ON public.shelves USING btree (aisle_id, name);


--
-- Name: so_item_locations_item_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX so_item_locations_item_idx ON public.sales_order_item_locations USING btree (sales_order_item_id);


--
-- Name: so_item_locations_location_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX so_item_locations_location_idx ON public.sales_order_item_locations USING btree (customer_location_id);


--
-- Name: so_item_locations_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX so_item_locations_tenant_idx ON public.sales_order_item_locations USING btree (tenant_id);


--
-- Name: suppliers_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX suppliers_unique_idx ON public.suppliers USING btree (tenant_id, name);


--
-- Name: warehouses_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX warehouses_unique_idx ON public.warehouses USING btree (tenant_id, name);


--
-- Name: workflow_steps_order_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workflow_steps_order_idx ON public.workflow_steps USING btree (workflow_id, step_order);


--
-- Name: workflow_steps_workflow_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workflow_steps_workflow_idx ON public.workflow_steps USING btree (workflow_id);


--
-- Name: workflows_tenant_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workflows_tenant_idx ON public.workflows USING btree (tenant_id);


--
-- Name: workflows_tenant_type_default_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workflows_tenant_type_default_idx ON public.workflows USING btree (tenant_id, type, is_default);


--
-- Name: workflows_type_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX workflows_type_idx ON public.workflows USING btree (type);


--
-- Name: zones_unique_idx; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE UNIQUE INDEX zones_unique_idx ON public.zones USING btree (warehouse_id, name);


--
-- Name: adjustment_items adjustment_items_adjustment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustment_items
    ADD CONSTRAINT adjustment_items_adjustment_id_fkey FOREIGN KEY (adjustment_id) REFERENCES public.adjustments(id) ON DELETE CASCADE;


--
-- Name: adjustment_items adjustment_items_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustment_items
    ADD CONSTRAINT adjustment_items_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id);


--
-- Name: adjustment_items adjustment_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustment_items
    ADD CONSTRAINT adjustment_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: adjustments adjustments_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.sys_user(id);


--
-- Name: adjustments adjustments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id);


--
-- Name: adjustments adjustments_cycle_count_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_cycle_count_id_fkey FOREIGN KEY (cycle_count_id) REFERENCES public.cycle_counts(id);


--
-- Name: adjustments adjustments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.adjustments
    ADD CONSTRAINT adjustments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: aisles aisles_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.aisles
    ADD CONSTRAINT aisles_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: aisles aisles_zone_id_zones_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.aisles
    ADD CONSTRAINT aisles_zone_id_zones_id_fk FOREIGN KEY (zone_id) REFERENCES public.zones(id);


--
-- Name: audit_logs audit_logs_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: audit_logs audit_logs_user_id_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_user_id_sys_user_id_fk FOREIGN KEY (user_id) REFERENCES public.sys_user(id);


--
-- Name: bins bins_shelf_id_shelves_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_shelf_id_shelves_id_fk FOREIGN KEY (shelf_id) REFERENCES public.shelves(id);


--
-- Name: bins bins_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.bins
    ADD CONSTRAINT bins_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: customer_locations customer_locations_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customer_locations customer_locations_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customer_locations
    ADD CONSTRAINT customer_locations_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: customers customers_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: cycle_count_items cycle_count_items_bin_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_bin_id_fkey FOREIGN KEY (bin_id) REFERENCES public.bins(id);


--
-- Name: cycle_count_items cycle_count_items_counted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_counted_by_fkey FOREIGN KEY (counted_by) REFERENCES public.sys_user(id);


--
-- Name: cycle_count_items cycle_count_items_cycle_count_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_cycle_count_id_fkey FOREIGN KEY (cycle_count_id) REFERENCES public.cycle_counts(id) ON DELETE CASCADE;


--
-- Name: cycle_count_items cycle_count_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: cycle_count_items cycle_count_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_count_items
    ADD CONSTRAINT cycle_count_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: cycle_counts cycle_counts_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_counts
    ADD CONSTRAINT cycle_counts_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.sys_user(id);


--
-- Name: cycle_counts cycle_counts_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_counts
    ADD CONSTRAINT cycle_counts_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id);


--
-- Name: cycle_counts cycle_counts_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.cycle_counts
    ADD CONSTRAINT cycle_counts_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: deliveries deliveries_delivered_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.sys_user(id);


--
-- Name: deliveries deliveries_return_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_return_purchase_order_id_fkey FOREIGN KEY (return_purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: deliveries deliveries_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: deliveries deliveries_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.deliveries
    ADD CONSTRAINT deliveries_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: delivery_items delivery_items_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.deliveries(id) ON DELETE CASCADE;


--
-- Name: delivery_items delivery_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: delivery_items delivery_items_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id);


--
-- Name: delivery_items delivery_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: demo_department demo_department_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.demo_department
    ADD CONSTRAINT demo_department_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: document_number_config document_number_config_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_config
    ADD CONSTRAINT document_number_config_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: document_number_history document_number_history_config_id_document_number_config_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_history
    ADD CONSTRAINT document_number_history_config_id_document_number_config_id_fk FOREIGN KEY (config_id) REFERENCES public.document_number_config(id);


--
-- Name: document_number_history document_number_history_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_history
    ADD CONSTRAINT document_number_history_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: document_number_history document_number_history_tracker_id_document_sequence_tracker_id; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_number_history
    ADD CONSTRAINT document_number_history_tracker_id_document_sequence_tracker_id FOREIGN KEY (tracker_id) REFERENCES public.document_sequence_tracker(id);


--
-- Name: document_sequence_tracker document_sequence_tracker_config_id_document_number_config_id_f; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_sequence_tracker
    ADD CONSTRAINT document_sequence_tracker_config_id_document_number_config_id_f FOREIGN KEY (config_id) REFERENCES public.document_number_config(id);


--
-- Name: document_sequence_tracker document_sequence_tracker_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.document_sequence_tracker
    ADD CONSTRAINT document_sequence_tracker_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: generated_documents generated_documents_generated_by_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_generated_by_sys_user_id_fk FOREIGN KEY (generated_by) REFERENCES public.sys_user(id);


--
-- Name: generated_documents generated_documents_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.generated_documents
    ADD CONSTRAINT generated_documents_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: inventory_items inventory_items_bin_id_bins_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_bin_id_bins_id_fk FOREIGN KEY (bin_id) REFERENCES public.bins(id);


--
-- Name: inventory_items inventory_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: inventory_items inventory_items_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.inventory_items
    ADD CONSTRAINT inventory_items_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: package_items package_items_package_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_items
    ADD CONSTRAINT package_items_package_id_fkey FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE CASCADE;


--
-- Name: package_items package_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_items
    ADD CONSTRAINT package_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: package_items package_items_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_items
    ADD CONSTRAINT package_items_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id);


--
-- Name: package_items package_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_items
    ADD CONSTRAINT package_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: package_types package_types_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.package_types
    ADD CONSTRAINT package_types_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: packages packages_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: packages packages_shipment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_shipment_id_fkey FOREIGN KEY (shipment_id) REFERENCES public.shipments(id) ON DELETE CASCADE;


--
-- Name: packages packages_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.packages
    ADD CONSTRAINT packages_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: product_types product_types_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.product_types
    ADD CONSTRAINT product_types_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: products products_inventory_type_id_product_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_inventory_type_id_product_types_id_fk FOREIGN KEY (inventory_type_id) REFERENCES public.product_types(id);


--
-- Name: products products_package_type_id_package_types_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_package_type_id_package_types_id_fk FOREIGN KEY (package_type_id) REFERENCES public.package_types(id);


--
-- Name: products products_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: purchase_order_items purchase_order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_order_items purchase_order_items_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: purchase_orders purchase_orders_created_by_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_sys_user_id_fk FOREIGN KEY (created_by) REFERENCES public.sys_user(id);


--
-- Name: purchase_orders_receipt purchase_orders_receipt_grn_document_id_generated_documents_id_; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders_receipt
    ADD CONSTRAINT purchase_orders_receipt_grn_document_id_generated_documents_id_ FOREIGN KEY (grn_document_id) REFERENCES public.generated_documents(id) ON DELETE CASCADE;


--
-- Name: purchase_orders_receipt purchase_orders_receipt_purchase_order_id_purchase_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders_receipt
    ADD CONSTRAINT purchase_orders_receipt_purchase_order_id_purchase_orders_id_fk FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id) ON DELETE CASCADE;


--
-- Name: purchase_orders_receipt purchase_orders_receipt_received_by_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders_receipt
    ADD CONSTRAINT purchase_orders_receipt_received_by_sys_user_id_fk FOREIGN KEY (received_by) REFERENCES public.sys_user(id);


--
-- Name: purchase_orders_receipt purchase_orders_receipt_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders_receipt
    ADD CONSTRAINT purchase_orders_receipt_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: purchase_orders purchase_orders_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: purchase_orders purchase_orders_supplier_location_id_supplier_locations_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_supplier_location_id_supplier_locations_id_fk FOREIGN KEY (supplier_location_id) REFERENCES public.supplier_locations(id);


--
-- Name: purchase_orders purchase_orders_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: purchase_orders purchase_orders_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: receipt_items receipt_items_po_item_id_purchase_order_items_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_po_item_id_purchase_order_items_id_fk FOREIGN KEY (po_item_id) REFERENCES public.purchase_order_items(id) ON DELETE CASCADE;


--
-- Name: receipt_items receipt_items_receipt_id_purchase_orders_receipt_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_receipt_id_purchase_orders_receipt_id_fk FOREIGN KEY (receipt_id) REFERENCES public.purchase_orders_receipt(id) ON DELETE CASCADE;


--
-- Name: receipt_items receipt_items_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.receipt_items
    ADD CONSTRAINT receipt_items_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: reports reports_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sales_order_allocations sales_order_allocations_allocated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_allocations
    ADD CONSTRAINT sales_order_allocations_allocated_by_fkey FOREIGN KEY (allocated_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: sales_order_allocations sales_order_allocations_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_allocations
    ADD CONSTRAINT sales_order_allocations_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: sales_order_allocations sales_order_allocations_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_allocations
    ADD CONSTRAINT sales_order_allocations_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id) ON DELETE CASCADE;


--
-- Name: sales_order_allocations sales_order_allocations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_allocations
    ADD CONSTRAINT sales_order_allocations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: sales_order_item_locations sales_order_item_locations_customer_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_item_locations
    ADD CONSTRAINT sales_order_item_locations_customer_location_id_fkey FOREIGN KEY (customer_location_id) REFERENCES public.customer_locations(id);


--
-- Name: sales_order_item_locations sales_order_item_locations_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_item_locations
    ADD CONSTRAINT sales_order_item_locations_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id) ON DELETE CASCADE;


--
-- Name: sales_order_item_locations sales_order_item_locations_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_item_locations
    ADD CONSTRAINT sales_order_item_locations_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sales_order_items sales_order_items_product_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE RESTRICT;


--
-- Name: sales_order_items sales_order_items_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_order_items sales_order_items_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: sales_order_picks sales_order_picks_inventory_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_picks
    ADD CONSTRAINT sales_order_picks_inventory_item_id_fkey FOREIGN KEY (inventory_item_id) REFERENCES public.inventory_items(id) ON DELETE RESTRICT;


--
-- Name: sales_order_picks sales_order_picks_picked_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_picks
    ADD CONSTRAINT sales_order_picks_picked_by_fkey FOREIGN KEY (picked_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: sales_order_picks sales_order_picks_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_picks
    ADD CONSTRAINT sales_order_picks_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id) ON DELETE CASCADE;


--
-- Name: sales_order_picks sales_order_picks_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_order_picks
    ADD CONSTRAINT sales_order_picks_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: sales_orders sales_orders_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE RESTRICT;


--
-- Name: sales_orders sales_orders_shipping_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_shipping_location_id_fkey FOREIGN KEY (shipping_location_id) REFERENCES public.customer_locations(id);


--
-- Name: sales_orders sales_orders_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id);


--
-- Name: sales_orders sales_orders_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: sales_orders sales_orders_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: sample_module sample_module_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sample_module
    ADD CONSTRAINT sample_module_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: shelves shelves_aisle_id_aisles_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_aisle_id_aisles_id_fk FOREIGN KEY (aisle_id) REFERENCES public.aisles(id);


--
-- Name: shelves shelves_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shelves
    ADD CONSTRAINT shelves_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: shipments shipments_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_shipment_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_shipment_document_id_fkey FOREIGN KEY (shipment_document_id) REFERENCES public.generated_documents(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_shipping_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_shipping_method_id_fkey FOREIGN KEY (shipping_method_id) REFERENCES public.shipping_methods(id) ON DELETE SET NULL;


--
-- Name: shipments shipments_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: shipments shipments_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id);


--
-- Name: shipments shipments_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipments
    ADD CONSTRAINT shipments_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: shipping_methods shipping_methods_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: shipping_methods shipping_methods_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: shipping_methods shipping_methods_transporter_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_transporter_id_fkey FOREIGN KEY (transporter_id) REFERENCES public.transporters(id) ON DELETE SET NULL;


--
-- Name: shipping_methods shipping_methods_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.shipping_methods
    ADD CONSTRAINT shipping_methods_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: supplier_locations supplier_locations_supplier_id_suppliers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_locations
    ADD CONSTRAINT supplier_locations_supplier_id_suppliers_id_fk FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id);


--
-- Name: supplier_locations supplier_locations_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.supplier_locations
    ADD CONSTRAINT supplier_locations_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: suppliers suppliers_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_module_auth sys_module_auth_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_module_auth
    ADD CONSTRAINT sys_module_auth_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_option sys_option_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_option
    ADD CONSTRAINT sys_option_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_permission sys_permission_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_permission
    ADD CONSTRAINT sys_permission_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_role_permission sys_role_permission_permission_id_sys_permission_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_permission_id_sys_permission_id_fk FOREIGN KEY (permission_id) REFERENCES public.sys_permission(id);


--
-- Name: sys_role_permission sys_role_permission_role_id_sys_role_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_role_id_sys_role_id_fk FOREIGN KEY (role_id) REFERENCES public.sys_role(id);


--
-- Name: sys_role_permission sys_role_permission_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role_permission
    ADD CONSTRAINT sys_role_permission_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_role sys_role_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_role
    ADD CONSTRAINT sys_role_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_user_role sys_user_role_role_id_sys_role_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_role
    ADD CONSTRAINT sys_user_role_role_id_sys_role_id_fk FOREIGN KEY (role_id) REFERENCES public.sys_role(id);


--
-- Name: sys_user_role sys_user_role_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_role
    ADD CONSTRAINT sys_user_role_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_user_role sys_user_role_user_id_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_role
    ADD CONSTRAINT sys_user_role_user_id_sys_user_id_fk FOREIGN KEY (user_id) REFERENCES public.sys_user(id);


--
-- Name: sys_user sys_user_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user
    ADD CONSTRAINT sys_user_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_user_tenant sys_user_tenant_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_tenant
    ADD CONSTRAINT sys_user_tenant_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: sys_user_tenant sys_user_tenant_user_id_sys_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sys_user_tenant
    ADD CONSTRAINT sys_user_tenant_user_id_sys_user_id_fk FOREIGN KEY (user_id) REFERENCES public.sys_user(id);


--
-- Name: transporters transporters_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: transporters transporters_tenant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_tenant_id_fkey FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id) ON DELETE CASCADE;


--
-- Name: transporters transporters_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.transporters
    ADD CONSTRAINT transporters_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.sys_user(id) ON DELETE SET NULL;


--
-- Name: warehouse_configs warehouse_configs_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouse_configs
    ADD CONSTRAINT warehouse_configs_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: warehouse_configs warehouse_configs_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouse_configs
    ADD CONSTRAINT warehouse_configs_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: warehouses warehouses_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.warehouses
    ADD CONSTRAINT warehouses_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: workflow_steps workflow_steps_workflow_id_workflows_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflow_steps
    ADD CONSTRAINT workflow_steps_workflow_id_workflows_id_fk FOREIGN KEY (workflow_id) REFERENCES public.workflows(id) ON DELETE CASCADE;


--
-- Name: workflows workflows_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.workflows
    ADD CONSTRAINT workflows_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: zones zones_tenant_id_sys_tenant_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_tenant_id_sys_tenant_id_fk FOREIGN KEY (tenant_id) REFERENCES public.sys_tenant(id);


--
-- Name: zones zones_warehouse_id_warehouses_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.zones
    ADD CONSTRAINT zones_warehouse_id_warehouses_id_fk FOREIGN KEY (warehouse_id) REFERENCES public.warehouses(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

\unrestrict lPQE7HmYHbrCjf1hlkcFOAdkAc38FBtD00tgQtQeli9e4kNxMR6exCd7gc7yOqh

