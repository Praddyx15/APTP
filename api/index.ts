/**
 * Vercel API entry point
 * Server-side code for Advanced Pilot Training Platform
 */
import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import memorystore from 'memorystore';
import { registerRoutes } from '../server/routes';
import { storage } from '../server/storage';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import bodyParser from 'body-parser';
import compression from 'compression';
import helmet from 'helmet';
import WebSocket from 'ws';
import { User } from '../shared/schema';
import { Request, Response, NextFunction } from 'express';

declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      firstName: string;
      lastName: string;
      email: string;
      role: string;
      organizationType: string | null;
      organizationName: string | null;
      authProvider: string | null;
      authProviderId: string | null;
      profilePicture: string | null;
      mfaEnabled: boolean | null;
      lastLoginAt: Date | null;
      password?: string;
    }
  }
}

const scryptAsync = promisify(scrypt);

// Password utilities
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

const app = express();

// Setup logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`${req.method} ${req.path} ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Basic middleware setup
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(compression());
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// Session setup
const MemoryStore = memorystore(session);
// @ts-ignore - Type issue with express-session import
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET || 'pilot-training-platform-session-secret',
  store: new MemoryStore({
    checkPeriod: 86400000 // prune expired entries every 24h
  }),
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Passport setup
passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const user = await storage.getUserByUsername(username);
      if (!user || !(await comparePasswords(password, user.password))) {
        return done(null, false);
      } else {
        return done(null, user);
      }
    } catch (error) {
      return done(error);
    }
  }),
);

passport.serializeUser((user: any, done) => done(null, user.id));
passport.deserializeUser(async (id: number, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Authentication routes
app.post("/api/register", async (req, res, next) => {
  try {
    const existingUser = await storage.getUserByUsername(req.body.username);
    if (existingUser) {
      return res.status(400).json({ error: "Username already exists" });
    }

    // Hash the password before creating the user
    const hashedPassword = await hashPassword(req.body.password);
    
    const user = await storage.createUser({
      ...req.body,
      password: hashedPassword
    });

    req.login(user, (err) => {
      if (err) return next(err);
      // Don't send password back to the client
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post("/api/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    
    req.login(user, (loginErr) => {
      if (loginErr) return next(loginErr);
      // Don't send password back to the client
      const { password, ...userWithoutPassword } = user;
      res.status(200).json(userWithoutPassword);
    });
  })(req, res, next);
});

app.post("/api/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.status(200).json({ message: "Logged out successfully" });
  });
});

app.get("/api/user", (req, res) => {
  if (!req.isAuthenticated()) return res.status(401).json({ error: "Not authenticated" });
  // Don't send password back to the client
  const { password, ...userWithoutPassword } = req.user as any;
  res.json(userWithoutPassword);
});

// Handle WebSocket connections
const httpServer = createServer(app);
const wss = new WebSocketServer({ 
  server: httpServer, 
  path: '/ws',
  clientTracking: true
});

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');

  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe') {
        console.log(`WebSocket client subscribed to: ${data.channel}`);
        // Attach the channel to the WebSocket object for later use
        (ws as any).subscribedChannel = data.channel;
      }
    } catch (error) {
      console.error('Error processing WebSocket message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  // Send a welcome message
  ws.send(JSON.stringify({ 
    type: 'system', 
    message: 'Connected to Advanced Pilot Training Platform WebSocket Server'
  }));
});

// Broadcast function for sending notifications
export function broadcastNotification(channel: string, data: any) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && (client as any).subscribedChannel === channel) {
      client.send(JSON.stringify({
        type: 'notification',
        channel,
        timestamp: new Date().toISOString(),
        payload: data
      }));
    }
  });
}

// Register all API routes
registerRoutes(app);

// Serve static files for production
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(process.cwd(), 'dist/public');
  console.log(`Serving static files from: ${staticPath}`);
  app.use(express.static(staticPath));
  
  // For SPA routing - return the index.html for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(staticPath, 'index.html'));
    }
  });
}

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'production' ? null : err.message
  });
});

// Start the server if not running in serverless environment
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

// Export for serverless environments
export default app;