/**
 * Main application layout with navigation
 */

import React, { ReactNode, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { 
  LayoutDashboard, 
  FileText, 
  Upload, 
  BrainCircuit,
  Calendar,
  Plane, 
  LogOut, 
  Menu, 
  X, 
  User 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '../ui/dropdown-menu';

interface MainLayoutProps {
  children: ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Navigation items
  const navItems = [
    { 
      name: 'Dashboard', 
      path: '/', 
      icon: <LayoutDashboard className="h-5 w-5" /> 
    },
    { 
      name: 'Documents', 
      path: '/documents', 
      icon: <FileText className="h-5 w-5" /> 
    },
    { 
      name: 'Upload Document', 
      path: '/documents/upload', 
      icon: <Upload className="h-5 w-5" /> 
    },
    { 
      name: 'Knowledge Graphs', 
      path: '/knowledge-graphs', 
      icon: <BrainCircuit className="h-5 w-5" /> 
    },
    { 
      name: 'Training Sessions', 
      path: '/sessions', 
      icon: <Calendar className="h-5 w-5" /> 
    },
    { 
      name: 'Flight Training', 
      path: '/flight-training', 
      icon: <Plane className="h-5 w-5" /> 
    }
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="bg-primary text-primary-foreground shadow-md">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <Plane className="h-8 w-8" />
            <span className="text-xl font-bold">Pilot Training Platform</span>
          </Link>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>

          {/* Desktop user menu */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar>
                      <AvatarImage src={user.profilePicture || ''} alt={user.username} />
                      <AvatarFallback>{user.firstName?.[0]}{user.lastName?.[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuLabel>
                    {user.firstName} {user.lastName}
                  </DropdownMenuLabel>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">
                    {user.role}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      {isMobileMenuOpen && (
        <div className="md:hidden bg-background border-b">
          <nav className="container mx-auto px-4 py-2">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    href={item.path} 
                    className={`flex items-center p-2 rounded-md ${
                      location === item.path
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                </li>
              ))}
              <li>
                <button 
                  className="flex items-center p-2 w-full text-left hover:bg-muted rounded-md"
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5" />
                  <span className="ml-3">Logout</span>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 border-r bg-muted/30">
          <nav className="w-full py-6 px-4">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.path}>
                  <Link 
                    href={item.path}
                    className={`flex items-center p-2 rounded-md ${
                      location === item.path
                        ? 'bg-primary/10 text-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {item.icon}
                    <span className="ml-3">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}