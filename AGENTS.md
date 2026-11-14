# AGENTS.md

Workspace rules and architectural context for AI coding agents working in `ecommerce-behavior-analytics`.

## Project Overview

**E-Commerce Behavior Analytics Platform** — a multi-service full-stack e-commerce and delivery ecosystem with dataset pipelines for behavior analytics:

- **`Ecommerce-platform/`**: Core multi-role platform (Customer, Shop/Vendor, Staff Roles, Root Admin).
  - **`backend/`** (Port `8080`): Node.js (ESM), Express 5, Sequelize 6 ORM, MySQL (`mysql2`), JWT + Google OAuth, Cloudinary uploads, VNPay, Nodemailer, `node-cron` (`src/worker.js`).
  - **`frontend/`** (Port `5173`): React 19 (with React Compiler), TypeScript, Vite 8, Tailwind CSS v4, Redux Toolkit (`authSlice`, `cartSlice`) +TanStack Query, React Hook Form + Yup, Recharts, Playwright E2E.
- **`shipment/`**: Standalone Shipment & Shipper Portal microservice.
  - **`backend/`** (Port `8090`): Express 5 + Sequelize API (`/api/v1/shipments`, `/api/v1/shipper`).
  - **`frontend/`** (Port `5174`): React + TypeScript + Vite Shipper Dashboard (orders, proof of delivery, COD reconciliation).
- **`scripts/` & `data/`**: Python 3 scripts (`download_abo_products.py`, `classify_products.py`, `embed_multimodal_products.py`) and processed Amazon Berkeley Objects dataset (`data/abo_500_products/` — JSON metadata, hierarchical taxonomy, SQL category seeds, multimodal embeddings).
- **Reference Docs**:
  - `CONTROLLER_API_LIFECYCLE.md`: Detailed Controller → Service → Database & transaction flow specs across backend modules.
  - `Ecommerce-platform/backend/src/database/schema.sql` & `plan.md`: Canonical database schema and design notes.
  - `Authorization.svg`: Role/permission architecture diagram.

## Development & Build Commands

Run commands from their respective package directories:

### Main Backend (`Ecommerce-platform/backend`)
- Start dev server: `npm run dev`
- Reset & seed MySQL DB: `npm run db:reset` (runs `sequelize-cli` drop, create, migrate, seed using `.sequelizerc.cjs`)
- Run background cron worker: `node src/worker.js`

### Main Frontend (`Ecommerce-platform/frontend`)
- Start Vite dev server: `npm run dev`
- Type-check / production build: `npm run build`
- Lint: `npm run lint`
- Run Playwright E2E tests: `npx playwright test`

### Shipment Microservice (`shipment`)
- Start both shipment backend & frontend: `npm run dev` (runs `node dev.js`)
- Start backend only (`:8090`): `npm run dev:backend`
- Start frontend only (`:5174`): `npm run dev:frontend`
- Build frontend: `npm run build:frontend`

### Data Pipeline (`scripts`)
- Download ABO dataset subset: `python scripts/download_abo_products.py`
- Classify products & export SQL taxonomy seeds: `python scripts/classify_products.py`
- Multimodal embeddings generation: `python scripts/embed_multimodal_products.py`

## Architecture & Coding Conventions

1. **ES Modules (`"type": "module"`)**:
   - Both backends use native Node.js ESM. Always include explicit `.js` extensions on relative imports (e.g., `import userService from "./user.service.js"`).
   - `.cjs` is reserved strictly for tooling that requires CommonJS (e.g., `.sequelizerc.cjs`).

2. **Backend Layered Module Pattern (`Ecommerce-platform/backend/src/`)**:
   - Domain features live in `src/modules/<domain>/` with a 3-file separation:
     - `<domain>.routes.js` — Express route definitions and auth/role/upload middleware wiring.
     - `<domain>.controller.js` — HTTP request parsing and status/JSON response formatting.
     - `<domain>.service.js` — Business logic, validation, and Sequelize queries.
   - Shared infrastructure lives in `src/core/` (`config/`, `middleware/`, `utils/`) and Sequelize models live in `src/database/models/`.
   - Wrap multi-step database writes in Sequelize transactions (`BEGIN` / `COMMIT` / `ROLLBACK`), and route unexpected errors through `src/core/middleware/errorHandler.js`.
   - When modifying existing API flows, check `CONTROLLER_API_LIFECYCLE.md` and keep behavior/contracts consistent.

