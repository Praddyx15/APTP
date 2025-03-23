// app/layout.tsx
'use client';

import React, { ReactNode, useState } from 'react';
import { 
  AppBar, 
  Box, 
  CssBaseline, 
  Divider, 
  Drawer, 
  IconButton, 
  List, 
  ListItem, 
  ListItemButton, 
  ListItemIcon, 
  ListItemText, 
  Toolbar, 
  Typography, 
  Avatar, 
  Badge, 
  Menu, 
  MenuItem, 
  Tooltip 
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Description,
  School,
  Analytics,
  Assessment,
  Group,
  EmojiEvents,
  Settings,
  Notifications,
  AccountCircle,
  Logout,
  Help,
  ChevronLeft,
  FlightTakeoff,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import './globals.css';

const drawerWidth = 260;

interface RootLayoutProps {
  children: ReactNode;
}

const navItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Document Intelligence', icon: <Description />, path: '/document-intelligence' },
  { text: 'Syllabus Builder', icon: <School />, path: '/syllabus-builder' },
  { text: 'Analytics', icon: <Analytics />, path: '/analytics' },
  { text: 'Debriefing', icon: <Assessment />, path: '/debriefing' },
  { text: 'Community', icon: <Group />, path: '/community' },
  { text: 'Gamification', icon: <EmojiEvents />, path: '/gamification' },
];

// Create a custom theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1e40af', // Blue-800
    },
    secondary: {
      main: '#6366f1', // Indigo-500
    },
    error: {
      main: '#ef4444', // Red-500
    },
    warning: {
      main: '#f59e0b', // Amber-500
    },
    info: {
      main: '#3b82f6', // Blue-500
    },
    success: {
      main: '#22c55e', // Green-500
    },
  },
  typography: {
    fontFamily: 'Inter, system-ui, Avenir, Helvetica, Arial, sans-serif',
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 600,
    },
    h4: {
      fontWeight: 600,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        rounded: {
          borderRadius: 12,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(0, 0, 0, 0.08)',
        },
      },
    },
  },
});

