import create from 'zustand';
import { persist } from 'zustand/middleware';
import { api } from '../services/api';

interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'instructor' | 'trainee';
  profileImageUrl?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
      loading: false,
      error: null,

      login: async (username: string, password: string) => {
        set({ loading: true, error: null });
        try {
          const response = await api.post('/auth/login', { username, password });
          const { token, refreshToken, user } = response.data;

          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;

          set({
            isAuthenticated: true,
            token,
            refreshToken,
            user,
            loading: false,
          });
        } catch (error: any) {
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            refreshToken: null,
            loading: false,
            error: error.response?.data?.message || 'Login failed',
          });
        }
      },

      logout: () => {
        // Remove token from axios default headers
        delete api.defaults.headers.common['Authorization'];

        set({
          isAuthenticated: false,
          user: null,
          token: null,
          refreshToken: null,
          error: null,
        });
      },

      refreshAuth: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          return false;
        }

        try {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { token: newToken, refreshToken: newRefreshToken } = response.data;

          // Set token in axios default headers
          api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;

          set({
            token: newToken,
            refreshToken: newRefreshToken,
          });
          return true;
        } catch (error) {
          // If refresh fails, log the user out
          get().logout();
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'auth-storage',
      getStorage: () => localStorage,
    }
  )
);