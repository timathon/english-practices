# AWS Migration Plan for v2 Backend (`v2-api`)

This document outlines the step-by-step roadmap to migrate the **v2 backend (`v2-api`)** from Cloudflare Workers (Hono + Cloudflare D1 + Cloudflare KV + Better Auth) to Amazon Web Services (AWS).

---

## 1. Choose AWS Architecture Pattern

Since the backend is built with **Hono**, you have two primary options:

### Option A: Serverless Architecture (AWS Lambda + API Gateway) *(Recommended)*
* **Compute:** AWS Lambda running Node.js with Hono (using `@hono/node-server` or `hono/aws-lambda` adapter).
* **API Gateway:** AWS HTTP API Gateway (v2) routes incoming HTTP requests to Lambda.
* **Database Options:**
  * **Option A1 (Fully Managed / MySQL):** AWS Aurora Serverless v2 (MySQL) or Amazon RDS (MySQL/PostgreSQL) with `drizzle-orm`.
  * **Option A2 (Keep TiDB Cloud):** Continue using TiDB Cloud on AWS Tokyo (as benchmarked in `src/index.ts`).
* **Cache:** Amazon ElastiCache for Redis (or MemoryDB) replacing Cloudflare KV for session/catalog caching.

### Option B: Containerized Architecture (AWS ECS Fargate / App Runner)
* **Compute:** AWS App Runner or ECS Fargate running a Node.js Docker container (`@hono/node-server`).
* **Load Balancer:** AWS Application Load Balancer (ALB) or App Runner built-in router.
* **Database & Cache:** Same as Option A (Amazon RDS / Aurora / TiDB + ElastiCache).

---

## 2. Database Migration (Cloudflare D1 -> AWS DB)

Currently, the schema in `v2-api/drizzle` targets SQLite / Cloudflare D1.

1. **Update Drizzle Schema & Config:**
   * Modify `drizzle.config.ts` to target MySQL or PostgreSQL (e.g., `dialect: 'mysql'`).
   * Adjust data types in `src/db/schema.ts` (replace D1-specific text/blob types with standard MySQL/PostgreSQL types).
2. **Data Export & Import:**
   * Export tables (`user`, `account`, `session`, `practice`, `practiceRecords`) from Cloudflare D1 using Wrangler CLI or SQLite dump scripts.
   * Import data into your AWS RDS/Aurora database or TiDB Cloud instance using `drizzle-kit push` / migration scripts.

---

## 3. Refactor Backend Code (`v2-api`)

1. **Replace Cloudflare Bindings in Hono:**
   Update type definitions and handlers in `src/index.ts`:
   ```ts
   // Old (Cloudflare Worker)
   type Bindings = { DB: D1Database; V2_CACHE_KV?: KVNamespace; ... }

   // New (AWS Node / Lambda Environment Variables)
   type Environment = {
     DATABASE_URL: string;
     REDIS_URL: string;
     BETTER_AUTH_SECRET: string;
     BETTER_AUTH_URL: string;
   }
   ```
2. **Replace Cache (`V2_CACHE_KV`):**
   * Swap out Cloudflare KV operations (`c.env.V2_CACHE_KV.get() / put()`) with **Redis** (e.g., `ioredis`).
3. **Database Client:**
   * Replace `drizzle-orm/d1` with `drizzle-orm/node-postgres` or `drizzle-orm/mysql2`.

---

## 4. Authentication Adjustments (`Better Auth`)

1. Ensure `BETTER_AUTH_URL` is set to the AWS API Gateway / custom domain endpoint (e.g., `https://epapi.vibequizzing.com`).
2. Update CORS origins in `src/index.ts` to match your frontend hosting domain (e.g., Cloudflare Pages, AWS CloudFront, or S3).

---

## 5. Infrastructure Deployment (IaC)

Choose an Infrastructure as Code (IaC) framework:

* **SST (Serverless Stack) - Recommended for Serverless:**
  ```bash
  npx sst init
  ```
  Define Lambda API endpoints, Redis, and custom domain in `sst.config.ts`.
* **Docker + AWS App Runner / ECS:**
  1. Create a `Dockerfile`:
     ```dockerfile
     FROM node:20-alpine
     WORKDIR /app
     COPY package*.json ./
     RUN npm ci
     COPY . .
     RUN npm run build
     EXPOSE 8787
     CMD ["node", "dist/index.js"]
     ```
  2. Push image to AWS ECR (Elastic Container Registry) and deploy to AWS App Runner or ECS Fargate.

---

## 6. Route DNS & SSL

1. In **AWS Route 53** (or your current DNS provider):
   * Point custom domain `epapi.vibequizzing.com` to AWS API Gateway domain or ALB / App Runner URL.
2. Issue an SSL certificate via **AWS Certificate Manager (ACM)** for custom domain mapping.
