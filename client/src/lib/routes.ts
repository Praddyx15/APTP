// Define application routes by role

import { RoleType } from '@shared/risk-assessment-types';

export const ROUTES = {
  // Common routes
  DASHBOARD: '/',
  PROFILE: '/profile',
  DOCUMENTS: '/documents',
  KNOWLEDGE_GRAPH: '/knowledge-graph',
  ANALYTICS: '/analytics',
  COMPLIANCE: '/compliance',
  SYLLABUS_GENERATOR: '/syllabus-generator',
  SESSION_REPLAY: '/session-replay',
  RESOURCES: '/resources',
  ASSESSMENTS: '/assessments',
  SCHEDULE: '/schedule',
  MESSAGING: '/messaging',
  TRAINING_PROGRAMS: '/training-programs',
  ACHIEVEMENTS: '/achievements',
  
  // Trainee specific routes
  TRAINEE: {
    COURSES: '/trainee/courses',
    PROGRESS: '/trainee/progress',
    ASSESSMENTS: '/trainee/assessments',
    RESOURCES: '/trainee/resources',
    SELF_ASSESSMENT: '/trainee/self-assessment',
    FLIGHT_LOGS: '/trainee/flight-logs',
    PERFORMANCE: '/trainee/performance',
  },
  
  // Instructor specific routes 
  INSTRUCTOR: {
    STUDENTS: '/instructor/students',
    COURSES: '/instructor/courses',
    ASSESSMENTS: '/instructor/assessments',
    GRADING: '/instructor/grading',
    SESSION_PLANNING: '/instructor/session-planning',
    TRAINING_RECORDS: '/instructor/training-records',
    STUDENT_ANALYTICS: '/instructor/student-analytics',
  },
  
  // Examiner specific routes
  EXAMINER: {
    EXAMINATIONS: '/examiner/examinations',
    CANDIDATES: '/examiner/candidates',
    RESULTS: '/examiner/results',
    STATISTICS: '/examiner/statistics',
    COMPETENCY_TRACKING: '/examiner/competency-tracking',
  },
  
  // Airline specific routes
  AIRLINE: {
    PILOTS: '/airline/pilots',
    FLEET: '/airline/fleet',
    COMPLIANCE: '/airline/compliance',
    TRAINING_PROGRAMS: '/airline/training-programs',
    REGULATIONS: '/airline/regulations',
    PERFORMANCE_METRICS: '/airline/performance-metrics',
  },
  
  // ATO specific routes
  ATO: {
    CERTIFICATIONS: '/ato/certifications',
    INSTRUCTORS: '/ato/instructors',
    STUDENTS: '/ato/students',
    COURSES: '/ato/courses',
    COMPLIANCE: '/ato/compliance',
    FACILITIES: '/ato/facilities',
    PROGRAM_MANAGEMENT: '/ato/program-management',
  },
  
  // Admin routes
  ADMIN: {
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
    ORGANIZATIONS: '/admin/organizations',
    AUDIT_LOGS: '/admin/audit-logs',
    SYSTEM_CONFIG: '/admin/system-config',
  },
  
  // Auth routes
  AUTH: '/auth',
};

