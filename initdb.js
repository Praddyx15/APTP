/**
 * Database initialization script for Advanced Pilot Training Platform
 * 
 * This script creates all required database tables based on the schema defined in shared/schema.ts
 * and creates initial user accounts for testing and development.
 */

const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const crypto = require('crypto');

// Load required schema files
require('dotenv').config();

console.log('Starting database initialization...');

// Get database URL from environment
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('ERROR: DATABASE_URL environment variable is not defined');
  process.exit(1);
}

// Hash password for user accounts
async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (err, derivedKey) => {
      if (err) reject(err);
      resolve(`${derivedKey.toString('hex')}.${salt}`);
    });
  });
}

async function initializeDatabase() {
  console.log('Connecting to database...');
  
  // Connect to database
  const client = postgres(dbUrl, { max: 1 });
  const db = drizzle(client);
  
  try {
    // Check for the users table
    const tableCheck = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'users'
    `;
    
    if (tableCheck.length === 0) {
      console.log('Users table does not exist, creating schema...');
      
      // Create users table
      await client`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username TEXT NOT NULL UNIQUE,
          password TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          email TEXT NOT NULL,
          role TEXT NOT NULL,
          organization_type TEXT,
          organization_name TEXT,
          auth_provider TEXT,
          auth_provider_id TEXT,
          profile_picture TEXT,
          mfa_enabled BOOLEAN DEFAULT false,
          mfa_method TEXT,
          last_login_at TIMESTAMP
        )
      `;
      
      console.log('Users table created successfully');
      
      // Create initial user accounts
      console.log('Creating initial test user accounts...');
      
      const users = [
        {
          username: 'admin',
          password: await hashPassword('admin123'),
          firstName: 'Admin',
          lastName: 'User',
          email: 'admin@aviation-training.com',
          role: 'admin',
          organizationType: 'Admin',
          organizationName: 'Aviation Training Platform'
        },
        {
          username: 'instructor',
          password: await hashPassword('instructor123'),
          firstName: 'John',
          lastName: 'Pilot',
          email: 'instructor@ato-training.com',
          role: 'instructor',
          organizationType: 'ATO',
          organizationName: 'Flight Training Academy'
        },
        {
          username: 'atostudent',
          password: await hashPassword('password123'),
          firstName: 'Sarah',
          lastName: 'Smith',
          email: 'student@ato-training.com',
          role: 'trainee',
          organizationType: 'ATO',
          organizationName: 'Flight Training Academy'
        },
        {
          username: 'airlinepilot',
          password: await hashPassword('pilot123'),
          firstName: 'James',
          lastName: 'Rodriguez',
          email: 'pilot@airline.com',
          role: 'trainee',
          organizationType: 'Airline',
          organizationName: 'Global Airways'
        }
      ];
      
      // Insert users
      for (const user of users) {
        await client`
          INSERT INTO users (
            username, password, first_name, last_name, email, 
            role, organization_type, organization_name
          ) VALUES (
            ${user.username}, ${user.password}, ${user.firstName}, ${user.lastName}, 
            ${user.email}, ${user.role}, ${user.organizationType}, ${user.organizationName}
          )
        `;
        console.log(`Created user: ${user.username} (${user.role})`);
      }
      
      console.log('Initial users created successfully');
    } else {
      console.log('Users table already exists');
    }
    
    console.log('Database initialization completed successfully');
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the initialization
initializeDatabase().catch(console.error);
