# WMS Base Code - AI Agent Instructions

## Project Overview
Multi-tenant Warehouse Management System (WMS) built with React + TypeScript + Vite + Express + Drizzle ORM + PostgreSQL. Modular architecture with separate feature modules for warehouse setup, inventory, purchase orders, sales orders, reports, etc.

## Critical Architecture Patterns

### 1. Multi-Tenancy (ALWAYS ENFORCE)
Every database query MUST filter by `tenantId` from `req.user!.activeTenantId`:
```typescript
const tenantId = req.user!.activeTenantId;
const data = await db.select().from(products)
  .where(and(eq(products.tenantId, tenantId), eq(products.id, id)));
```

### 2. Module Structure
Modules live in `src/modules/[module-name]/` with this structure:
```
client/                          # Frontend code
  pages/                         # React components  
  components/                    # Reusable UI
  menus/sideBarMenus.ts         # Navigation config
  routes/[moduleName]ReactRoutes.ts  # Client routes
server/                          # Backend code
  routes/[moduleName]Routes.ts  # Express API routes
  lib/db/schemas/               # Drizzle schemas
module.json                      # Module metadata
```

**Module Registration (4 Steps Required):**
1. Import/add client routes in `src/client/route.ts`
2. Import/register server routes in `src/server/main.ts` as `app.use('/api/modules/[name]', routes)`
3. Import/add menu in sidebar component
4. Export schema in `src/server/lib/db/schema/index.ts`

See `scripts/register-module.js` for automation or `scripts/REGISTRATION_GUIDE.md`.

### 3. Authentication & Authorization
Every API route MUST use middleware:
```typescript
router.use(authenticated());                                    // JWT check
router.use(checkModuleAuthorization('module-id'));            // Module access
router.get('/', authorized('ADMIN', 'module.view'), ...);     // Role/permission
```
`SYSADMIN` role bypasses all permission checks.

### 4. Database Schema Patterns

**Numeric/Decimal Fields - CRITICAL BUG PATTERN:**
When inserting optional numeric/decimal fields, empty strings (`''`) cause `invalid input syntax for type numeric` errors. Always use `null` for empty values:
```typescript
// ❌ WRONG - causes PostgreSQL error
maxWeight: maxWeight || '',

// ✅ CORRECT - use null for empty values
maxWeight: maxWeight && maxWeight !== '' ? maxWeight : null,
```

**Schema Definition:**
```typescript
// For required numeric with default:
currentWeight: decimal('current_weight', { precision: 10, scale: 3 }).default('0').notNull(),

// For optional numeric:
maxWeight: decimal('max_weight', { precision: 10, scale: 3 }),  // No default, allows null
```

**UUID Fields:** Always use `.primaryKey().defaultRandom()` or manual UUID generation with `uuidv4()`.

**Tenant Relations:** All tables should have `tenantId` with foreign key to `tenant.id` and unique constraints including tenantId:
```typescript
tenantId: uuid('tenant_id').notNull().references(() => tenant.id),
// In table options:
(t) => [uniqueIndex('items_unique_idx').on(t.tenantId, t.name)]
```

### 5. Path Aliases
- `@client` → `./src/client`
- `@server` → `./src/server`
- `@modules` → `./src/modules`

## Development Commands

```bash
npm run dev                     # Start dev server (port 5000)
npm run build                   # Build for production
npm run db:generate             # Generate migration from schema changes
npm run db:migrate              # Apply migrations
npm run db:push                 # Push schema directly (dev only)
npm run db:studio               # Open Drizzle Studio
npm run create-module           # Interactive module scaffolding
npm run register-module         # Register existing module
```

## Common Drizzle Gotchas

### Array Parameters in WHERE Clauses
```typescript
// ❌ WRONG - causes "malformed array literal" error
.where(eq(products.id, productIds))
.where(inArray(products.id, productIds))  // If using string directly

// ✅ CORRECT - use inArray from drizzle-orm
import { inArray } from 'drizzle-orm';
.where(inArray(products.id, productIds))  // Where productIds is string[]
```

### Aggregations with LEFT JOIN
When using `SUM()` or `COUNT()` with LEFT JOIN, Drizzle may collapse results. Use subqueries or raw SQL for complex aggregations.

## Error Handling Patterns

```typescript
try {
  const result = await db.insert(table).values(data).returning();
  return res.status(201).json({ success: true, data: result[0] });
} catch (error: any) {
  console.error('Error creating resource:', error);
  return res.status(500).json({ 
    success: false, 
    message: error.message || 'Internal server error' 
  });
}
```

## UI Components
Using shadcn/ui components in `src/client/components/ui/`. Import from `@client/components/ui/[component]`.

## API Documentation
All endpoints MUST include Swagger JSDoc comments. Access at `/api-docs`.

## File Storage
Documents stored in `storage/` directory (NOT served as static files). Access through authenticated API endpoints only.

## Testing Workflows
When fixing bugs:
1. Check terminal error for exact error message and stack trace
2. Identify if it's a validation error, database constraint, or query syntax issue
3. For numeric field errors: Check if empty strings are being passed instead of null
4. For array errors: Verify inArray() usage and array formatting
5. Always test with actual data through the API

## Module Authorization
Each module has its own permissions stored in `sys_module_authorization` table. Users must have module access granted through roles before accessing module routes.
