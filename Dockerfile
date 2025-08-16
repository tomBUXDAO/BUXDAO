# Use a small Node image
FROM node:18-alpine

# Set environment
ENV NODE_ENV=production

# Create app directory
WORKDIR /app

# Install only production deps
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy backend only
COPY server.js ./server.js
COPY api ./api

# Expose port (Koyeb provides PORT env var at runtime)
ENV PORT=3001

# Start the server
CMD ["node", "server.js"] 