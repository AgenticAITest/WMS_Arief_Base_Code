CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid,
	"module" varchar(100) NOT NULL,
	"action" varchar(100) NOT NULL,
	"resource_type" varchar(100) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"changed_fields" jsonb,
	"description" text,
	"previous_state" varchar(50),
	"new_state" varchar(50),
	"batch_id" uuid,
	"status" varchar(20) DEFAULT 'success' NOT NULL,
	"error_message" text,
	"ip_address" varchar(50),
	"document_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "demo_department" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"group" varchar(255) NOT NULL,
	"date" date NOT NULL,
	"in_time" time NOT NULL,
	"out_time" time NOT NULL,
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_option" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"value" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_permission" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_role" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"is_system" boolean NOT NULL,
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_role_permission" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "sys_role_permission_role_id_permission_id_tenant_id_pk" PRIMARY KEY("role_id","permission_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "sys_tenant" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sys_tenant_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "sys_user" (
	"id" uuid PRIMARY KEY NOT NULL,
	"username" varchar(255) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"fullname" varchar(255) NOT NULL,
	"status" varchar(255) NOT NULL,
	"email" varchar(255),
	"avatar" varchar(255),
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "sys_user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "sys_user_role" (
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "sys_user_role_user_id_role_id_tenant_id_pk" PRIMARY KEY("user_id","role_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "sys_user_tenant" (
	"user_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "sys_user_tenant_user_id_tenant_id_pk" PRIMARY KEY("user_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "sys_module_auth" (
	"id" uuid PRIMARY KEY NOT NULL,
	"module_id" varchar(255) NOT NULL,
	"module_name" varchar(255) NOT NULL,
	"tenant_id" uuid NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"enabled_at" timestamp,
	"enabled_by" varchar(255),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sys_module_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"moduleId" varchar(255) NOT NULL,
	"moduleName" varchar(255) NOT NULL,
	"description" text,
	"version" varchar(50) NOT NULL,
	"category" varchar(100) NOT NULL,
	"isActive" boolean DEFAULT true NOT NULL,
	"repositoryUrl" varchar(500),
	"documentationUrl" varchar(500),
	"createdAt" timestamp with time zone DEFAULT now(),
	"updatedAt" timestamp with time zone DEFAULT now(),
	CONSTRAINT "sys_module_registry_moduleId_unique" UNIQUE("moduleId")
);
--> statement-breakpoint
CREATE TABLE "sample_module" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" varchar(500),
	"status" varchar(50) DEFAULT 'active' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"tenant_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"customer_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_type" varchar(50) NOT NULL,
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"contact_person" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"tax_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"units_per_package" integer,
	"barcode" varchar(100),
	"dimensions" varchar(100),
	"weight" numeric(10, 3),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_types" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_type_id" uuid,
	"package_type_id" uuid,
	"sku" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"minimum_stock_level" integer,
	"reorder_point" integer,
	"required_temperature_min" numeric(5, 2),
	"required_temperature_max" numeric(5, 2),
	"weight" numeric(10, 3),
	"dimensions" varchar(100),
	"active" boolean DEFAULT true,
	"has_expiry_date" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_methods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" varchar(50) NOT NULL,
	"transporter_id" uuid,
	"cost_calculation_method" varchar(50) DEFAULT 'fixed' NOT NULL,
	"base_cost" numeric(15, 2),
	"estimated_days" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "supplier_locations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"supplier_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"location_type" varchar(50) DEFAULT 'pickup',
	"address" text,
	"city" varchar(100),
	"state" varchar(100),
	"postal_code" varchar(20),
	"country" varchar(100),
	"latitude" numeric(9, 6),
	"longitude" numeric(9, 6),
	"contact_person" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"contact_person" varchar(255),
	"email" varchar(255),
	"phone" varchar(50),
	"tax_id" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transporters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"contact_person" varchar(255),
	"phone" varchar(50),
	"email" varchar(255),
	"website" varchar(500),
	"service_areas" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "aisles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"zone_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shelf_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"barcode" varchar(100),
	"max_weight" numeric(10, 3),
	"max_volume" numeric(10, 3),
	"current_weight" numeric(10, 3) DEFAULT '0' NOT NULL,
	"current_volume" numeric(10, 3) DEFAULT '0' NOT NULL,
	"fixed_sku" varchar(255),
	"category" varchar(100),
	"required_temperature" varchar(50),
	"accessibility_score" integer DEFAULT 50 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shelves" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"aisle_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouse_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"picking_strategy" varchar(50) DEFAULT 'FEFO' NOT NULL,
	"auto_assign_bins" boolean DEFAULT true NOT NULL,
	"require_batch_tracking" boolean DEFAULT false NOT NULL,
	"require_expiry_tracking" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "zones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"bin_id" uuid NOT NULL,
	"available_quantity" integer NOT NULL,
	"reserved_quantity" integer DEFAULT 0 NOT NULL,
	"expiry_date" date,
	"batch_number" varchar(100),
	"lot_number" varchar(100),
	"received_date" date,
	"cost_per_unit" numeric(10, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_count_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cycle_count_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"bin_id" uuid NOT NULL,
	"system_quantity" integer NOT NULL,
	"counted_quantity" integer,
	"variance_quantity" integer,
	"variance_amount" numeric(15, 2),
	"reason_code" varchar(50),
	"reason_description" text,
	"counted_by" uuid,
	"counted_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cycle_counts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"count_number" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"count_type" varchar(50) DEFAULT 'partial',
	"scheduled_date" date,
	"completed_date" date,
	"variance_threshold" numeric(5, 2) DEFAULT '0.00',
	"total_variance_amount" numeric(15, 2),
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adjustment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adjustment_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"old_quantity" integer NOT NULL,
	"new_quantity" integer NOT NULL,
	"quantity_difference" integer NOT NULL,
	"reason_code" varchar(50) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "adjustments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"adjustment_number" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"type" varchar(20) DEFAULT 'regular' NOT NULL,
	"cycle_count_id" uuid,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"applied_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_number_config" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"description" varchar(500),
	"period_format" varchar(20) DEFAULT 'YYMM' NOT NULL,
	"prefix1_label" varchar(100),
	"prefix1_default_value" varchar(50),
	"prefix1_required" boolean DEFAULT false NOT NULL,
	"prefix2_label" varchar(100),
	"prefix2_default_value" varchar(50),
	"prefix2_required" boolean DEFAULT false NOT NULL,
	"sequence_length" integer DEFAULT 4 NOT NULL,
	"sequence_padding" varchar(1) DEFAULT '0' NOT NULL,
	"separator" varchar(5) DEFAULT '-' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_number_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"tracker_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"generated_number" varchar(255) NOT NULL,
	"period" varchar(20) NOT NULL,
	"prefix1" varchar(50),
	"prefix2" varchar(50),
	"sequence_number" integer NOT NULL,
	"document_id" uuid,
	"document_table_name" varchar(100),
	"generated_by" uuid,
	"generated_at" timestamp DEFAULT now() NOT NULL,
	"is_voided" boolean DEFAULT false NOT NULL,
	"voided_at" timestamp,
	"voided_by" uuid,
	"void_reason" varchar(500),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "document_sequence_tracker" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"config_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"period" varchar(20) NOT NULL,
	"prefix1" varchar(50),
	"prefix2" varchar(50),
	"current_sequence" integer DEFAULT 0 NOT NULL,
	"last_generated_number" varchar(255),
	"last_generated_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generated_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"document_number" varchar(100) NOT NULL,
	"reference_type" varchar(50) NOT NULL,
	"reference_id" uuid NOT NULL,
	"files" jsonb NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"generated_by" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"ordered_quantity" integer NOT NULL,
	"received_quantity" integer DEFAULT 0 NOT NULL,
	"unit_cost" numeric(10, 2),
	"total_cost" numeric(15, 2),
	"expected_expiry_date" date,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(100) NOT NULL,
	"supplier_id" uuid,
	"supplier_location_id" uuid,
	"is_return" boolean DEFAULT false NOT NULL,
	"delivery_method" varchar(20) DEFAULT 'delivery' NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"workflow_state" varchar(50) DEFAULT 'create',
	"order_date" date NOT NULL,
	"expected_delivery_date" date,
	"total_amount" numeric(15, 2),
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "delivery_method_check" CHECK ((
        (delivery_method = 'delivery') OR
        (delivery_method = 'pickup' AND supplier_location_id IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "purchase_orders_receipt" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"grn_document_id" uuid,
	"tenant_id" uuid NOT NULL,
	"receipt_date" timestamp DEFAULT now() NOT NULL,
	"received_by" uuid,
	"notes" text,
	"putaway_status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"po_item_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"received_quantity" integer NOT NULL,
	"expiry_date" date,
	"discrepancy_note" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"shipment_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"status" varchar(50) NOT NULL,
	"delivery_date" timestamp NOT NULL,
	"recipient_name" varchar(255),
	"notes" text,
	"return_purchase_order_id" uuid,
	"delivered_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "delivery_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"shipped_quantity" numeric(15, 3) NOT NULL,
	"accepted_quantity" numeric(15, 3) DEFAULT '0' NOT NULL,
	"rejected_quantity" numeric(15, 3) DEFAULT '0' NOT NULL,
	"rejection_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"package_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "packages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"shipment_id" uuid,
	"package_id" varchar(100) NOT NULL,
	"package_number" varchar(100) NOT NULL,
	"barcode" varchar(100),
	"length" numeric(10, 2),
	"width" numeric(10, 2),
	"height" numeric(10, 2),
	"weight" numeric(10, 3),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"allocated_quantity" numeric(15, 3) NOT NULL,
	"allocation_date" timestamp DEFAULT now() NOT NULL,
	"allocated_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_item_locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"customer_location_id" uuid NOT NULL,
	"quantity" numeric(15, 3) NOT NULL,
	"delivery_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"line_number" integer NOT NULL,
	"product_id" uuid NOT NULL,
	"ordered_quantity" numeric(15, 3) NOT NULL,
	"allocated_quantity" numeric(15, 3) DEFAULT '0' NOT NULL,
	"picked_quantity" numeric(15, 3) DEFAULT '0' NOT NULL,
	"unit_price" numeric(15, 2) NOT NULL,
	"total_price" numeric(15, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_order_picks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_item_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"picked_quantity" numeric(15, 3) NOT NULL,
	"batch_number" varchar(100),
	"lot_number" varchar(100),
	"serial_number" varchar(100),
	"pick_date" timestamp DEFAULT now() NOT NULL,
	"picked_by" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_number" varchar(100) NOT NULL,
	"customer_id" uuid NOT NULL,
	"shipping_location_id" uuid,
	"shipping_method_id" uuid,
	"order_date" date NOT NULL,
	"requested_delivery_date" date,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"workflow_state" varchar(50),
	"total_amount" numeric(15, 2) DEFAULT '0' NOT NULL,
	"tracking_number" varchar(100),
	"delivery_instructions" text,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"created_by" uuid,
	"updated_by" uuid
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"shipment_number" varchar(100) NOT NULL,
	"shipment_document_id" uuid,
	"transporter_id" uuid,
	"shipping_method_id" uuid,
	"tracking_number" varchar(100),
	"status" varchar(50) DEFAULT 'ready' NOT NULL,
	"shipping_date" timestamp,
	"delivery_date" timestamp,
	"total_weight" numeric(10, 3),
	"total_volume" numeric(10, 3),
	"total_cost" numeric(15, 2),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflow_steps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workflow_id" uuid NOT NULL,
	"step_key" varchar(50) NOT NULL,
	"step_name" varchar(255) NOT NULL,
	"step_order" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_initial" boolean DEFAULT false NOT NULL,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"required_fields" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workflows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "general" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "movement_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"bin_id" uuid NOT NULL,
	"quantity_changed" integer NOT NULL,
	"movement_type" varchar(50) NOT NULL,
	"reference_type" varchar(50),
	"reference_id" uuid,
	"reference_number" varchar(255),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relocation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"relocation_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"inventory_item_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"from_bin_id" uuid NOT NULL,
	"to_bin_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "relocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"relocation_number" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'created' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"approved_by" uuid,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "demo_department" ADD CONSTRAINT "demo_department_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_option" ADD CONSTRAINT "sys_option_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_permission" ADD CONSTRAINT "sys_permission_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role" ADD CONSTRAINT "sys_role_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_role_id_sys_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_permission_id_sys_permission_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."sys_permission"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_role_permission" ADD CONSTRAINT "sys_role_permission_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user" ADD CONSTRAINT "sys_user_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_role_id_sys_role_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."sys_role"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_role" ADD CONSTRAINT "sys_user_role_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_tenant" ADD CONSTRAINT "sys_user_tenant_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_user_tenant" ADD CONSTRAINT "sys_user_tenant_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sys_module_auth" ADD CONSTRAINT "sys_module_auth_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_module" ADD CONSTRAINT "sample_module_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_locations" ADD CONSTRAINT "customer_locations_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_types" ADD CONSTRAINT "package_types_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_types" ADD CONSTRAINT "product_types_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_inventory_type_id_product_types_id_fk" FOREIGN KEY ("inventory_type_id") REFERENCES "public"."product_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_package_type_id_package_types_id_fk" FOREIGN KEY ("package_type_id") REFERENCES "public"."package_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."transporters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_methods" ADD CONSTRAINT "shipping_methods_updated_by_sys_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_locations" ADD CONSTRAINT "supplier_locations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_locations" ADD CONSTRAINT "supplier_locations_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transporters" ADD CONSTRAINT "transporters_updated_by_sys_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aisles" ADD CONSTRAINT "aisles_zone_id_zones_id_fk" FOREIGN KEY ("zone_id") REFERENCES "public"."zones"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aisles" ADD CONSTRAINT "aisles_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bins" ADD CONSTRAINT "bins_shelf_id_shelves_id_fk" FOREIGN KEY ("shelf_id") REFERENCES "public"."shelves"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bins" ADD CONSTRAINT "bins_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_aisle_id_aisles_id_fk" FOREIGN KEY ("aisle_id") REFERENCES "public"."aisles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelves" ADD CONSTRAINT "shelves_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_configs" ADD CONSTRAINT "warehouse_configs_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_configs" ADD CONSTRAINT "warehouse_configs_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "zones" ADD CONSTRAINT "zones_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_cycle_count_id_cycle_counts_id_fk" FOREIGN KEY ("cycle_count_id") REFERENCES "public"."cycle_counts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_count_items" ADD CONSTRAINT "cycle_count_items_counted_by_sys_user_id_fk" FOREIGN KEY ("counted_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_counts" ADD CONSTRAINT "cycle_counts_approved_by_sys_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_adjustment_id_adjustments_id_fk" FOREIGN KEY ("adjustment_id") REFERENCES "public"."adjustments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustment_items" ADD CONSTRAINT "adjustment_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_cycle_count_id_cycle_counts_id_fk" FOREIGN KEY ("cycle_count_id") REFERENCES "public"."cycle_counts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "adjustments" ADD CONSTRAINT "adjustments_approved_by_sys_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_number_config" ADD CONSTRAINT "document_number_config_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_number_history" ADD CONSTRAINT "document_number_history_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_number_history" ADD CONSTRAINT "document_number_history_config_id_document_number_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."document_number_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_number_history" ADD CONSTRAINT "document_number_history_tracker_id_document_sequence_tracker_id_fk" FOREIGN KEY ("tracker_id") REFERENCES "public"."document_sequence_tracker"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_sequence_tracker" ADD CONSTRAINT "document_sequence_tracker_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_sequence_tracker" ADD CONSTRAINT "document_sequence_tracker_config_id_document_number_config_id_fk" FOREIGN KEY ("config_id") REFERENCES "public"."document_number_config"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generated_documents" ADD CONSTRAINT "generated_documents_generated_by_sys_user_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_location_id_supplier_locations_id_fk" FOREIGN KEY ("supplier_location_id") REFERENCES "public"."supplier_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_id_warehouses_id_fk" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders_receipt" ADD CONSTRAINT "purchase_orders_receipt_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders_receipt" ADD CONSTRAINT "purchase_orders_receipt_grn_document_id_generated_documents_id_fk" FOREIGN KEY ("grn_document_id") REFERENCES "public"."generated_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders_receipt" ADD CONSTRAINT "purchase_orders_receipt_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders_receipt" ADD CONSTRAINT "purchase_orders_receipt_received_by_sys_user_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_receipt_id_purchase_orders_receipt_id_fk" FOREIGN KEY ("receipt_id") REFERENCES "public"."purchase_orders_receipt"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_po_item_id_purchase_order_items_id_fk" FOREIGN KEY ("po_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "receipt_items" ADD CONSTRAINT "receipt_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_return_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("return_purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deliveries" ADD CONSTRAINT "deliveries_delivered_by_sys_user_id_fk" FOREIGN KEY ("delivered_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_delivery_id_deliveries_id_fk" FOREIGN KEY ("delivery_id") REFERENCES "public"."deliveries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_items" ADD CONSTRAINT "delivery_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "packages" ADD CONSTRAINT "packages_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_allocations" ADD CONSTRAINT "sales_order_allocations_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_allocations" ADD CONSTRAINT "sales_order_allocations_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_allocations" ADD CONSTRAINT "sales_order_allocations_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_allocations" ADD CONSTRAINT "sales_order_allocations_allocated_by_sys_user_id_fk" FOREIGN KEY ("allocated_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_locations" ADD CONSTRAINT "sales_order_item_locations_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_locations" ADD CONSTRAINT "sales_order_item_locations_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_item_locations" ADD CONSTRAINT "sales_order_item_locations_customer_location_id_customer_locations_id_fk" FOREIGN KEY ("customer_location_id") REFERENCES "public"."customer_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_items" ADD CONSTRAINT "sales_order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_picks" ADD CONSTRAINT "sales_order_picks_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_picks" ADD CONSTRAINT "sales_order_picks_sales_order_item_id_sales_order_items_id_fk" FOREIGN KEY ("sales_order_item_id") REFERENCES "public"."sales_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_picks" ADD CONSTRAINT "sales_order_picks_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_picks" ADD CONSTRAINT "sales_order_picks_picked_by_sys_user_id_fk" FOREIGN KEY ("picked_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shipping_location_id_customer_locations_id_fk" FOREIGN KEY ("shipping_location_id") REFERENCES "public"."customer_locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_shipping_method_id_shipping_methods_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "public"."shipping_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_updated_by_sys_user_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_sales_order_id_sales_orders_id_fk" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipment_document_id_generated_documents_id_fk" FOREIGN KEY ("shipment_document_id") REFERENCES "public"."generated_documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_transporter_id_transporters_id_fk" FOREIGN KEY ("transporter_id") REFERENCES "public"."transporters"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_shipping_method_id_shipping_methods_id_fk" FOREIGN KEY ("shipping_method_id") REFERENCES "public"."shipping_methods"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_id_workflows_id_fk" FOREIGN KEY ("workflow_id") REFERENCES "public"."workflows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workflows" ADD CONSTRAINT "workflows_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "general" ADD CONSTRAINT "general_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_history" ADD CONSTRAINT "movement_history_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_history" ADD CONSTRAINT "movement_history_user_id_sys_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_history" ADD CONSTRAINT "movement_history_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "movement_history" ADD CONSTRAINT "movement_history_bin_id_bins_id_fk" FOREIGN KEY ("bin_id") REFERENCES "public"."bins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_relocation_id_relocations_id_fk" FOREIGN KEY ("relocation_id") REFERENCES "public"."relocations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_inventory_item_id_inventory_items_id_fk" FOREIGN KEY ("inventory_item_id") REFERENCES "public"."inventory_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_from_bin_id_bins_id_fk" FOREIGN KEY ("from_bin_id") REFERENCES "public"."bins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocation_items" ADD CONSTRAINT "relocation_items_to_bin_id_bins_id_fk" FOREIGN KEY ("to_bin_id") REFERENCES "public"."bins"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocations" ADD CONSTRAINT "relocations_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocations" ADD CONSTRAINT "relocations_created_by_sys_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "relocations" ADD CONSTRAINT "relocations_approved_by_sys_user_id_fk" FOREIGN KEY ("approved_by") REFERENCES "public"."sys_user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_idx" ON "audit_logs" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs" USING btree ("created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource_type","resource_id");--> statement-breakpoint
CREATE INDEX "audit_logs_tenant_time_idx" ON "audit_logs" USING btree ("tenant_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "demo_department_unique_idx" ON "demo_department" USING btree ("name","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "option_unique_idx" ON "sys_option" USING btree ("code","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "permission_unique_idx" ON "sys_permission" USING btree ("code","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "role_unique_idx" ON "sys_role" USING btree ("code","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_unique_idx" ON "customers" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "package_types_unique_idx" ON "package_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_types_unique_idx" ON "product_types" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "products_unique_idx" ON "products" USING btree ("tenant_id","sku");--> statement-breakpoint
CREATE UNIQUE INDEX "shipping_methods_unique_idx" ON "shipping_methods" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "shipping_methods_tenant_idx" ON "shipping_methods" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shipping_methods_active_idx" ON "shipping_methods" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "shipping_methods_type_idx" ON "shipping_methods" USING btree ("tenant_id","type");--> statement-breakpoint
CREATE INDEX "shipping_methods_transporter_idx" ON "shipping_methods" USING btree ("transporter_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_unique_idx" ON "suppliers" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "transporters_unique_idx" ON "transporters" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE INDEX "transporters_tenant_idx" ON "transporters" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "transporters_active_idx" ON "transporters" USING btree ("tenant_id","is_active");--> statement-breakpoint
CREATE INDEX "transporters_code_idx" ON "transporters" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "aisles_unique_idx" ON "aisles" USING btree ("zone_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "bins_unique_idx" ON "bins" USING btree ("shelf_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "shelves_unique_idx" ON "shelves" USING btree ("aisle_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "warehouses_unique_idx" ON "warehouses" USING btree ("tenant_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "zones_unique_idx" ON "zones" USING btree ("warehouse_id","name");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_product_bin_idx" ON "inventory_items" USING btree ("tenant_id","product_id","bin_id");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_expiry_idx" ON "inventory_items" USING btree ("tenant_id","expiry_date");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_batch_idx" ON "inventory_items" USING btree ("tenant_id","batch_number");--> statement-breakpoint
CREATE INDEX "inventory_items_tenant_idx" ON "inventory_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cycle_count_items_tenant_idx" ON "cycle_count_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cycle_count_items_cycle_count_idx" ON "cycle_count_items" USING btree ("cycle_count_id");--> statement-breakpoint
CREATE INDEX "cycle_count_items_product_idx" ON "cycle_count_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "cycle_count_items_bin_idx" ON "cycle_count_items" USING btree ("bin_id");--> statement-breakpoint
CREATE INDEX "cycle_count_items_inventory_item_idx" ON "cycle_count_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "cycle_counts_tenant_count_number_unique" ON "cycle_counts" USING btree ("tenant_id","count_number");--> statement-breakpoint
CREATE INDEX "cycle_counts_tenant_idx" ON "cycle_counts" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "cycle_counts_status_idx" ON "cycle_counts" USING btree ("status");--> statement-breakpoint
CREATE INDEX "cycle_counts_created_at_idx" ON "cycle_counts" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "adjustment_items_tenant_idx" ON "adjustment_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "adjustment_items_adjustment_idx" ON "adjustment_items" USING btree ("adjustment_id");--> statement-breakpoint
CREATE INDEX "adjustment_items_inventory_item_idx" ON "adjustment_items" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "adjustments_tenant_adjustment_number_unique" ON "adjustments" USING btree ("tenant_id","adjustment_number");--> statement-breakpoint
CREATE INDEX "adjustments_tenant_idx" ON "adjustments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "adjustments_status_idx" ON "adjustments" USING btree ("status");--> statement-breakpoint
CREATE INDEX "adjustments_created_at_idx" ON "adjustments" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "adjustments_cycle_count_idx" ON "adjustments" USING btree ("cycle_count_id");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_num_config_tenant_type_idx" ON "document_number_config" USING btree ("tenant_id","document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_num_history_number_idx" ON "document_number_history" USING btree ("tenant_id","generated_number");--> statement-breakpoint
CREATE UNIQUE INDEX "doc_seq_tracker_unique_idx" ON "document_sequence_tracker" USING btree ("tenant_id","document_type","period","prefix1","prefix2");--> statement-breakpoint
CREATE UNIQUE INDEX "gen_docs_ref_idx" ON "generated_documents" USING btree ("tenant_id","reference_type","reference_id","document_type");--> statement-breakpoint
CREATE UNIQUE INDEX "gen_docs_number_idx" ON "generated_documents" USING btree ("tenant_id","document_number");--> statement-breakpoint
CREATE INDEX "purchase_order_items_tenant_idx" ON "purchase_order_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_po_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_product_idx" ON "purchase_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_order_number_unique_idx" ON "purchase_orders" USING btree ("order_number");--> statement-breakpoint
CREATE INDEX "purchase_orders_tenant_idx" ON "purchase_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_status_idx" ON "purchase_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "purchase_orders_warehouse_idx" ON "purchase_orders" USING btree ("warehouse_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_receipt_tenant_idx" ON "purchase_orders_receipt" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_receipt_po_idx" ON "purchase_orders_receipt" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_receipt_grn_idx" ON "purchase_orders_receipt" USING btree ("grn_document_id");--> statement-breakpoint
CREATE INDEX "receipt_items_receipt_idx" ON "receipt_items" USING btree ("receipt_id");--> statement-breakpoint
CREATE INDEX "receipt_items_po_item_idx" ON "receipt_items" USING btree ("po_item_id");--> statement-breakpoint
CREATE INDEX "receipt_items_tenant_idx" ON "receipt_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "deliveries_shipment_unique_idx" ON "deliveries" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "deliveries_tenant_idx" ON "deliveries" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "deliveries_so_idx" ON "deliveries" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "deliveries_status_idx" ON "deliveries" USING btree ("status");--> statement-breakpoint
CREATE INDEX "delivery_items_tenant_idx" ON "delivery_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "delivery_items_delivery_idx" ON "delivery_items" USING btree ("delivery_id");--> statement-breakpoint
CREATE INDEX "delivery_items_product_idx" ON "delivery_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "package_items_tenant_idx" ON "package_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "package_items_package_idx" ON "package_items" USING btree ("package_id");--> statement-breakpoint
CREATE INDEX "package_items_so_item_idx" ON "package_items" USING btree ("sales_order_item_id");--> statement-breakpoint
CREATE INDEX "package_items_product_idx" ON "package_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_package_id_unique_idx" ON "packages" USING btree ("package_id");--> statement-breakpoint
CREATE UNIQUE INDEX "packages_barcode_unique_idx" ON "packages" USING btree ("barcode");--> statement-breakpoint
CREATE INDEX "packages_tenant_idx" ON "packages" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "packages_so_idx" ON "packages" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "packages_shipment_idx" ON "packages" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "sales_order_allocations_tenant_idx" ON "sales_order_allocations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_order_allocations_item_idx" ON "sales_order_allocations" USING btree ("sales_order_item_id");--> statement-breakpoint
CREATE INDEX "sales_order_allocations_inventory_idx" ON "sales_order_allocations" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "so_item_locations_tenant_idx" ON "sales_order_item_locations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "so_item_locations_item_idx" ON "sales_order_item_locations" USING btree ("sales_order_item_id");--> statement-breakpoint
CREATE INDEX "so_item_locations_location_idx" ON "sales_order_item_locations" USING btree ("customer_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_items_unique_idx" ON "sales_order_items" USING btree ("tenant_id","sales_order_id","line_number");--> statement-breakpoint
CREATE INDEX "sales_order_items_tenant_idx" ON "sales_order_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_order_items_order_idx" ON "sales_order_items" USING btree ("sales_order_id");--> statement-breakpoint
CREATE INDEX "sales_order_items_product_idx" ON "sales_order_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "so_picks_tenant_idx" ON "sales_order_picks" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "so_picks_item_idx" ON "sales_order_picks" USING btree ("sales_order_item_id");--> statement-breakpoint
CREATE INDEX "so_picks_inventory_idx" ON "sales_order_picks" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "so_picks_picked_by_idx" ON "sales_order_picks" USING btree ("picked_by");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_orders_order_number_unique_idx" ON "sales_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE INDEX "sales_orders_tenant_idx" ON "sales_orders" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "sales_orders_customer_idx" ON "sales_orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "sales_orders_shipping_location_idx" ON "sales_orders" USING btree ("shipping_location_id");--> statement-breakpoint
CREATE INDEX "sales_orders_shipping_method_idx" ON "sales_orders" USING btree ("shipping_method_id");--> statement-breakpoint
CREATE INDEX "sales_orders_status_idx" ON "sales_orders" USING btree ("tenant_id","status");--> statement-breakpoint
CREATE INDEX "sales_orders_date_idx" ON "sales_orders" USING btree ("tenant_id","order_date");--> statement-breakpoint
CREATE INDEX "sales_orders_number_idx" ON "sales_orders" USING btree ("tenant_id","order_number");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_shipment_number_unique_idx" ON "shipments" USING btree ("shipment_number");--> statement-breakpoint
CREATE UNIQUE INDEX "shipments_so_unique_idx" ON "shipments" USING btree ("tenant_id","sales_order_id");--> statement-breakpoint
CREATE INDEX "shipments_tenant_idx" ON "shipments" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "shipments_tracking_idx" ON "shipments" USING btree ("tracking_number");--> statement-breakpoint
CREATE INDEX "workflow_steps_workflow_idx" ON "workflow_steps" USING btree ("workflow_id");--> statement-breakpoint
CREATE INDEX "workflow_steps_order_idx" ON "workflow_steps" USING btree ("workflow_id","step_order");--> statement-breakpoint
CREATE INDEX "workflows_tenant_idx" ON "workflows" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "workflows_type_idx" ON "workflows" USING btree ("type");--> statement-breakpoint
CREATE INDEX "workflows_tenant_type_default_idx" ON "workflows" USING btree ("tenant_id","type","is_default");--> statement-breakpoint
CREATE INDEX "idx_movement_history_tenant" ON "movement_history" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_movement_history_inventory_item" ON "movement_history" USING btree ("inventory_item_id");--> statement-breakpoint
CREATE INDEX "idx_movement_history_bin" ON "movement_history" USING btree ("bin_id");--> statement-breakpoint
CREATE INDEX "idx_movement_history_type" ON "movement_history" USING btree ("movement_type");--> statement-breakpoint
CREATE INDEX "idx_movement_history_created" ON "movement_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "relocation_items_tenant_idx" ON "relocation_items" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "relocation_items_relocation_idx" ON "relocation_items" USING btree ("relocation_id");--> statement-breakpoint
CREATE INDEX "relocation_items_from_bin_idx" ON "relocation_items" USING btree ("from_bin_id");--> statement-breakpoint
CREATE INDEX "relocation_items_to_bin_idx" ON "relocation_items" USING btree ("to_bin_id");--> statement-breakpoint
CREATE INDEX "relocation_items_product_idx" ON "relocation_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "relocations_tenant_relocation_number_unique" ON "relocations" USING btree ("tenant_id","relocation_number");--> statement-breakpoint
CREATE INDEX "relocations_tenant_idx" ON "relocations" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "relocations_status_idx" ON "relocations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "relocations_created_at_idx" ON "relocations" USING btree ("created_at");