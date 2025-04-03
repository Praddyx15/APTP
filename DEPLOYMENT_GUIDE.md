# Advanced Pilot Training Platform Deployment Guide

This guide provides instructions for deploying the Advanced Pilot Training Platform both during development and to production environments.

## Prerequisites

- Node.js v18+ and npm v9+
- PostgreSQL database
- Git

## Local Development Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd advanced-pilot-training-platform
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory with the following variables:
   ```
   # Server configuration
   PORT=5000
   NODE_ENV=development
   SESSION_SECRET=your-session-secret

   # Database connection
   DATABASE_URL=postgresql://username:password@localhost:5432/your_database
   PGUSER=username
   PGHOST=localhost
   PGDATABASE=your_database
   PGPORT=5432
   PGPASSWORD=password
   
   # Upload settings
   UPLOAD_DIR=uploads
   MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
   ```

4. Initialize the database:
   ```bash
   npm run db:push
   ```

5. Start the development server:
   ```bash
   npm run dev
   ```

The application will be accessible at `http://localhost:5000`

## External Access During Development

If you need to make the development server accessible from external networks (e.g., for testing on mobile devices or sharing with others), you can use one of the proxy servers:

### Standard Development Environment

1. Start the development server as usual:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start the proxy server:
   ```bash
   node public-server.js
   ```

The application will be accessible on port 8080 (or the port specified in your environment) from external networks.

### Replit Environment

If you're developing in Replit, which has specific host restrictions, use the Replit-specific proxy:

1. Start the development server as usual:
   ```bash
   npm run dev
   ```

2. In a separate terminal, start the Replit proxy server:
   ```bash
   node replit-dev-proxy.js
   ```

This proxy is specifically configured to work with Replit's environment and handles the necessary CORS settings.

## Production Deployment

### Option 1: Traditional Server Deployment

1. Build the client:
   ```bash
   npm run build
   ```

2. Set the environment variables on your server:
   ```
   PORT=5000
   NODE_ENV=production
   SESSION_SECRET=your-strong-production-secret
   DATABASE_URL=postgresql://username:password@your-db-host:5432/your_database
   PGUSER=username
   PGHOST=your-db-host
   PGDATABASE=your_database
   PGPORT=5432
   PGPASSWORD=password
   UPLOAD_DIR=uploads
   MAX_UPLOAD_SIZE=52428800  # 50MB in bytes
   ```

3. Start the production server:
   ```bash
   npm run start
   ```

### Option 2: Deployment to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Configure your environment variables in the Vercel dashboard or using the CLI:
   ```bash
   vercel env add SESSION_SECRET
   vercel env add DATABASE_URL
   # Add other environment variables as needed
   ```

4. Deploy to Vercel:
   ```bash
   vercel
   ```

5. For production deployment:
   ```bash
   vercel --prod
   ```

## Database Management

The application uses PostgreSQL and Drizzle ORM for database management.

### Creating Database Migrations

The application uses direct schema pushing rather than migrations. To update the database schema:

1. Update the schema definitions in `shared/schema.ts`
2. Push the changes to the database:
   ```bash
   npm run db:push
   ```

### Database Backups

It's recommended to set up regular backups of your production database:

```bash
pg_dump -U username -h hostname -d database_name -F c -f backup.dump
```

## Security Considerations

For production deployments:

1. Use strong, unique passwords for database access
2. Configure HTTPS with proper certificates
3. Keep all dependencies updated
4. Consider using a rate limiter to prevent abuse
5. Set up proper monitoring and logging
6. Configure database connection pooling appropriate for your traffic

## Troubleshooting

### Common Issues

1. **Database connection errors**:
   - Verify connection string is correct
   - Ensure database server is running and accessible
   - Check network/firewall settings

2. **File upload issues**:
   - Ensure the upload directory exists and has proper permissions
   - Check MAX_UPLOAD_SIZE setting if you're encountering size limitation issues

3. **CORS issues**:
   - If accessing the API from a different domain, ensure the CORS settings in `server/index.ts` are configured correctly

For more assistance, please refer to the project documentation or create an issue in the repository.