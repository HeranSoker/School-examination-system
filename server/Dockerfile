# ==========================================
# School Examination System - Backend API
# Multi-stage production Dockerfile
# ==========================================

FROM node:20-alpine AS base
WORKDIR /app

# Install dependencies in a separate layer for caching
FROM base AS dependencies
COPY package*.json ./
RUN npm ci --only=production

# Application image
FROM base AS runner
ENV NODE_ENV=production
ENV PORT=5000

# Security: Create and run as non-root user
USER node

COPY --chown=node:node --from=dependencies /app/node_modules ./node_modules
COPY --chown=node:node . .

EXPOSE 5000

CMD ["node", "src/server.js"]
