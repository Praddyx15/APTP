/**
 * Server entry point for Advanced Pilot Training Platform
 */

import express, { Request, Response, NextFunction } from 'express';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import cors from 'cors';
import compression from 'compression';
import { serve } from './vite';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from './storage';
import apiRoutes from './routes/index';
import { logger } from './utils/logger';
import { initMockData } from './mock-data';

// Environment variables
const PORT = Number(process.env.PORT) || 5000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'advanced-pilot-training-platform-secret';
const MAX_UPLOAD_SIZE = process.env.MAX_UPLOAD_SIZE ? parseInt(process.env.MAX_UPLOAD_SIZE) : 50 * 1024 * 1024; // Default 50MB

// Create application
const app = express();

// Ensure uploads directory exists
import fs from 'fs';
import path from 'path';
const uploadDir = process.env.UPLOAD_DIR || 'uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Promisify scrypt
const scryptAsync = promisify(scrypt);

// Password hashing functions
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString('hex')}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Configure middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Configure session management
const sessionSettings: session.SessionOptions = {
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    sameSite: 'none'
  }
};

app.use(session(sessionSettings));

// Configure passport
app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    const user = await storage.getUserByUsername(username);
    if (!user || !(await comparePasswords(password, user.password))) {
      return done(null, false, { message: 'Invalid username or password' });
    }
    // Remove password from user object before returning
    const { password: _, ...cleanUser } = user;
    return done(null, cleanUser);
  } catch (error) {
    return done(error);
  }
}));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    if (!user) {
      return done(null, false);
    }
    // Remove password from user object before returning
    const { password: _, ...cleanUser } = user;
    done(null, cleanUser);
  } catch (error) {
    done(error);
  }
});

// API routes
app.use('/api', apiRoutes);

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads', { recursive: true });
}

// Authentication routes
app.post('/api/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Check if username already exists
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await hashPassword(req.body.password);

    // Create user
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword,
      createdAt: new Date().toISOString()
    });

    // Remove password before returning
    const { password: _, ...cleanUser } = user;

    // Auto-login
    req.login(cleanUser, (err) => {
      if (err) {
        return next(err);
      }
      res.status(201).json(cleanUser);
    });
  } catch (error) {
    logger.error(`Registration error: ${error instanceof Error ? error.message : String(error)}`);
    next(error);
  }
});

app.post('/api/login', passport.authenticate('local'), (req: Request, res: Response) => {
  res.json(req.user);
});

app.post('/api/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.sendStatus(200);
  });
});

app.get('/api/user', (req: Request, res: Response) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(`Error: ${err.message}`, { stack: err.stack });
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? undefined : err.message
  });
});

// Initialize mock data (for development)
if (process.env.NODE_ENV !== 'production') {
  initMockData().catch(err => {
    logger.error(`Failed to initialize mock data: ${err instanceof Error ? err.message : String(err)}`);
  });
}

// Serve client app in development
if (process.env.NODE_ENV !== 'production') {
  serve(app);
}

// Start server if this is the main module
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server running on port ${PORT}`);
  });
}

// Export app for external usage
export { app };
