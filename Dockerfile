# BazaarAI Backend — Docker Image for Google Cloud Run
FROM node:20-slim

WORKDIR /app

# Copy package files
COPY backend/package*.json ./backend/
COPY agents/ ./agents/
COPY data/ ./data/

# Install dependencies
WORKDIR /app/backend
RUN npm install --production

# Copy backend source
COPY backend/ .

# Create logs directory
RUN mkdir -p /tmp/bazaarai_logs

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

# Start
CMD ["node", "server.js"]
