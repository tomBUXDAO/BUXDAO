# Use a small Node 20 image (required by undici >=7)
FROM node:20-alpine

# Set environment
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install only production deps and skip optional (avoids native builds like usb)
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --omit=optional && npm cache clean --force

# Copy backend only
COPY server.js ./server.js
COPY api ./api

# Expose port (Koyeb provides PORT env var at runtime)
ENV PORT=3001

# Start the server
CMD ["node", "server.js"] 