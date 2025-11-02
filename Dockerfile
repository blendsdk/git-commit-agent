# Multi-stage build for git-commit-agent

# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Stage 2: Production
FROM node:20-alpine

# Install git (required for the agent)
RUN apk add --no-cache git

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install production dependencies only
RUN yarn install --frozen-lockfile --production

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Create directory for user's .env-git-agent
RUN mkdir -p /root

# Set environment variable to indicate running in container
ENV RUNNING_IN_CONTAINER=true

# Default command
CMD ["node", "dist/index.js"]
