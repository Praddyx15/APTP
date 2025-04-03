/**
 * Authentication page with login and registration forms
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/use-auth';
import { useLocation } from 'wouter';
import { LoginForm } from '../components/auth/login-form';
import { RegisterForm } from '../components/auth/register-form';

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If already authenticated, redirect to home
  useEffect(() => {
    if (user && !isLoading) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);
  
  if (user && !isLoading) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left side - Authentication forms */}
      <div className="flex-1 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md mx-auto">
          <div className="flex items-center justify-center mb-8">
            <h1 className="text-3xl font-bold">Aviation Training Platform</h1>
          </div>

          <div className="flex mb-6">
            <button
              className={`flex-1 py-2 font-medium text-center border-b-2 ${
                activeTab === 'login'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }`}
              onClick={() => setActiveTab('login')}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 font-medium text-center border-b-2 ${
                activeTab === 'register'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted'
              }`}
              onClick={() => setActiveTab('register')}
            >
              Register
            </button>
          </div>

          {activeTab === 'login' ? <LoginForm /> : <RegisterForm />}
        </div>
      </div>

      {/* Right side - Hero/Information */}
      <div className="hidden lg:flex flex-1 flex-col justify-center items-center p-8 bg-gradient-to-br from-primary/20 to-primary/5">
        <div className="max-w-lg text-center">
          <h2 className="text-4xl font-bold mb-6">Advanced Pilot Training Platform</h2>
          <p className="text-xl mb-8">
            Transform your aviation training with our cutting-edge platform designed for ATOs,
            airlines, and individual pilots.
          </p>
          <div className="grid grid-cols-2 gap-6 text-left">
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Document Management</h3>
              <p className="text-muted-foreground">
                Organize and analyze training materials with our intelligent document system.
              </p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Knowledge Visualization</h3>
              <p className="text-muted-foreground">
                Explore connections between aviation concepts with interactive knowledge graphs.
              </p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Training Management</h3>
              <p className="text-muted-foreground">
                Plan, track, and optimize training programs with automated tools.
              </p>
            </div>
            <div className="flex flex-col">
              <h3 className="text-lg font-semibold mb-2">Compliance & Reporting</h3>
              <p className="text-muted-foreground">
                Ensure regulatory compliance with built-in validation and reporting.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
