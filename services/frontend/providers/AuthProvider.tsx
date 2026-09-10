'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User } from '@shared/types';
import { getRequest, postRequest } from '@/lib/api';
import { stSignOut } from '@/lib/api/supertokens-auth';
import { toast } from 'sonner';

// Public routes where we don't need to check auth.
// Adapted from the old hash-aware route-utils to Next App Router pathnames.
const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

const isPublicRoute = (pathname: string, routes: string[]) => routes.includes(pathname);

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isInitialized: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setAuthenticated: (value: boolean) => void;
  fetchUserInfo: () => Promise<void>;
  forceAuthCheck: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  // Duplicate declaration removed
  const [error, setError] = useState<Error | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Fetch user information from API
  const fetchUserInfo = async () => {
    try {
      // New backend: auth-service profile route returns { status, data: user }.
      // Many components fetch /auth/me on first paint; if the auth-service rate
      // limiter (429) trips, retry briefly rather than dropping the session.
      let response: any;
      for (let attempt = 0; ; attempt++) {
        try {
          response = await getRequest<any>('/api/v1/auth/me');
          break;
        } catch (e: any) {
          if (e.response?.status === 429 && attempt < 3) {
            await new Promise((r) => setTimeout(r, 400 * (attempt + 1)));
            continue;
          }
          throw e;
        }
      }
      const u = response.data ?? response.user;
      // Normalize the user object to ensure _id exists (backend returns id, not _id).
      const normalizedUser = {
        ...u,
        _id: u._id || u.id,
      };
      setUser(normalizedUser);
      setIsAuthenticated(true);
      setError(null);
    } catch (err: any) {
      // If token is invalid or expired, clear auth state
      if (err.response?.status === 401 || err.response?.status === 403) {
        setUser(null);
        setIsAuthenticated(false);
        // No need to remove token - HTTP-only cookies are handled by server
      } else {
        setError(err);
      }
    }
  };

  // Check for existing authentication on app startup
  useEffect(() => {
    const checkAuthStatus = async () => {
      setIsLoading(true);
      setIsInitialized(false);

      // Define public routes where we don't need to check auth
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

      // Use pathname-aware path detection
      if (isPublicRoute(pathname, publicRoutes)) {
        setIsLoading(false);
        setIsInitialized(true);
        return;
      }

      // Try to fetch user info - server will validate HTTP-only cookie
      try {
        await fetchUserInfo();
      } catch (err) {
        // If no valid cookie, user is not authenticated
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        // Ensure loading and initialization states are always updated
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    checkAuthStatus();

    // Listen for storage changes (when token is added/removed)
    const handleStorageChange = () => {
      // Define public routes where we don't need to check auth
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

      // Skip auth check on public routes using pathname-aware detection
      if (!isPublicRoute(pathname, publicRoutes)) {
        checkAuthStatus();
      }
    };

    // Handle force logout from 401 responses
    const handleForceLogout = () => {
      // No need to remove token - HTTP-only cookies are handled by server
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
      toast.error('Your session has expired. Redirecting to home.', { duration: 10000 });

      // Avoid redirecting away from public routes (like '/')
      const publicRoutes = ['/', '/sign-in', '/sign-up', '/verify-otp', '/forgot-password', '/reset-password'];

      // Navigate to login page client-side to avoid server 404 on deep links
      if (!isPublicRoute(pathname, publicRoutes)) {
        router.replace('/');
      }
    };

    // Show feedback on network-level errors
    const handleNetworkError = (e: any) => {
      const message = e?.detail?.message ?? 'A network error occurred';
      toast.error(`Network error: ${message}`, { duration: 10000 });
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('authStateChange', handleStorageChange);
    window.addEventListener('force-logout', handleForceLogout);
    window.addEventListener('network-error', handleNetworkError as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authStateChange', handleStorageChange);
      window.removeEventListener('force-logout', handleForceLogout);
      window.removeEventListener('network-error', handleNetworkError as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, pathname]);

  const setAuthenticated = (value: boolean) => {
    setIsAuthenticated(value);
    if (!value) {
      // No need to remove token - HTTP-only cookies are handled by server
      setUser(null);
    }
    // Dispatch custom event to trigger re-check
    window.dispatchEvent(new Event('authStateChange'));
  };

  const login = async (email: string, password: string) => {
    // This is handled by the sign-in form using mutations
    // Keeping this for backward compatibility
  };

  const logout = async () => {
    try {
      // Call SuperTokens signout to revoke the session + clear cookies.
      await stSignOut();
    } catch (err) {
      // Even if logout fails, clear local state
      console.warn('Logout request failed:', err);
    }

    // Clear local storage (except token which is now in HTTP-only cookie)
    localStorage.removeItem('currentWorkspaceId');
    setUser(null);
    setIsAuthenticated(false);
    setError(null);
    window.dispatchEvent(new Event('authStateChange'));
    // Navigate to login after logout
    router.replace('/sign-in');
  };

  // Force auth check regardless of route (used after login/logout)
  const forceAuthCheck = async () => {
    try {
      await fetchUserInfo();
    } catch (err) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const values = {
    user,
    isAuthenticated,
    isLoading,
    isInitialized,
    error,
    login,
    logout,
    setAuthenticated,
    fetchUserInfo,
    forceAuthCheck,
  };

  // Show loading state until context is properly initialized
  if (!isInitialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Initializing authentication...</p>
        </div>
      </div>
    );
  }

  return <AuthContext.Provider value={values}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Backwards-compatible alias for existing new-app callers.
export const useAuthContext = useAuth;
