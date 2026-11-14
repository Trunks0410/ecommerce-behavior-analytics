# UTE Express Shipment Service

UTE Express is an independent delivery microservice for the commerce website in
[`../Ecommerce-platform/`](../Ecommerce-platform/). This folder owns the shipment API,
its database and migrations, demo shipper accounts, and the shipper portal. The service
does not share the ecommerce database or import its application code.

Read [`KE_HOACH_TRIEN_KHAI_UTE_EXPRESS.md`](KE_HOACH_TRIEN_KHAI_UTE_EXPRESS.md) for the
implementation scope, integration contract and acceptance criteria.

## Folder layout

```text
shipment/
├── backend/   Express API, MySQL schema/migrations, domain and seed
└── frontend/  Shipper portal (React, Vite)
```

## Backend setup

Requirements: Node.js and a MySQL database dedicated to UTE Express.

1. Create a separate database, for example `ute_express`. Do not point the service at
   the ecommerce database.
2. Configure `shipment/backend/.env` with the dedicated `SHIPMENT_DB_NAME`, database
   credentials, an `ACCESS_TOKEN_SECRET` of at least 32 characters, and an
   `ECOMMERCE_SERVICE_API_KEY` of at least 24 characters. Use different random values
   for these secrets; `.env` is local-only and must not be committed. The example file
   is only a template for fresh checkouts.
3. Install and initialize:

   ```text
   npm install
   npm run db:migrate
   npm run db:seed
   npm run dev
   ```

The API listens on port `8090` by default. `GET /health` checks the database connection.
The demo seed is disabled when `NODE_ENV=production`.

## Shipper portal setup

In `shipment/frontend`, install dependencies and start Vite:

```text
npm install
npm run dev
```

The portal defaults to `http://localhost:8090/api/v1`. Override it with
`VITE_SHIPMENT_API_URL` when the service uses another URL. Add the portal origin to
the backend's `CORS_ORIGIN`.

Local demo account after seeding:

```text
Email:    shipper01@ute-express.local
Password: Shipper@123
```

Set `DEMO_SHIPPER_PASSWORD` before seeding to use a different local demo password.
The seed does not reset passwords for accounts that already exist.

## API overview

| Purpose | Endpoint |
|---|---|
| Health | `GET /health` |
| Service-to-service shipment creation | `POST /api/v1/shipments` |
| Service-to-service lookup by order reference | `GET /api/v1/shipments/by-reference/:orderReference` |
| Public tracking by tracking number | `GET /api/v1/shipments/tracking/:trackingNumber` |
| Shipper login/profile/jobs | `/api/v1/shipper/*` |
| Shipper delivery actions | `POST /api/v1/shipments/:id/{accept,pickup,start,out-for-delivery,complete,fail}` |

Website-to-service requests use the `x-service-api-key` header. Shipper actions use a
bearer access token. The frontend must never contain the service API key.

Shipment creation is idempotent on `orderReference`. The service records its own tracking
events and applies state transitions and automatic shipper assignment. A shipment without
an available shipper remains in the assignment queue.

## Ecommerce integration

Configure the Ecommerce backend with:

```text
UTE_SHIPMENT_SERVICE_URL=http://localhost:8090
UTE_SHIPMENT_SERVICE_API_KEY=<same value as shipment backend ECOMMERCE_SERVICE_API_KEY>
```

The URL is the service origin without `/api/v1`. Keep the key only in the backend
environment; shop handoff requests create UTE Express shipments and customer tracking
requests are authorized by Ecommerce before being proxied to the shipment service.

## Tests

Run the backend domain tests:

```text
npm test
```

These tests cover the delivery state machine and assignment ranking. Database integration
tests require a separately configured shipment database.
