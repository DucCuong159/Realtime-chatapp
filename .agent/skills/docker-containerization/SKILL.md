---
name: docker-containerization
description: "Production Docker and Docker Compose workflows for full-stack JavaScript/TypeScript applications (Node.js Express backend + React Vite frontend + MongoDB/Redis). Covers multi-stage builds, non-root security, layer caching, local dev compose orchestration, and health checks."
risk: safe
source: "AAS Specialist"
date_added: "2026-08-25"
---

# Docker & Containerization Specialist Skill

Expert guide for containerizing full-stack web applications, orchestrating multi-service environments with Docker Compose, and building minimal, secure production container images.

---

## 🎯 When to Use
Use this skill when:
- Writing and optimizing `Dockerfile` for Node.js/Express backends or React/Vite frontends.
- Creating `docker-compose.yml` to spin up fullstack services (Frontend, Backend, Database, In-memory cache).
- Reducing Docker image size via Multi-Stage builds and minimal base images (`alpine` / `distroless`).
- Enforcing container security standards (Non-root user execution, read-only root filesystems).
- Debugging container networking, environment variable injection, and volume mounts.

---

## 🐳 1. Multi-Stage Dockerfile for TypeScript Node.js Backend

Optimized for small image size (<150MB), layer caching, and non-root execution:

```dockerfile
# backend/Dockerfile

# ------------------------------------
# 1. Dependencies Stage
# ------------------------------------
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* pnpm-lock.yaml* ./
RUN npm ci --ignore-scripts

# ------------------------------------
# 2. Build Stage
# ------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build && npm prune --production

# ------------------------------------
# 3. Production Runner Stage
# ------------------------------------
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

# Security: Run as non-root user
USER node

# Copy only production artifacts and pruned node_modules
COPY --chown=node:node --from=builder /app/package.json ./
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5000/health || exit 1

CMD ["node", "dist/index.js"]
```

---

## ⚡ 2. Multi-Stage Dockerfile for React Vite Frontend (Nginx)

```dockerfile
# frontend/Dockerfile

# ------------------------------------
# 1. Build Stage
# ------------------------------------
FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json yarn.lock* package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# ------------------------------------
# 2. Nginx Production Server
# ------------------------------------
FROM nginx:alpine-slim AS runner
WORKDIR /usr/share/nginx/html

# Clean default nginx static assets
RUN rm -rf ./*

# Copy built assets
COPY --from=builder /app/dist .

# Custom nginx conf for SPA routing (React Router)
RUN echo 'server { \
  listen 80; \
  location / { \
    root /usr/share/nginx/html; \
    index index.html index.htm; \
    try_files $uri $uri/ /index.html; \
  } \
  error_page 500 502 503 504 /50x.html; \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

---

## 🛠️ 3. Full-Stack Local `docker-compose.yml`

Spins up Frontend, Backend, and MongoDB with proper networking, health checks, and persistent volumes:

```yaml
# docker-compose.yml
version: "3.8"

services:
  mongodb:
    image: mongo:7.0-noble
    container_name: chatapp-mongo
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: secretpassword
      MONGO_INITDB_DATABASE: realtime_chat
    volumes:
      - mongo_data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: chatapp-backend
    restart: unless-stopped
    ports:
      - "5000:5000"
    environment:
      NODE_ENV: production
      PORT: 5000
      MONGODB_URI: mongodb://admin:secretpassword@mongodb:27017/realtime_chat?authSource=admin
      JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      CORS_ORIGIN: http://localhost:3000
    depends_on:
      mongodb:
        condition: service_healthy

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: chatapp-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    depends_on:
      - backend

volumes:
  mongo_data:
```

---

## 🛡️ 4. Docker Container Best Practices Checklist
- [ ] **`.dockerignore`**: Always include `node_modules`, `dist`, `.git`, and `.env` in `.dockerignore` to keep contexts small and secure.
- [ ] **Non-root Execution**: Never run Node.js containers as root in production (`USER node`).
- [ ] **Deterministic Package Locks**: Use `npm ci` or `yarn --immutable` instead of `npm install`.
- [ ] **Health Checks**: Always expose a lightweight `/health` HTTP endpoint on the backend for Docker/Kubernetes health probing.
