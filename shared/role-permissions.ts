/**
 * Role-based scheduling permissions
 * Defines what each role can do with sessions and scheduling
 */
export const roleSchedulingPermissions = {
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
}