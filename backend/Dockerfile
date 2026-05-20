FROM node:20-alpine

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source
COPY . .

# Create directories
RUN mkdir -p reports logs

# Non-root user
RUN addgroup -S medcds && adduser -S medcds -G medcds
RUN chown -R medcds:medcds /app
USER medcds

EXPOSE 5000

CMD ["node", "src/server.js"]
