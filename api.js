/**
 * Main API entry point for Vercel deployment
 * 
 * This file acts as a bridge between Vercel's serverless functions and our Express app
 * It ensures all API requests are directed to the correct handlers
 */

// This file is required to route API requests in Vercel environment
module.exports = require('./api/index.js');