3. **Frontend Conventions (`Ecommerce-platform/frontend/src/`)**:
   - Use the `@/` path alias (mapped to `./src` in `vite.config.ts` and `tsconfig`).
   - Place API calls in `src/services/*Service.ts` using the shared `src/shared/api/axiosClient.ts` instance rather than raw `axios` calls inside components.
   - Global client state (auth, cart) belongs in Redux (`src/app/stores/`); server/async data fetching and caching should prefer `@tanstack/react-query` or established service hooks.
   - Localization resources live under `src/shared/locales/`.

4. **Service Boundaries & Hygiene**:
   - Keep `shipment/` decoupled as an independent service; cross-service coordination from the main platform goes through `Ecommerce-platform/backend/src/modules/shipment/`.
   - Never commit `.env` secrets, database credentials, or runtime `*.log` files.
   - Preserve existing Vietnamese/English comments and docstrings unless updating the corresponding logic.

---

## Database Architecture & Schema Design (Hybrid Normalization)

The database follows a **Hybrid Normalization** pattern (3NF core tables with selective denormalization for read performance in high-throughput e-commerce flows).

### 1. Canonical Files & Tooling
- **`schema.sql`** (`src/database/schema.sql`): Single source of truth containing 48 tables and relational constraints. Executed automatically by the initial migration (`src/migrations/20260619000000-init-v2-schema.js`).
- **`models/`** (`src/database/models/`): 43 Sequelize models corresponding to the schema tables.
- **`seed.sql` & `src/seeders/`**:
  - `seed.sql`: Direct SQL seeds for system initialization (roles, system policies, role_policies, platform settings).
  - `src/seeders/`: Sequelize CLI seeders (`01-seed-users-and-shops.js`, `02-migrate-main-data.js`, `03-seed-orders-and-coupons.js`, `04-seed-demo-vouchers.js`, `05-seed-system-settings.js`, `06-seed-iam-policies.js`).

### 2. Domain Entity Clusters
1. **IAM, Identity & Authentication**:
   - `roles` (id, role_name, description, is_system)
   - `policies` (id, code, name, description, effect, actions, is_system)
   - `role_policies` (role_id, policy_id)
   - `user_policies` (user_id, policy_id) — direct inline user policies
   - `users`, `user_profiles`, `user_addresses`, `refresh_tokens`, `otp_verifications`
2. **Vendor, Shops & Logistics**:
   - `shops`, `shop_wallets`, `shop_payouts`, `shipper_profiles`, `shipper_operating_areas`
3. **Product Catalog & Inventory**:
   - `categories` (supports 3-level hierarchy: parent_id, slug)
   - `products` (shop_id, category_id, name, slug, price, sale_price, sold_count, view_count, is_new, is_featured, gender, material, approval_status)
   - `product_variants` (product_id, sku, color, size, stock_quantity, price)
   - `product_images` (product_id, image_url, is_primary, sort_order)
   - `product_reviews`, `wishlists`, `user_viewed_products`
4. **Orders & Multi-Vendor Split Fulfillment**:
   - `parent_orders` (user_id, checkout_code, total_amount, payment_method, payment_status, address info)
   - `shop_orders` (parent_order_id, shop_id, shipper_id, subtotal, commission_amount, cod_status, status, delivered_at)
   - `order_items` (shop_order_id, variant_id, product_name, sku, size, color, quantity, unit_price)
   - `shop_order_status_history` (shop_order_id, old_status, new_status, note, changed_by, changed_at)
   - `shipments`, `shipment_histories`, `shipper_reconciliations`
   - `return_requests`, `return_items`
5. **Marketing, Finance & System Config**:
   - `coupons`, `user_coupons`, `campaigns`, `campaign_products`, `banners`
   - `platform_commissions`, `payment_logs`, `system_settings`
6. **Communication & Auditing**:
   - `conversations`, `messages` (created_at mapped to `sent_at`)
   - `notifications`, `activity_logs`, `login_logs`

