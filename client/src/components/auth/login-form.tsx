/**
 * Login form component
 */

import { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

export function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const { loginMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginMutation.mutateAsync({ username, password });
      setLocation('/');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg shadow-md border">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Login</h3>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access your account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Password
            </label>
            <a href="#" className="text-xs text-primary hover:underline">
              Forgot password?
            </a>
          </div>
          <input
            id="password"
            type="password"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={loginMutation.isPending}
        >
          {loginMutation.isPending ? (
            <span className="flex items-center justify-center">
              <svg
                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign in'
          )}
        </button>
      </form>
    </div>
  );
}
