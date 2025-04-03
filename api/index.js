/**
 * API entry point for serverless function handling in Vercel
 * 
 * This file serves as the central entry point for all API routes in the
 * Advanced Pilot Training Platform when deployed to Vercel's serverless environment.
 */
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const { Strategy: LocalStrategy } = require('passport-local');
const MemoryStore = require('memorystore')(session);
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');

// Create Express app
const app = express();

// Security and optimization middleware
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https:"]
    }
  }
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN || true,
  credentials: true
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session setup
const sessionStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'advanced-pilot-training-secret',
  resave: false,
  saveUninitialized: false,
  store: sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production', 
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Set up basic auth strategy (will be expanded in server/auth.ts)
passport.use(new LocalStrategy(async (username, password, done) => {
  try {
    // This is just a placeholder - the actual implementation is in server/auth.ts
    return done(null, { id: 1, username, role: 'admin' });
  } catch (error) {
    return done(error);
  }
}));

// Serialization for session storage
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    // This is just a placeholder - the actual implementation is in server/auth.ts
    done(null, { id, username: 'user', role: 'admin' });
  } catch (error) {
    done(error);
  }
});

// API Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || 'unknown'
  });
});

// Default auth endpoints
app.post('/api/login', passport.authenticate('local'), (req, res) => {
  res.status(200).json(req.user);
});

app.post('/api/logout', (req, res) => {
  req.logout((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.status(200).json({ message: 'Logged out successfully' });
  });
});

app.get('/api/user', (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  res.json(req.user);
});

// Default 404 handler for API routes
app.all('/api/*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message
  });
});

// Export for serverless function handling
module.exports = (req, res) => {
  return app(req, res);
};