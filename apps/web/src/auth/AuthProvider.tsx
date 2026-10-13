import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { apiGet, apiPost, refreshAccessToken, setOnUnauthorized } from '../api/http';
import type { AuthUser, LoginResponse, ProfileResponse } from '../api/types';
import { clearSession, getAccessToken, getStoredUser, setAccessToken, setStoredUser } from './session';

type AuthStatus = 'bootstrapping' | 'anonymous' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function toAuthUser(profile: ProfileResponse['user'], stored: AuthUser | null): AuthUser {
  return {
    id: profile.sub,
    email: profile.email,
    role: profile.role,
    name: stored?.id === profile.sub && stored.name ? stored.name : profile.email,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('bootstrapping');
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      setStatus('anonymous');
    });

    return () => setOnUnauthorized(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function restoreSession() {
      try {
        if (!getAccessToken()) {
          await refreshAccessToken();
        }
        if (!getAccessToken()) {
          if (!cancelled) {
            setUser(null);
            setStatus('anonymous');
          }
          return;
        }

        const profile = await apiGet<ProfileResponse>('/auth/profile');
        const nextUser = toAuthUser(profile.user, getStoredUser());
        setStoredUser(nextUser);
        if (!cancelled) {
          setUser(nextUser);
          setStatus('authenticated');
        }
      } catch {
        clearSession();
        if (!cancelled) {
          setUser(null);
          setStatus('anonymous');
        }
      }
    }

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async login(email, password) {
        const result = await apiPost<LoginResponse>('/auth/login', { email, password });
        setAccessToken(result.accessToken);
        setStoredUser(result.user);
        setUser(result.user);
        setStatus('authenticated');
      },
      async register(name, email, password) {
        await apiPost('/auth/register', { name, email, password });
        const result = await apiPost<LoginResponse>('/auth/login', { email, password });
        setAccessToken(result.accessToken);
        setStoredUser(result.user);
        setUser(result.user);
        setStatus('authenticated');
      },
      async logout() {
        try {
          await apiPost('/auth/logout');
        } catch {
          // Local session is cleared even if the API call fails.
        }
        clearSession();
        setUser(null);
        setStatus('anonymous');
      },
    }),
    [status, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
