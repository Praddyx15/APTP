/**
 * Storage interface for the application
 * 
 * This module provides storage access for all application data,
 * abstracting the underlying storage implementation.
 */

import { IStorage } from './storage-types';
import { DatabaseStorage } from './database-storage';

// Create and export a singleton instance of database storage
export const storage: IStorage = new DatabaseStorage();
