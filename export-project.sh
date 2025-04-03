#!/bin/bash
# Advanced Pilot Training Platform Export Script
# This script prepares the project for deployment outside of Replit

set -e  # Exit on any error

echo "🚀 Advanced Pilot Training Platform - Deployment Export Tool"
echo "=========================================================="
echo "This script will prepare your project for deployment outside of Replit."
echo "It will create a clean export directory with all Replit-specific code removed."
echo ""

# Create export directory
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
EXPORT_DIR="aptp_export_$TIMESTAMP"
mkdir -p $EXPORT_DIR

echo "📁 Created export directory: $EXPORT_DIR"

# Copy all project files excluding specific Replit artifacts
echo "📋 Copying project files..."
rsync -av --progress ./ $EXPORT_DIR/ \
  --exclude=".replit" \
  --exclude="replit.nix" \
  --exclude=".replitenv" \
  --exclude=".replit.nix" \
  --exclude=".cache" \
  --exclude=".config" \
  --exclude=".upm" \
  --exclude="node_modules" \
  --exclude=".git" \
  --exclude="$EXPORT_DIR"

# Copy the standard version of files
echo "🔄 Replacing Replit-specific files with standard versions..."
cp export-vite.config.ts $EXPORT_DIR/vite.config.ts
cp server/routes-standard.ts $EXPORT_DIR/server/routes.ts
cp client/src/vite-hmr-fix-standard.ts $EXPORT_DIR/client/src/vite-hmr-fix.ts
cp client/src/lib/websocket-standard.ts $EXPORT_DIR/client/src/lib/websocket.ts

# Update main.tsx to use the fix
echo "📝 Updating main.tsx to ensure WebSocket fixes are properly applied..."
cat > $EXPORT_DIR/client/src/main.tsx << EOF
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
// Import WebSocket fix before rendering the app to ensure proper connections outside Replit
import "./vite-hmr-fix";

createRoot(document.getElementById("root")!).render(<App />);
EOF

# Clean HTML files
echo "🧹 Cleaning HTML files to remove Replit metadata..."
node clean-html.js $EXPORT_DIR

# Create clean package.json without Replit dependencies
echo "📦 Creating cleaned package.json..."
node <<EOF > $EXPORT_DIR/package.json
const fs = require('fs');
const path = require('path');

// Read the original package.json
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Read the list of packages to remove
const packagesToRemove = fs.readFileSync('replit-packages-to-remove.txt', 'utf8')
  .split('\n')
  .filter(line => line.trim() !== '' && !line.startsWith('#'));

// Remove Replit-specific dependencies
if (pkg.dependencies) {
  packagesToRemove.forEach(p => {
    if (pkg.dependencies[p]) {
      delete pkg.dependencies[p];
    }
  });
}

if (pkg.devDependencies) {
  packagesToRemove.forEach(p => {
    if (pkg.devDependencies[p]) {
      delete pkg.devDependencies[p];
    }
  });
}

// Update scripts for standard deployment environments
pkg.scripts = {
  ...pkg.scripts,
  "start": "ts-node server/index.ts",
  "build": "tsc -p tsconfig.build.json && vite build",
  "dev": "cross-env NODE_ENV=development ts-node server/index.ts"
};

// Write the cleaned package.json
fs.writeFileSync(path.join('$EXPORT_DIR', 'package.json'), JSON.stringify(pkg, null, 2));
EOF

# Create a .gitignore file
echo "📝 Creating .gitignore file..."
cat > $EXPORT_DIR/.gitignore << EOF
# Dependencies
node_modules
.pnp
.pnp.js

# Build outputs
dist
build
.next
out

# Environment variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
logs
*.log

# OS specific
.DS_Store
Thumbs.db

# IDE specific
.idea
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
*.code-workspace

# Replit specific
.replit
replit.nix
.replitenv
.replit.nix
.config
.cache
.upm

# Testing
coverage

# Transpiled JavaScript
server-dist/
**/dist/
EOF

# Create a README specifically for the exported version
echo "📄 Creating deployment README..."
cat > $EXPORT_DIR/README.md << EOF
# Advanced Pilot Training Platform

A cutting-edge aviation training platform leveraging advanced educational technologies to create an adaptive, personalized learning experience for aspiring pilots.

## Deployment Guide

This repository contains a clean export of the Advanced Pilot Training Platform, optimized for deployment outside of Replit.

### Prerequisites

- Node.js 18+ and npm 8+
- PostgreSQL database
- Git

### Quick Start

1. Clone this repository
2. Create a .env file (use .env.example as a template)
3. Install dependencies:
   \`\`\`
   npm install
   \`\`\`
4. Initialize the database:
   \`\`\`
   npm run db:push
   \`\`\`
5. Start the development server:
   \`\`\`
   npm run dev
   \`\`\`

### Production Deployment

For detailed deployment instructions, please see the [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) file.

## Features

- Multi-organization training management system
- Role-based access control
- Real-time collaboration and notifications
- Advanced visualization tools
- Document management
- Training program development and management
- Assessment and progress tracking
- Analytics and reporting

## License

All rights reserved.
EOF

# Create a ZIP archive of the exported project
echo "🗜️ Creating ZIP archive..."
(cd $EXPORT_DIR && zip -r "../$EXPORT_DIR.zip" .)

echo ""
echo "✅ Export completed successfully!"
echo "📦 Export directory: $EXPORT_DIR"
echo "📦 ZIP archive: $EXPORT_DIR.zip"
echo ""
echo "To deploy your project, follow the instructions in DEPLOYMENT_GUIDE.md"
echo "=========================================================="