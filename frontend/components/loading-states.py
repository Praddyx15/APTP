// src/frontend/components/loading/LoadingSpinner.tsx
import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'secondary' | 'white';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = 'primary',
  className = ''
}) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  };
  
  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    white: 'text-white'
  };
  
  return (
    <svg
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      data-testid="loading-spinner"
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
  );
};

// src/frontend/components/loading/LoadingOverlay.tsx
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  children: React.ReactNode;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isLoading,
  message = 'Loading...',
  children,
  spinnerSize = 'lg'
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }
  
  return (
    <div className="relative">
      <div className="opacity-50 pointer-events-none">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-100 bg-opacity-50">
        <LoadingSpinner size={spinnerSize} />
        {message && <p className="mt-2 text-gray-700 font-medium">{message}</p>}
      </div>
    </div>
  );
};

// src/frontend/components/loading/LoadingPage.tsx
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner';

interface LoadingPageProps {
  message?: string;
  spinnerSize?: 'sm' | 'md' | 'lg';
}

export const LoadingPage: React.FC<LoadingPageProps> = ({
  message = 'Loading...',
  spinnerSize = 'lg'
}) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-white">
      <LoadingSpinner size={spinnerSize} />
      {message && <p className="mt-4 text-lg text-gray-700 font-medium">{message}</p>}
    </div>
  );
};

// src/frontend/components/loading/SkeletonText.tsx
import React from 'react';

interface SkeletonTextProps {
  lines?: number;
  width?: string;
  className?: string;
}

export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  width = '100%',
  className = ''
}) => {
  return (
    <div className={className}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`h-4 bg-gray-200 rounded animate-pulse mb-2 ${index === lines - 1 && lines > 1 ? 'w-4/5' : ''}`}
          style={{ width: typeof width === 'string' ? width : `${width}%` }}
        />
      ))}
    </div>
  );
};

// src/frontend/components/loading/SkeletonCircle.tsx
import React from 'react';

interface SkeletonCircleProps {
  size?: number;
  className?: string;
}

export const SkeletonCircle: React.FC<SkeletonCircleProps> = ({
  size = 12,
  className = ''
}) => {
  return (
    <div
      className={`rounded-full bg-gray-200 animate-pulse ${className}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
};

// src/frontend/components/loading/SkeletonCard.tsx
import React from 'react';
import { SkeletonText } from './SkeletonText';

interface SkeletonCardProps {
  hasImage?: boolean;
  imageHeight?: number;
  lines?: number;
  className?: string;
}

export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  hasImage = true,
  imageHeight = 200,
  lines = 3,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded shadow p-4 ${className}`}>
      {hasImage && (
        <div 
          className="bg-gray-200 rounded w-full animate-pulse mb-4"
          style={{ height: `${imageHeight}px` }}
        />
      )}
      <SkeletonText lines={lines} />
    </div>
  );
};

// src/frontend/components/loading/SkeletonTable.tsx
import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  columns?: number;
  className?: string;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({
  rows = 5,
  columns = 4,
  className = ''
}) => {
  return (
    <div className={`bg-white overflow-hidden ${className}`}>
      <div className="bg-gray-50 border-b">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <div key={`header-${index}`} className="p-4">
              <div className="h-4 bg-gray-300 rounded animate-pulse w-4/5" />
            </div>
          ))}
        </div>
      </div>
      <div>
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div 
            key={`row-${rowIndex}`}
            className="grid gap-4 border-b"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={`cell-${rowIndex}-${colIndex}`} className="p-4">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-full" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// src/frontend/components/loading/SkeletonDashboard.tsx
import React from 'react';
import { SkeletonCard } from './SkeletonCard';
import { SkeletonTable } from './SkeletonTable';
import { SkeletonText } from './SkeletonText';

export const SkeletonDashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="mb-6">
        <div className="h-8 bg-gray-200 rounded animate-pulse w-60 mb-2" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-96" />
      </div>
      
      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`stat-${index}`} className="bg-white rounded shadow p-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mr-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
                <div className="h-6 bg-gray-200 rounded animate-pulse w-16" />
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Main content area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="bg-white rounded shadow p-4 mb-6">
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-48" />
            </div>
            <SkeletonTable rows={4} columns={4} />
          </div>
        </div>
        
        <div>
          <div className="bg-white rounded shadow p-4">
            <div className="mb-4">
              <div className="h-6 bg-gray-200 rounded animate-pulse w-32" />
            </div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={`activity-${index}`} className="flex items-start">
                  <div className="flex-shrink-0 mr-3">
                    <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse w-full mb-2" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// src/frontend/components/loading/SkeletonProfile.tsx
import React from 'react';
import { SkeletonText } from './SkeletonText';
import { SkeletonCircle } from './SkeletonCircle';

export const SkeletonProfile: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded shadow p-6">
        <div className="flex flex-col md:flex-row md:items-center">
          <div className="flex-shrink-0 mr-6 flex justify-center mb-4 md:mb-0">
            <div className="h-20 w-20 bg-gray-200 rounded-full animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-48 mb-2" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-32 mb-1" />
            <div className="h-4 bg-gray-200 rounded animate-pulse w-40" />
          </div>
          <div className="mt-4 md:mt-0 flex justify-center">
            <div className="h-9 bg-gray-200 rounded animate-pulse w-24" />
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="bg-white rounded shadow p-6">
        <div className="mb-6">
          <div className="h-6 bg-gray-200 rounded animate-pulse w-32 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
            </div>
            <div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
              <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
            </div>
          </div>
        </div>
        
        <div>
          <div className="h-6 bg-gray-200 rounded animate-pulse w-40 mb-4" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={`badge-${index}`} className="h-6 bg-gray-200 rounded-full animate-pulse w-20" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// src/frontend/components/loading/SkeletonDetailView.tsx
import React from 'react';
import { SkeletonText } from './SkeletonText';

interface SkeletonDetailViewProps {
  fields?: number;
  className?: string;
}

export const SkeletonDetailView: React.FC<SkeletonDetailViewProps> = ({
  fields = 6,
  className = ''
}) => {
  return (
    <div className={`bg-white rounded shadow p-6 ${className}`}>
      {/* Header */}
      <div className="mb-6">
        <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3 mb-4" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-2/3 mb-1" />
        <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
      </div>
      
      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Array.from({ length: fields }).map((_, index) => (
          <div key={`field-${index}`}>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-24 mb-2" />
            <div className="h-5 bg-gray-200 rounded animate-pulse w-full" />
          </div>
        ))}
      </div>
      
      {/* Buttons */}
      <div className="mt-8 flex justify-end space-x-3">
        <div className="h-9 bg-gray-200 rounded animate-pulse w-20" />
        <div className="h-9 bg-gray-200 rounded animate-pulse w-20" />
      </div>
    </div>
  );
};

// src/frontend/hooks/useLoading.ts
import { useState, useCallback } from 'react';

export function useLoading(initialState: boolean = false) {
  const [isLoading, setIsLoading] = useState<boolean>(initialState);
  
  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);
  
  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);
  
  const withLoading = useCallback(async <T,>(promise: Promise<T>): Promise<T> => {
    setIsLoading(true);
    try {
      const result = await promise;
      return result;
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  return {
    isLoading,
    startLoading,
    stopLoading,
    withLoading
  };
}
