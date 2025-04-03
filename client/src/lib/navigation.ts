
// Navigation constants and utilities

// Main navigation paths
export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  PROFILE: '/profile',
  SETTINGS: '/settings',
  LOGIN: '/login',
  REGISTER: '/register',
  
  // Admin routes
  ADMIN: {
    DASHBOARD: '/admin/dashboard',
    USERS: '/admin/users',
    SETTINGS: '/admin/settings',
  },
  
  // User type specific routes
  STUDENT: {
    DASHBOARD: '/student/dashboard',
    COURSES: '/student/courses',
    PROGRESS: '/student/progress',
  },
  
  INSTRUCTOR: {
    DASHBOARD: '/instructor/dashboard',
    STUDENTS: '/instructor/students',
    COURSES: '/instructor/courses',
  }
};

// Navigation helper functions
export const createUrl = (path: string, params?: Record<string, string>) => {
  if (!params) return path;
  
  const url = new URL(path, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.append(key, value);
  });
  
  return url.pathname + url.search;
};

// Navigation guards
export const requireAuth = (next: () => void) => {
  // This would typically check if the user is authenticated
  const isAuthenticated = localStorage.getItem('auth_token');
  if (isAuthenticated) {
    next();
  } else {
    // Redirect to login
    window.location.href = ROUTES.LOGIN;
  }
};

// Navigation items for different user roles
export const getNavigationItems = (role?: string) => {
  const commonItems = [
    { name: 'Dashboard', path: ROUTES.DASHBOARD, icon: 'dashboard' },
    { name: 'Profile', path: ROUTES.PROFILE, icon: 'user' },
  ];
  
  switch (role) {
    case 'admin':
      return [
        ...commonItems,
        { name: 'Users', path: ROUTES.ADMIN.USERS, icon: 'users' },
        { name: 'Settings', path: ROUTES.ADMIN.SETTINGS, icon: 'settings' },
      ];
    case 'student':
      return [
        ...commonItems,
        { name: 'Courses', path: ROUTES.STUDENT.COURSES, icon: 'book' },
        { name: 'Progress', path: ROUTES.STUDENT.PROGRESS, icon: 'chart' },
      ];
    case 'instructor':
      return [
        ...commonItems,
        { name: 'Students', path: ROUTES.INSTRUCTOR.STUDENTS, icon: 'users' },
        { name: 'Courses', path: ROUTES.INSTRUCTOR.COURSES, icon: 'book' },
      ];
    default:
      return commonItems;
  }
};
