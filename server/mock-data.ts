/**
 * Mock data for development and testing
 * This file contains functions to create test data in the storage
 */

import { storage } from './storage.js';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';
import { logger } from './utils/logger.js';

// Promisify scrypt
const scryptAsync = promisify(scrypt);

// Password hashing function
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

// Create mock users
export async function createMockUsers() {
  try {
    // Check if users already exist
    const existingAdmin = await storage.getUserByUsername('admin');
    if (existingAdmin) {
      logger.info('Mock users already exist, skipping creation');
      return;
    }
    
    // Create admin user
    await storage.createUser({
      username: 'admin',
      password: await hashPassword('admin123'),
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      role: 'admin',
      organizationType: 'ATO',
      organizationName: 'Aviation Training Academy',
      createdAt: new Date().toISOString()
    });
    
    // Create instructor user
    await storage.createUser({
      username: 'instructor',
      password: await hashPassword('instructor123'),
      firstName: 'John',
      lastName: 'Instructor',
      email: 'instructor@example.com',
      role: 'instructor',
      organizationType: 'ATO',
      organizationName: 'Aviation Training Academy',
      createdAt: new Date().toISOString()
    });
    
    // Create student user
    await storage.createUser({
      username: 'student',
      password: await hashPassword('student123'),
      firstName: 'Sarah',
      lastName: 'Student',
      email: 'student@example.com',
      role: 'student',
      organizationType: 'ATO',
      organizationName: 'Aviation Training Academy',
      createdAt: new Date().toISOString()
    });
    
    logger.info('Mock users created successfully');
  } catch (error) {
    logger.error(`Error creating mock users: ${error instanceof Error ? error.message : String(error)}`);
  }
}

// Initialize mock data
export async function initMockData() {
  logger.info('Initializing mock data');
  
  // Create mock users
  await createMockUsers();
  
  // Other mock data can be created here
  
  logger.info('Mock data initialization complete');
}
