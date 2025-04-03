/**
 * React Query configuration and API utilities
 */

import { QueryClient } from '@tanstack/react-query';

// Create a client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
    },
  },
});

// API request helper
export async function apiRequest(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  url: string,
  data?: any
) {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(
      errorData.message || errorData.error || 'API request failed'
    );
    throw error;
  }

  return response;
}

// Helper for query functions
export function getQueryFn(options?: { on401?: 'throw' | 'returnNull' }) {
  return async ({ queryKey }: { queryKey: string[] }) => {
    try {
      const response = await apiRequest('GET', queryKey[0]);
      
      return await response.json();
    } catch (error) {
      if (options?.on401 === 'returnNull') {
        return null;
      }
      throw error;
    }
  };
}
