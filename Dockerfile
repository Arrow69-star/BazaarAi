# Khidmat AI — Node worker image.
#
# NOTE: this is NOT the main API. The canonical backend is the Python service —
# build that with Dockerfile.python (see DEPLOY.md). This image only runs the Node
# worker, which currently reports health and will host live tracking and
# notification delivery in Phase 4.
FROM node:20-slim

WORKDIR /app

# Dependencies first so this layer caches across source changes.
COPY backend/package*.json ./backend/

WORKDIR /app/backend
RUN npm install --omit=dev

# Backend source. The former agents/ pipeline was retired to legacy/ and is
# deliberately not copied into the image.
COPY backend/ .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s \
  CMD node -e "require('http').get('http://localhost:3000/api/health', r => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

CMD ["node", "server.js"]
