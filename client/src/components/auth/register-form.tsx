/**
 * Registration form component
 */

import { useState } from 'react';
import { useAuth } from '../../hooks/use-auth';
import { useLocation } from 'wouter';

export function RegisterForm() {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    email: '',
    organizationType: 'ATO',
    organizationName: '',
    role: 'user',
  });
  
  const [passwordError, setPasswordError] = useState('');
  const { registerMutation } = useAuth();
  const [, setLocation] = useLocation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear password error when user types in password fields
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    // Validate password length
    if (formData.password.length < 8) {
      setPasswordError('Password must be at least 8 characters long');
      return;
    }
    
    try {
      const { confirmPassword, ...userData } = formData;
      await registerMutation.mutateAsync(userData);
      setLocation('/');
    } catch (error) {
      // Error handling is done in the mutation
    }
  };

  return (
    <div className="space-y-6 p-6 bg-card rounded-lg shadow-md border">
      <div className="space-y-2 text-center">
        <h3 className="text-2xl font-bold">Create an Account</h3>
        <p className="text-sm text-muted-foreground">
          Enter your information to create an account
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="firstName"
              className="text-sm font-medium leading-none"
            >
              First Name
            </label>
            <input
              id="firstName"
              name="firstName"
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.firstName}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label
              htmlFor="lastName"
              className="text-sm font-medium leading-none"
            >
              Last Name
            </label>
            <input
              id="lastName"
              name="lastName"
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.lastName}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label
            htmlFor="email"
            className="text-sm font-medium leading-none"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="space-y-2">
          <label
            htmlFor="username"
            className="text-sm font-medium leading-none"
          >
            Username
          </label>
          <input
            id="username"
            name="username"
            type="text"
            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            value={formData.username}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="text-sm font-medium leading-none"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          
          <div className="space-y-2">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium leading-none"
            >
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>
        </div>
        
        {passwordError && (
          <p className="text-sm text-red-500">{passwordError}</p>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label
              htmlFor="organizationType"
              className="text-sm font-medium leading-none"
            >
              Organization Type
            </label>
            <select
              id="organizationType"
              name="organizationType"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.organizationType}
              onChange={handleChange}
            >
              <option value="ATO">ATO</option>
              <option value="Airline">Airline</option>
              <option value="Individual">Individual</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label
              htmlFor="organizationName"
              className="text-sm font-medium leading-none"
            >
              Organization Name
            </label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              value={formData.organizationName}
              onChange={handleChange}
            />
          </div>
        </div>
        
        <button
          type="submit"
          className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          disabled={registerMutation.isPending}
        >
          {registerMutation.isPending ? (
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
              Creating account...
            </span>
          ) : (
            'Create Account'
          )}
        </button>
      </form>
    </div>
  );
}
