# Multi-stage production build for PRATYAKSHA Web BFF & React 19 SPA
# Stage 1: Build static frontend assets
FROM node:24-alpine AS builder

WORKDIR /app

# Install dependencies needed for build
COPY package.json ./
RUN npm install

# Copy application source code for compilation
COPY index.html vite.config.ts tsconfig.json ./
COPY src ./src

# Build production client bundle into /app/dist
RUN npm run build

# Stage 2: Production runner with minimal footprint
FROM node:24-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled frontend assets from builder stage
COPY --from=builder /app/dist ./dist

# Copy TypeScript server runtime and shared data/types
COPY server.ts ./
COPY src/server ./src/server
COPY src/shared ./src/shared

# Security: run as unprivileged node user
USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