export default function RootLayout({ children }: RootLayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [accountMenuAnchorEl, setAccountMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationsMenuAnchorEl, setNotificationsMenuAnchorEl] = useState<null | HTMLElement>(null);

  const pathname = usePathname();

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleAccountMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAccountMenuAnchorEl(event.currentTarget);
  };

  const handleAccountMenuClose = () => {
    setAccountMenuAnchorEl(null);
  };

  const handleNotificationsMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationsMenuAnchorEl(event.currentTarget);
  };

  const handleNotificationsMenuClose = () => {
    setNotificationsMenuAnchorEl(null);
  };

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <FlightTakeoff sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" color="primary" className="font-bold">
            Pilot Training
          </Typography>
        </Box>
        <IconButton onClick={handleDrawerToggle}>
          <ChevronLeft />
        </IconButton>
      </Box>
      <Divider />
      <List sx={{ flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton 
              component={Link} 
              href={item.path}
              selected={pathname === item.path}
              sx={{ 
                borderRadius: 2, 
                mx: 1, 
                my: 0.5,
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                  },
                  '& .MuiListItemIcon-root': {
                    color: 'white',
                  },
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton 
            component={Link} 
            href="/settings"
            selected={pathname === '/settings'}
            sx={{ 
              borderRadius: 2, 
              mx: 1, 
              my: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Settings />
            </ListItemIcon>
            <ListItemText primary="Settings" />
          </ListItemButton>
        </ListItem>
        <ListItem disablePadding>
          <ListItemButton 
            component={Link} 
            href="/help"
            selected={pathname === '/help'}
            sx={{ 
              borderRadius: 2, 
              mx: 1, 
              my: 0.5,
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '& .MuiListItemIcon-root': {
                  color: 'white',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 40 }}>
              <Help />
            </ListItemIcon>
            <ListItemText primary="Help & Support" />
          </ListItemButton>
        </ListItem>
      </List>
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.02)' }}>
        <Avatar sx={{ mr: 2 }}>JD</Avatar>
        <Box>
          <Typography variant="subtitle2">John Doe</Typography>
          <Typography variant="body2" color="text.secondary">
            Instructor
          </Typography>
        </Box>
      </Box>
    </Box>
  );

  const notifications = [
    {
      id: 'notif-1',
      title: 'New assessment completed',
      message: 'Sarah Johnson has completed Boeing 737 Type Rating assessment',
      time: '10 minutes ago',
      read: false,
    },
    {
      id: 'notif-2',
      title: 'Syllabus updated',
      message: 'A320 Type Rating syllabus has been updated with new modules',
      time: '1 hour ago',
      read: false,
    },
    {
      id: 'notif-3',
      title: 'New forum post',
      message: 'Robert Chen posted a question about crosswind landing techniques',
      time: '3 hours ago',
      read: true,
    },
  ];

  return (
    <html lang="en">
      <body className="bg-gray-50">
        <ThemeProvider theme={theme}>
          <Box sx={{ display: 'flex' }}>
            <CssBaseline />
            
            {/* App Bar */}
            <AppBar 
              position="fixed" 
              sx={{ 
                zIndex: (theme) => theme.zIndex.drawer + 1,
                boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px',
              }}
            >
              <Toolbar>
                <IconButton
                  color="inherit"
                  aria-label="open drawer"
                  edge="start"
                  onClick={handleDrawerToggle}
                  sx={{ mr: 2 }}
                >
                  <MenuIcon />
                </IconButton>
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                  Advanced Pilot Training Platform
                </Typography>
                
                <Box sx={{ display: 'flex' }}>
                  <Tooltip title="Notifications">
                    <IconButton 
                      color="inherit"
                      onClick={handleNotificationsMenuOpen}
                    >
                      <Badge badgeContent={2} color="error">
                        <Notifications />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Account">
                    <IconButton
                      color="inherit"
                      onClick={handleAccountMenuOpen}
                      sx={{ ml: 1 }}
                    >
                      <AccountCircle />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Toolbar>
            </AppBar>
            
            {/* Navigation Drawer */}
            <Drawer
              variant="temporary"
              open={drawerOpen}
              onClose={handleDrawerToggle}
              ModalProps={{
                keepMounted: true, // Better open performance on mobile
              }}
              sx={{
                display: { xs: 'block' },
                '& .MuiDrawer-paper': { 
                  boxSizing: 'border-box', 
                  width: drawerWidth,
                  borderRight: 'none',
                  boxShadow: 'rgba(0, 0, 0, 0.05) 0px 1px 2px 0px, rgba(0, 0, 0, 0.05) 0px 0px 0px 1px',
                },
              }}
            >
              {drawer}
            </Drawer>
            
            {/* Main Content */}
            <Box
              component="main"
              sx={{
                flexGrow: 1,
                minHeight: '100vh',
                pt: { xs: 8 }, // Padding top to account for AppBar height
                width: '100%'
              }}
            >
              {children}
            </Box>
            
            {/* Account Menu */}
            <Menu
              anchorEl={accountMenuAnchorEl}
              open={Boolean(accountMenuAnchorEl)}
              onClose={handleAccountMenuClose}
              PaperProps={{
                elevation: 2,
                sx: { minWidth: 200 }
              }}
            >
              <MenuItem onClick={handleAccountMenuClose}>
                <ListItemIcon>
                  <AccountCircle fontSize="small" />
                </ListItemIcon>
                <ListItemText>Profile</ListItemText>
              </MenuItem>
              <MenuItem onClick={handleAccountMenuClose}>
                <ListItemIcon>
                  <Settings fontSize="small" />
                </ListItemIcon>
                <ListItemText>Settings</ListItemText>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleAccountMenuClose}>
                <ListItemIcon>
                  <Logout fontSize="small" />
                </ListItemIcon>
                <ListItemText>Logout</ListItemText>
              </MenuItem>
            </Menu>
            
            {/* Notifications Menu */}
            <Menu
              anchorEl={notificationsMenuAnchorEl}
              open={Boolean(notificationsMenuAnchorEl)}
              onClose={handleNotificationsMenuClose}
              PaperProps={{
                elevation: 2,
                sx: { minWidth: 320, maxWidth: 360 }
              }}
            >
              <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="medium">Notifications</Typography>
                <Typography variant="caption" color="primary">Mark all as read</Typography>
              </Box>
              <Divider />
              
              {notifications.map((notification) => (
                <MenuItem 
                  key={notification.id} 
                  onClick={handleNotificationsMenuClose}
                  sx={{ 
                    py: 1.5, 
                    px: 2,
                    backgroundColor: notification.read ? 'transparent' : 'rgba(25, 118, 210, 0.08)',
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" className="font-medium">
                      {notification.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {notification.message}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {notification.time}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
              
              <Divider />
              <Box sx={{ p: 1.5, textAlign: 'center' }}>
                <Typography 
                  variant="body2" 
                  color="primary"
                  sx={{ cursor: 'pointer' }}
                  onClick={handleNotificationsMenuClose}
                >
                  View all notifications
                </Typography>
              </Box>
            </Menu>
          </Box>
        </ThemeProvider>
      </body>
    </html>
  );
}

// app/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Import Inter font */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap');

/* Base styles */
:root {
  --foreground-rgb: 0, 0, 0;
  --background-start-rgb: 248, 250, 252;
  --background-end-rgb: 248, 250, 252;
}

html,
body {
  max-width: 100vw;
  overflow-x: hidden;
}

body {
  color: rgb(var(--foreground-rgb));
  background: linear-gradient(
      to bottom,
      transparent,
      rgb(var(--background-end-rgb))
    )
    rgb(var(--background-start-rgb));
}

/* Utility classes */
.line-clamp-1 {
  display: -webkit-box;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.line-clamp-3 {
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Dashboard page */
// app/dashboard/page.tsx
'use client';

import React from 'react';
import { 
  Container, 
  Box, 
  Typography, 
  Grid, 
  Paper, 
  Card, 
  CardContent, 
  Button, 
  Divider, 
  Avatar, 
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  FlightTakeoff,
  School,
  Assessment,
  Group,
  Description,
  AutoAwesome,
  Star,
  ChevronRight,
  NotificationsActive,
  CheckCircle,
  AccessTime,
  DirectionsRun,
  Visibility
} from '@mui/icons-material';

export default function DashboardPage() {
  return (
    <Container maxWidth="xl">
      <Box className="py-6">
        <Typography variant="h4" className="mb-6">Dashboard</Typography>
        
        <Grid container spacing={4}>
          {/* Quick Actions */}
          <Grid item xs={12} md={8}>
            <Paper elevation={1} className="p-6">
              <Typography variant="h6" className="mb-4">Quick Actions</Typography>
              <Grid container spacing={3}>
                <Grid item xs={6} sm={3}>
                  <Card 
                    elevation={0} 
                    className="text-center p-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Box className="flex justify-center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                        <Description />
                      </Avatar>
                    </Box>
                    <Typography variant="subtitle2" className="mt-2">
                      Upload Documents
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card 
                    elevation={0} 
                    className="text-center p-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Box className="flex justify-center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                        <School />
                      </Avatar>
                    </Box>
                    <Typography variant="subtitle2" className="mt-2">
                      Create Syllabus
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card 
                    elevation={0} 
                    className="text-center p-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Box className="flex justify-center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                        <Assessment />
                      </Avatar>
                    </Box>
                    <Typography variant="subtitle2" className="mt-2">
                      Review Session
                    </Typography>
                  </Card>
                </Grid>
                
                <Grid item xs={6} sm={3}>
                  <Card 
                    elevation={0} 
                    className="text-center p-3 border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors cursor-pointer"
                  >
                    <Box className="flex justify-center">
                      <Avatar sx={{ bgcolor: 'primary.main', width: 56, height: 56 }}>
                        <Group />
                      </Avatar>
                    </Box>
                    <Typography variant="subtitle2" className="mt-2">
                      Browse Community
                    </Typography>
                  </Card>
                </Grid>
              </Grid>
            </Paper>
            
            {/* Recent Activities */}
            <Paper elevation={1} className="p-6 mt-6">
              <Typography variant="h6" className="mb-4">Recent Activities</Typography>
              
              <List>
                <ListItem 
                  secondaryAction={
                    <Typography variant="caption" color="textSecondary">
                      10 minutes ago
                    </Typography>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'success.light' }}>
                      <CheckCircle />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Boeing 737 Type Rating: Session 5 completed"
                    secondary="Engine failure after takeoff scenario - Excellent rating"
                  />
                </ListItem>
                
                <Divider variant="inset" component="li" />
                
                <ListItem 
                  secondaryAction={
                    <Typography variant="caption" color="textSecondary">
                      2 hours ago
                    </Typography>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'primary.light' }}>
                      <School />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Created A320 Type Rating Syllabus"
                    secondary="Generated from Airbus documentation with 12 modules"
                  />
                </ListItem>
                
                <Divider variant="inset" component="li" />
                
                <ListItem 
                  secondaryAction={
                    <Typography variant="caption" color="textSecondary">
                      Yesterday, 4:30 PM
                    </Typography>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'info.light' }}>
                      <Description />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Uploaded EASA FCL Training Requirements"
                    secondary="6 documents processed with 94% compliance mapping"
                  />
                </ListItem>
                
                <Divider variant="inset" component="li" />
                
                <ListItem 
                  secondaryAction={
                    <Typography variant="caption" color="textSecondary">
                      Yesterday, 2:15 PM
                    </Typography>
                  }
                >
                  <ListItemAvatar>
                    <Avatar sx={{ bgcolor: 'warning.light' }}>
                      <Assessment />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary="Reviewed B777 Approach Procedure Training Session"
                    secondary="Added 5 annotations and completed student assessment"
                  />
                </ListItem>
              </List>
              
              <Box className="flex justify-center mt-3">
                <Button endIcon={<ChevronRight />}>
                  View All Activities
                </Button>
              </Box>
            </Paper>
          </Grid>
          
          {/* Training Progress and Notifications */}
          <Grid item xs={12} md={4}>
            <Paper elevation={1} className="p-6">
              <Box className="flex justify-between items-center mb-4">
                <Typography variant="h6">My Training Progress</Typography>
                <Button size="small">View Details</Button>
              </Box>
              
              <Box className="mb-6">
                <Box className="flex justify-between mb-1">
                  <Typography variant="body2">B737 Type Rating</Typography>
                  <Typography variant="body2" color="primary">75%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={75} className="mb-3" />
                
                <Box className="flex justify-between mb-1">
                  <Typography variant="body2">IFR Recurrent Training</Typography>
                  <Typography variant="body2" color="primary">40%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={40} className="mb-3" />
                
                <Box className="flex justify-between mb-1">
                  <Typography variant="body2">CRM Certification</Typography>
                  <Typography variant="body2" color="primary">90%</Typography>
                </Box>
                <LinearProgress variant="determinate" value={90} />
              </Box>
              
              <Divider className="my-4" />
              
              <Box className="mb-4">
                <Box className="flex items-center mb-2">
                  <AccessTime color="primary" className="mr-2" fontSize="small" />
                  <Typography variant="subtitle2">Upcoming Sessions</Typography>
                </Box>
                
                <Card variant="outlined" className="mb-3">
                  <CardContent className="p-3">
                    <Box className="flex items-center mb-1">
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.8rem', mr: 1 }}>
                        S5
                      </Avatar>
                      <Typography variant="subtitle2">B737 Type Rating: Session 6</Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" className="mb-1">
                      Approach and Landing Procedures
                    </Typography>
                    <Box className="flex items-center">
                      <Typography variant="caption" className="text-gray-500">
                        Tomorrow, 9:00 AM - 11:30 AM
                      </Typography>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                      <Typography variant="caption" className="text-gray-500">
                        Sim #3
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
                
                <Card variant="outlined">
                  <CardContent className="p-3">
                    <Box className="flex items-center mb-1">
                      <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main', fontSize: '0.8rem', mr: 1 }}>
                        C2
                      </Avatar>
                      <Typography variant="subtitle2">CRM Certification: Module 2</Typography>
                    </Box>
                    <Typography variant="body2" color="textSecondary" className="mb-1">
                      Decision Making & Workload Management
                    </Typography>
                    <Box className="flex items-center">
                      <Typography variant="caption" className="text-gray-500">
                        Friday, 2:00 PM - 4:00 PM
                      </Typography>
                      <Divider orientation="vertical" flexItem sx={{ mx: 1 }} />
                      <Typography variant="caption" className="text-gray-500">
                        Room 8B
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
              
              <Divider className="my-4" />
              
              <Box>
                <Box className="flex items-center mb-3">
                  <NotificationsActive color="error" className="mr-2" fontSize="small" />
                  <Typography variant="subtitle2">Important Notifications</Typography>
                </Box>
                
                <Card variant="outlined" className="bg-red-50 border-red-200 mb-3">
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" className="text-red-700">
                      Annual Medical Certification
                    </Typography>
                    <Typography variant="body2" className="text-red-600">
                      Your medical certificate expires in 14 days. Schedule renewal as soon as possible.
                    </Typography>
                  </CardContent>
                </Card>
                
                <Card variant="outlined" className="bg-amber-50 border-amber-200">
                  <CardContent className="p-3">
                    <Typography variant="subtitle2" className="text-amber-700">
                      New EASA Regulation Updates
                    </Typography>
                    <Typography variant="body2" className="text-amber-600">
                      EASA has released important updates to FCL.725.A. Review changes before next session.
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
            </Paper>
            
            <Paper elevation={1} className="p-6 mt-6">
              <Box className="flex items-center mb-4">
                <DirectionsRun color="primary" className="mr-2" />
                <Typography variant="h6">Daily Challenges</Typography>
              </Box>
              
              <Card variant="outlined" className="mb-3">
                <CardContent className="p-3">
                  <Box className="flex justify-between items-start">
                    <Box>
                      <Typography variant="subtitle2">Perfect Approaches</Typography>
                      <Typography variant="body2" color="textSecondary" className="mb-2">
                        Complete 3 stabilized approaches with excellent rating
                      </Typography>
                      <Box className="flex items-center">
                        <LinearProgress 
                          variant="determinate" 
                          value={66} 
                          sx={{ width: 100, mr: 2 }} 
                        />
                        <Typography variant="caption">2/3 completed</Typography>
                      </Box>
                    </Box>
                    <Avatar sx={{ bgcolor: 'amber.500' }}>
                      <Star />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
              
              <Card variant="outlined">
                <CardContent className="p-3">
                  <Box className="flex justify-between items-start">
                    <Box>
                      <Typography variant="subtitle2">CRM Communication Master</Typography>
                      <Typography variant="body2" color="textSecondary" className="mb-2">
                        Practice closed-loop communication techniques
                      </Typography>
                      <Typography variant="caption" color="primary">
                        +350 XP reward
                      </Typography>
                    </Box>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      <AutoAwesome />
                    </Avatar>
                  </Box>
                </CardContent>
              </Card>
              
              <Button 
                fullWidth 
                color="primary" 
                variant="contained" 
                className="mt-4"
                endIcon={<Visibility />}
              >
                View All Challenges
              </Button>
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
}