### 3. Model & Service Conventions
- **Custom Timestamp Field Names**:
  - `Message`: uses `createdAt: "sent_at"` (no `updated_at`).
  - `ShopOrderStatusHistory`: uses `createdAt: "changed_at"` (no `updated_at`).
- **Paranoid Soft Deletes**:
  - Tables with soft deletes (`deleted_at`) include `users`, `products`, `shops`, `categories`, `parent_orders`.
- **Query Guidelines**:
  - In Sequelize queries with `include`, where clauses targeting associated models must be nested inside the respective include block (e.g. `{ model: db.ShopOrder, as: "shopOrder", where: { status: ... } }`), avoiding invalid column access on the root table.

---

## IAM Role & Policy System (AWS IAM-Style PBAC)

The platform implements an **AWS IAM-inspired Policy-Based Access Control (PBAC)** system to replace hardcoded operational roles (deprecating the rigid `manager` role in favor of granular staff roles and policies):

### 1. Core Architecture
- **`policies`**: Named permission documents containing an array of action statements (e.g., `["order:*", "return:*"]`), effect (`ALLOW` / `DENY`), and system flag (`is_system`).
- **`roles`**: System roles (`admin`, `vendor`, `shipper`, `user`) and custom staff roles (`staff_order`, `staff_content`, etc.).
- **`role_policies`**: Many-to-many relationship attaching policies to roles.
- **`user_policies`**: Direct (inline) policies attached to individual users for granting granular permissions without altering their assigned role.

### 2. Root Admin Inviolability Rule
- The Root Admin (`role_name === 'admin'`) unconditionally receives full wildcard access (`*`).
- **Strict Guardrail**: The system forbids attaching, updating, or detaching policies from the Root Admin account or the `admin` system role via IAM management APIs. Root Admin permissions cannot be modified or locked out.

### 3. Action Evaluation Engine (`src/core/middleware/auth.js`)
- Effective permissions for a user are computed as:
  $$\text{Effective Actions} = \text{Actions}(\text{Role Policies}) \cup \text{Actions}(\text{Direct User Policies})$$
- Wildcard support follows standard AWS IAM conventions:
  - `*`: Matches any action across the entire platform.
  - `service:*`: Matches any action within that service domain (e.g. `order:*` matches `order:read`, `order:approve`, `order:cancel`).
  - `service:action`: Exact action matching (e.g. `product:approve`).
- Middleware:
  - `requirePermission('service:action')`: Guards endpoints using dynamic IAM policy checks.
  - `isManager`: Backward-compatible guard that grants access to Root Admin or any user holding staff operational permissions.

### 4. IAM Management API Endpoints (`/api/v1/admin/iam/`)
- Protected by `requireRole('admin')` or `requirePermission('iam:*')`:
  - `GET /api/v1/admin/iam/actions` — Catalog of all available system actions.
  - `GET /api/v1/admin/iam/policies` — List all IAM policies.
  - `POST /api/v1/admin/iam/policies` — Create a custom policy.
  - `PUT /api/v1/admin/iam/policies/:id` — Update custom policy actions/description.
  - `DELETE /api/v1/admin/iam/policies/:id` — Delete policy (system policies protected).
  - `GET /api/v1/admin/iam/roles` — List roles with attached policies.
  - `POST /api/v1/admin/iam/roles` — Create custom staff role.
  - `PUT /api/v1/admin/iam/roles/:id` — Update custom role info.
  - `DELETE /api/v1/admin/iam/roles/:id` — Delete role (system roles protected).
  - `POST /api/v1/admin/iam/roles/:id/policies` — Attach policy to role.
  - `DELETE /api/v1/admin/iam/roles/:id/policies/:policyId` — Detach policy from role.
  - `GET /api/v1/admin/iam/users/:id/permissions` — Inspect user's effective permissions and assigned policies.
  - `POST /api/v1/admin/iam/users/:id/policies` — Attach direct inline policy to user.
  - `DELETE /api/v1/admin/iam/users/:id/policies/:policyId` — Detach direct policy from user.
- User Creation Enhancement (`POST /api/v1/admin/users`):
  - Accepts custom `role_id` or `role` name and an optional list of `policy_ids` for direct user policy assignment at creation time.