// Role-specific navigation items with icons
export const getNavigationItems = (userRole?: string) => {
  const role = userRole || 'trainee';
  
  // Common items for all roles
  const commonItems = [
    { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'home' },
    { name: 'Documents', path: ROUTES.DOCUMENTS, icon: 'file' },
    { name: 'Profile', path: ROUTES.PROFILE, icon: 'user' },
  ];
  
  // Role-specific navigation items
  switch (role) {
    case RoleType.TRAINEE:
      return [
        ...commonItems,
        { name: 'My Courses', path: ROUTES.TRAINEE.COURSES, icon: 'book' },
        { name: 'Progress Tracking', path: ROUTES.TRAINEE.PROGRESS, icon: 'bar-chart' },
        { name: 'Assessments', path: ROUTES.TRAINEE.ASSESSMENTS, icon: 'clipboard' },
        { name: 'Resources', path: ROUTES.TRAINEE.RESOURCES, icon: 'bookmark' },
        { name: 'Flight Logs', path: ROUTES.TRAINEE.FLIGHT_LOGS, icon: 'clipboard-list' },
        { name: 'Schedule', path: ROUTES.SCHEDULE, icon: 'calendar' },
        { name: 'Performance', path: ROUTES.TRAINEE.PERFORMANCE, icon: 'trending-up' },
        { name: 'Risk Assessment', path: ROUTES.COMPLIANCE, icon: 'shield' },
      ];
      
    case RoleType.INSTRUCTOR:
      return [
        ...commonItems,
        { name: 'Students', path: ROUTES.INSTRUCTOR.STUDENTS, icon: 'users' },
        { name: 'Courses', path: ROUTES.INSTRUCTOR.COURSES, icon: 'book' },
        { name: 'Assessments', path: ROUTES.INSTRUCTOR.ASSESSMENTS, icon: 'clipboard' },
        { name: 'Grading', path: ROUTES.INSTRUCTOR.GRADING, icon: 'check-square' },
        { name: 'Session Planning', path: ROUTES.INSTRUCTOR.SESSION_PLANNING, icon: 'calendar' },
        { name: 'Student Analytics', path: ROUTES.INSTRUCTOR.STUDENT_ANALYTICS, icon: 'bar-chart-2' },
        { name: 'Training Records', path: ROUTES.INSTRUCTOR.TRAINING_RECORDS, icon: 'file-text' },
        { name: 'Risk Assessment', path: ROUTES.COMPLIANCE, icon: 'shield' },
        { name: 'Knowledge Graph', path: ROUTES.KNOWLEDGE_GRAPH, icon: 'git-branch' },
      ];
      
    case RoleType.EXAMINER:
      return [
        ...commonItems,
        { name: 'Examinations', path: ROUTES.EXAMINER.EXAMINATIONS, icon: 'book-open' },
        { name: 'Candidates', path: ROUTES.EXAMINER.CANDIDATES, icon: 'users' },
        { name: 'Results', path: ROUTES.EXAMINER.RESULTS, icon: 'check-circle' },
        { name: 'Statistics', path: ROUTES.EXAMINER.STATISTICS, icon: 'pie-chart' },
        { name: 'Competency Tracking', path: ROUTES.EXAMINER.COMPETENCY_TRACKING, icon: 'target' },
        { name: 'Schedule', path: ROUTES.SCHEDULE, icon: 'calendar' },
        { name: 'Risk Assessment', path: ROUTES.COMPLIANCE, icon: 'shield' },
      ];
      
    case RoleType.AIRLINE:
      return [
        ...commonItems,
        { name: 'Pilots', path: ROUTES.AIRLINE.PILOTS, icon: 'users' },
        { name: 'Training Programs', path: ROUTES.AIRLINE.TRAINING_PROGRAMS, icon: 'layers' },
        { name: 'Compliance', path: ROUTES.AIRLINE.COMPLIANCE, icon: 'check-square' },
        { name: 'Regulations', path: ROUTES.AIRLINE.REGULATIONS, icon: 'book' },
        { name: 'Performance Metrics', path: ROUTES.AIRLINE.PERFORMANCE_METRICS, icon: 'trending-up' },
        { name: 'Risk Assessment', path: ROUTES.COMPLIANCE, icon: 'shield' },
        { name: 'Analytics', path: ROUTES.ANALYTICS, icon: 'bar-chart-2' },
        { name: 'Knowledge Graph', path: ROUTES.KNOWLEDGE_GRAPH, icon: 'git-branch' },
      ];
      
    case RoleType.ATO:
      return [
        ...commonItems,
        { name: 'Certifications', path: ROUTES.ATO.CERTIFICATIONS, icon: 'award' },
        { name: 'Instructors', path: ROUTES.ATO.INSTRUCTORS, icon: 'users' },
        { name: 'Students', path: ROUTES.ATO.STUDENTS, icon: 'user-check' },
        { name: 'Courses', path: ROUTES.ATO.COURSES, icon: 'book' },
        { name: 'Compliance', path: ROUTES.ATO.COMPLIANCE, icon: 'shield-check' },
        { name: 'Program Management', path: ROUTES.ATO.PROGRAM_MANAGEMENT, icon: 'settings' },
        { name: 'Syllabus Generator', path: ROUTES.SYLLABUS_GENERATOR, icon: 'cpu' },
        { name: 'Knowledge Graph', path: ROUTES.KNOWLEDGE_GRAPH, icon: 'git-branch' },
        { name: 'Risk Assessment', path: ROUTES.COMPLIANCE, icon: 'shield' },
      ];
      
    case 'admin':
      return [
        ...commonItems,
        { name: 'Users', path: ROUTES.ADMIN.USERS, icon: 'users' },
        { name: 'Organizations', path: ROUTES.ADMIN.ORGANIZATIONS, icon: 'briefcase' },
        { name: 'Settings', path: ROUTES.ADMIN.SETTINGS, icon: 'settings' },
        { name: 'Audit Logs', path: ROUTES.ADMIN.AUDIT_LOGS, icon: 'activity' },
        { name: 'System Config', path: ROUTES.ADMIN.SYSTEM_CONFIG, icon: 'sliders' },
      ];
    
    default:
      return commonItems;
  }
};

