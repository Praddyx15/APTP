# Stage 1: Development environment - use this for local development
FROM node:18-alpine AS development

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the application
COPY . .

# Expose port
EXPOSE 3000

# Start development server
CMD ["npm", "run", "dev"]

# Stage 2: Build environment
FROM node:18-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci

# Copy application files
COPY . .

# Build the Next.js application
RUN npm run build

# Stage 3: Production environment
FROM node:18-alpine AS production

# Set working directory
WORKDIR /app

# Set to production environment
ENV NODE_ENV=production

# Install only production dependencies
COPY package.json package-lock.json* ./
RUN npm ci --only=production

# Copy built application from builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./

# Add runtime dependencies
COPY --from=builder /app/node_modules ./node_modules

# Expose port
EXPOSE 3000

# Start the Next.js application
CMD ["npm", "start"]

# Stage 4: Standalone production build with smaller footprint
FROM node:18-alpine AS standalone

# Set working directory
WORKDIR /app

# Don't run production as root
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Set to production environment
ENV NODE_ENV=production

# Copy standalone build output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3000

# Start the Next.js application
CMD ["node", "server.js"]