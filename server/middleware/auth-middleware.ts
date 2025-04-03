/**
 * Authentication and authorization middleware
 */
import { Request, Response, NextFunction } from 'express';

// Define role permissions since it's missing in session-types
const roleSchedulingPermissions = {
  admin: {
    createSession: true,
    updateSession: true,
    deleteSession: true,
    viewAllSessions: true,
    assignInstructors: true,
    assignTrainees: true,
    approveSessionPlans: true,
    generateSessionPlans: true
  },
  ato: {
    createSession: true,
    updateSession: true,
    deleteSession: true,
    viewAllSessions: true,
    assignInstructors: true,
    assignTrainees: true,
    approveSessionPlans: true,
    generateSessionPlans: true
  },
  airline: {
    createSession: true,
    updateSession: true,
    deleteSession: false,
    viewAllSessions: true,
    assignInstructors: true,
    assignTrainees: true,
    approveSessionPlans: false,
    generateSessionPlans: true
  },
  instructor: {
    createSession: false,
    updateSession: true,
    deleteSession: false,
    viewAllSessions: false,
    assignInstructors: false,
    assignTrainees: false,
    approveSessionPlans: false,
    generateSessionPlans: false
  },
  trainee: {
    createSession: false,
    updateSession: false,
    deleteSession: false,
    viewAllSessions: false,
    assignInstructors: false,
    assignTrainees: false,
    approveSessionPlans: false,
    generateSessionPlans: false
  }
};

/**
 * Middleware to ensure a user is authenticated
 */
export function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: User not authenticated'
    });
  }
  
  next();
}

/**
 * Middleware to check if a user has the required permission
 * @param permission The permission to check
 */
export function hasPermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized: User not authenticated'
      });
    }
    
    const userRole = req.user.role;
    const permissions = roleSchedulingPermissions[userRole] || {};
    
    if (!permissions[permission]) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission} is required for this action`
      });
    }
    
    next();
  };
}

/**
 * Check if a user has a specific permission (for use within route handlers)
 * @param user The user object
 * @param permission The permission to check
 */
export function checkPermission(user: any, permission: string): boolean {
  if (!user || !user.role) {
    return false;
  }
  
  const userRole = user.role;
  const permissions = roleSchedulingPermissions[userRole] || {};
  
  return !!permissions[permission];
}