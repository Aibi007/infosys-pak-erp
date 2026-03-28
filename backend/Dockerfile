# ================================================================
# Dockerfile — Infosys Pak ERP API
# Multi-stage build: deps → build → production
# Final image: ~180MB (node:18-alpine)
# ================================================================

# ── Stage 1: Install dependencies ────────────────────────────
FROM node:18-alpine AS deps

WORKDIR /app

# Install build tools for native addons (bcrypt etc.)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force


# ── Stage 2: Production image ─────────────────────────────────
FROM node:18-alpine AS production

LABEL maintainer="Infosys Pak ERP <dev@infosys.pk>"
LABEL version="1.0.0"

# Non-root user for security
RUN addgroup -g 1001 -S nodejs \
 && adduser  -S erp -u 1001 -G nodejs

WORKDIR /app

# Copy deps from stage 1
COPY --from=deps --chown=erp:nodejs /app/node_modules ./node_modules

# Copy app source
COPY --chown=erp:nodejs . .

# Create log and upload dirs
RUN mkdir -p logs uploads \
 && chown -R erp:nodejs logs uploads

# Drop to non-root
USER erp

# Expose API port
EXPOSE 4000

# Health check — hits /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1

# Start server
CMD ["node", "src/server.js"]
