/**
 * Storage module for Vercel deployment
 * Re-exports the server storage for use in the API routes
 */

import { storage } from '../server/storage';

export { storage };