// Get role-specific theme colors
export const getThemeColors = (userRole: string, organizationType?: string) => {
  switch (userRole) {
    case RoleType.TRAINEE:
      return {
        primary: '#2563eb', // Blue 600
        secondary: '#3b82f6', // Blue 500
        accent: '#dbeafe', // Blue 100
        sidebar: 'from-blue-800 to-blue-900',
        header: 'bg-blue-800',
        text: 'text-white',
        logo: 'Student Portal'
      };
      
    case RoleType.INSTRUCTOR:
      return {
        primary: '#0f766e', // Teal 700
        secondary: '#14b8a6', // Teal 400
        accent: '#ccfbf1', // Teal 100
        sidebar: 'from-teal-800 to-teal-900',
        header: 'bg-teal-800',
        text: 'text-white',
        logo: 'Instructor Portal'
      };
      
    case RoleType.EXAMINER:
      return {
        primary: '#7c3aed', // Violet 600
        secondary: '#8b5cf6', // Violet 500
        accent: '#ede9fe', // Violet 100
        sidebar: 'from-violet-800 to-violet-900',
        header: 'bg-violet-800',
        text: 'text-white',
        logo: 'Examiner Portal'
      };
      
    case RoleType.AIRLINE:
      return {
        primary: '#c2410c', // Orange 700
        secondary: '#f97316', // Orange 500
        accent: '#ffedd5', // Orange 100
        sidebar: 'from-orange-800 to-orange-900',
        header: 'bg-orange-800',
        text: 'text-white',
        logo: 'Airline Training'
      };
      
    case RoleType.ATO:
      return {
        primary: '#0369a1', // Sky 700
        secondary: '#0ea5e9', // Sky 500
        accent: '#e0f2fe', // Sky 100
        sidebar: 'from-sky-800 to-sky-900',
        header: 'bg-sky-800',
        text: 'text-white',
        logo: 'ATO Management'
      };
      
    case 'admin':
      return {
        primary: '#0e7490', // Cyan 700
        secondary: '#06b6d4', // Cyan 500
        accent: '#cffafe', // Cyan 100
        sidebar: 'from-slate-800 to-slate-900',
        header: 'bg-slate-800',
        text: 'text-white',
        logo: 'Admin Portal'
      };
      
    default:
      return {
        primary: '#2563eb', // Blue 600
        secondary: '#3b82f6', // Blue 500
        accent: '#dbeafe', // Blue 100
        sidebar: 'from-blue-800 to-blue-900',
        header: 'bg-blue-800',
        text: 'text-white',
        logo: 'Training Platform'
      };
  }
};