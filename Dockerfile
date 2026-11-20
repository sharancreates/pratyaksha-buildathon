# Stage 1: Build the React 19 Frontend SPA
FROM node:24-alpine AS builder
WORKDIR /app

# Copy package manifests
COPY package.json ./

# Install dependencies for compilation
RUN npm install

# Copy configuration and source files
COPY tsconfig.json vite.config.ts index.html ./
COPY src/ ./src/

# Compile production Vite bundle into /app/dist
RUN npm run build

# Stage 2: Production Server Runtime
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000

# Install production dependencies only
COPY package.json ./
RUN npm install --omit=dev

# Copy compiled frontend from builder stage
COPY --from=builder /app/dist ./dist

# Copy backend TypeScript server and analytics modules
COPY server.ts ./
COPY src/server/ ./src/server/
COPY src/shared/ ./src/shared/

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

CMD ["npx", "tsx", "server.ts"]
