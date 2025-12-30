CREATE TABLE "int_api_key" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner_id" uuid NOT NULL,
	"api_key" varchar(128) NOT NULL,
	"description" varchar(1000),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "int_api_key_api_key_unique" UNIQUE("api_key")
);
--> statement-breakpoint
CREATE TABLE "int_partner" (
	"id" uuid PRIMARY KEY NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(255) NOT NULL,
	"pic_name" varchar(255) NOT NULL,
	"pic_email" varchar(255) NOT NULL,
	"description" varchar(1000),
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "int_webhook" (
	"id" uuid PRIMARY KEY NOT NULL,
	"partner_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"url" varchar(1000) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "int_event" (
	"id" uuid PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" varchar(1000),
	"is_active" boolean DEFAULT true NOT NULL,
	"tenant_id" uuid NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "int_api_key" ADD CONSTRAINT "int_api_key_partner_id_int_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."int_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_partner" ADD CONSTRAINT "int_partner_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_webhook" ADD CONSTRAINT "int_webhook_partner_id_int_partner_id_fk" FOREIGN KEY ("partner_id") REFERENCES "public"."int_partner"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_webhook" ADD CONSTRAINT "int_webhook_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "int_event" ADD CONSTRAINT "int_event_tenant_id_sys_tenant_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."sys_tenant"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "integration_api_key_unique_idx" ON "int_api_key" USING btree ("api_key");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_code_unique_idx" ON "int_partner" USING btree ("code","tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "partner_name_unique_idx" ON "int_partner" USING btree ("name","tenant_id");