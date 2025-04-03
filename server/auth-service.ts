/**
 * Authentication and Authorization Service
 * 
 * Handles user authentication and permission checking
 */
import { SchedulingPermissions, roleSchedulingPermissions } from '@shared/session-types';

/**
 * Get the scheduling permissions for a user based on their role
 * @param userId The ID of the user
 * @returns The permissions for the user based on their role
 */
export function getPermissions(userId: string): SchedulingPermissions {
  // In a real application, we would look up the user's role
  // For now, we'll use a simple mapping
  
  // Static mapping for demonstration purposes
  const userRoles: Record<string, string> = {
    'INS1001': 'instructor',
    'INS1002': 'instructor',
    'INS1003': 'instructor',
    'ST1001': 'trainee',
    'ST1002': 'trainee',
    'ST1003': 'trainee',
    'ST1004': 'trainee',
    'ST1005': 'trainee',
    'ADMIN1': 'admin',
    'ATO1': 'ato',
    'AIRLINE1': 'airline',
    'EXAMINER1': 'examiner'
  };
  
  const userRole = userRoles[userId] || 'trainee';
  
  // Get permissions based on role
  return roleSchedulingPermissions[userRole] || {
    canCreate: false,
    canUpdate: false,
    canDelete: false,
    canApprove: false,
    canViewAll: false,
    canAssignInstructors: false,
    canAssignResources: false
  };
}