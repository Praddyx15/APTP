/**
 * Advanced Pilot Training Platform - API Routes
 * 
 * This file centralizes all API routes for better organization.
 * It's used by the production server to set up the API endpoints.
 */

import express from 'express';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import { storage } from './storage.js';

// Import routes from other files
import { setupDocumentRoutes } from './routes/document-routes.js';

const scryptAsync = promisify(scrypt);

// Hash password function
async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString('hex')}.${salt}`;
}

// Compare passwords function
async function comparePasswords(supplied, stored) {
  const [hashed, salt] = stored.split('.');
  const hashedBuf = Buffer.from(hashed, 'hex');
  const suppliedBuf = await scryptAsync(supplied, salt, 64);
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

// Setup all API routes
export default function setupApiRoutes(app) {
  // Configure session management
  const sessionSettings = {
    secret: process.env.SESSION_SECRET || 'pilot-training-platform-secret',
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    }
  };

  // Set up session and passport
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Basic health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Authentication routes
  app.post('/api/register', async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send('Username already exists');
      }

      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (err) {
      next(err);
    }
  });

  app.post('/api/login', passport.authenticate('local'), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post('/api/logout', (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get('/api/user', (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // Set up document routes
  setupDocumentRoutes(app);

  // Return the configured app
  return app;
}