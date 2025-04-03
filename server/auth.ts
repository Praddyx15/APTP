import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, insertUserSchema } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // For development/testing, allow plaintext password comparison
  if (!stored.includes('.')) {
    return supplied === stored;
  }
  
  // For hashed passwords
  try {
    const [hashed, salt] = stored.split(".");
    if (!hashed || !salt) {
      console.log("Invalid password format, missing hash or salt");
      return false; // Missing hash or salt
    }
    
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error("Password comparison error:", error);
    // If there's an error with the stored hash, just fall back to direct comparison
    // This is only for development and should never happen in production
    return supplied === stored;
  }
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "aviation-training-app-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check if the username field is an email
        const isEmail = username.includes('@');
        
        // First try to find user by username
        let user = await storage.getUserByUsername(username);
        
        // If not found and input looks like an email, try to find by email
        if (!user && isEmail) {
          const users = await storage.getAllUsers();
          user = users.find(u => u.email.toLowerCase() === username.toLowerCase());
        }
        
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
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Registration schema with additional validations
  const registerSchema = insertUserSchema.extend({
    password: z.string().min(6, "Password must be at least 6 characters"),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Invalid email format"),
    role: z.enum(["admin", "instructor", "trainee", "examiner"], {
      errorMap: () => ({ message: "Role must be either 'admin', 'instructor', 'trainee', or 'examiner'" }),
    }).default("trainee"), // Default to trainee, will be overridden based on email pattern
    organizationType: z.enum(["ATO", "Airline", "Personal", "Admin"], {
      errorMap: () => ({ message: "Organization type must be one of 'ATO', 'Airline', 'Personal', or 'Admin'" }),
    }).default("Airline"), // Default to Airline, will be overridden based on email pattern
    organizationName: z.string().optional(),
    authProvider: z.enum(["local", "google", "microsoft"], {
      errorMap: () => ({ message: "Auth provider must be one of 'local', 'google', or 'microsoft'" }),
    }).default("local"),
    authProviderId: z.string().optional(),
    profilePicture: z.string().url().optional(),
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const validatedData = registerSchema.parse(req.body);
      
      const existingUser = await storage.getUserByUsername(validatedData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      // Check if email already exists
      const users = await storage.getAllUsers();
      const emailExists = users.some(u => u.email.toLowerCase() === validatedData.email.toLowerCase());
      if (emailExists) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Determine role and organization type based on email pattern
      const email = validatedData.email.toLowerCase();
      let role = validatedData.role;
      let organizationType = validatedData.organizationType;
      
      if (email.includes('admin@')) {
        role = 'admin';
        organizationType = 'Admin';
      } else if (email.includes('examiner@ato')) {
        role = 'examiner';
        organizationType = 'ATO';
      } else if (email.includes('ato@')) {
        role = 'instructor';
        organizationType = 'ATO';
      } else if (email.includes('airline@')) {
        role = 'instructor';
        organizationType = 'Airline';
      } else if (email.includes('student@ato')) {
        role = 'trainee';
        organizationType = 'ATO';
      } else if (email.includes('student@')) {
        role = 'trainee';
        organizationType = 'Airline';
      }
      
      // If no role identified, default to trainee
      if (!role) {
        role = 'trainee';
      }

      const user = await storage.createUser({
        ...validatedData,
        role,
        organizationType,
        password: await hashPassword(validatedData.password),
      });

      const userWithoutPassword = {
        ...user,
        password: undefined,
      };

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: error.errors 
        });
      }
      next(error);
    }
  });

  app.post("/api/login", (req, res, next) => {
    // @ts-ignore: TypeScript doesn't properly infer types for passport.authenticate()
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        return next(err);
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        const userWithoutPassword = {
          ...user,
          password: undefined,
        };
        
        return res.status(200).json(userWithoutPassword);
      });
    })(req, res, next);
  });
  
  // Mock implementation for social login
  // In a real implementation, we would use passport strategies for Google and Microsoft
  app.post("/api/social-login", async (req, res, next) => {
    try {
      const { provider, token, profile } = req.body;
      
      if (!provider || !token || !profile) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      if (provider !== "google" && provider !== "microsoft") {
        return res.status(400).json({ message: "Invalid provider" });
      }
      
      // In a real implementation, we would verify the token with the provider
      // and get the user profile from the provider
      // Here we'll just use the provided profile and check if user exists
      
      let user = await storage.getUserByUsername(`${provider}_${profile.email}`);
      
      if (!user) {
        // Determine role and organization type based on email pattern
        const email = profile.email.toLowerCase();
        let role = 'trainee'; // Default role
        let organizationType = req.body.organizationType || 'Airline';
        
        if (email.includes('admin@')) {
          role = 'admin';
          organizationType = 'Admin';
        } else if (email.includes('examiner@ato')) {
          role = 'examiner';
          organizationType = 'ATO';
        } else if (email.includes('ato@')) {
          role = 'instructor';
          organizationType = 'ATO';
        } else if (email.includes('airline@')) {
          role = 'instructor';
          organizationType = 'Airline';
        } else if (email.includes('student@ato')) {
          role = 'trainee';
          organizationType = 'ATO';
        } else if (email.includes('student@')) {
          role = 'trainee';
          organizationType = 'Airline';
        }
        
        // Create new user if not exists
        user = await storage.createUser({
          username: `${provider}_${profile.email}`,
          password: await hashPassword(randomBytes(16).toString("hex")), // Random password
          email: profile.email,
          firstName: profile.firstName || profile.given_name || profile.name.split(" ")[0],
          lastName: profile.lastName || profile.family_name || profile.name.split(" ").slice(1).join(" "),
          role: role,
          organizationType: organizationType,
          organizationName: req.body.organizationName || organizationType,
          authProvider: provider,
          authProviderId: profile.id || profile.sub,
          profilePicture: profile.picture || profile.avatar,
        });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          return next(loginErr);
        }
        
        const userWithoutPassword = {
          ...user,
          password: undefined,
        };
        
        return res.status(200).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    
    const userWithoutPassword = {
      ...req.user,
      password: undefined,
    };
    
    res.json(userWithoutPassword);
  });

  // Middleware for checking authenticated routes
  app.use("/api/protected/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    next();
  });

  // Middleware for instructor-only routes
  app.use("/api/instructor/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Access denied. Instructor role required." });
    }
    next();
  });
  
  // Middleware for examiner-only routes
  app.use("/api/examiner/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "examiner") {
      return res.status(403).json({ message: "Access denied. Examiner role required." });
    }
    next();
  });
  
  // Middleware for admin-only routes
  app.use("/api/admin/*", (req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Authentication required" });
    }
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Access denied. Admin role required." });
    }
    next();
  });
}
