/**
 * AuthContext — JWT-based authentication context for YatraDrishti.
 *
 * Stores token in localStorage.  All API calls include the Bearer token.
 * useAuth() exposes: user, token, loading, login(), register(), logout()
 */
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const BASE_URL: string = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000';

export interface AuthUser {
  id:    number;
  name:  string;
  email: string;
  role:  string;
}

interface AuthContextValue {
  user:     AuthUser | null;
  token:    string | null;
  loading:  boolean;
  login:    (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout:   () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'yd_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token,   setToken]   = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user,    setUser]    = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount / token change: verify token and fetch current user
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${BASE_URL}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(5000),
    })
      .then(r => r.ok ? r.json() as Promise<{ data: AuthUser }> : Promise.reject())
      .then(json => { setUser(json.data); })
      .catch(() => {
        // Token invalid / expired
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function login(email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const json = await res.json() as { data?: { token: string; user: AuthUser }; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Login failed');
    localStorage.setItem(TOKEN_KEY, json.data!.token);
    setToken(json.data!.token);
    setUser(json.data!.user);
  }

  async function register(name: string, email: string, password: string) {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const json = await res.json() as { data?: { token: string; user: AuthUser }; error?: string };
    if (!res.ok) throw new Error(json.error ?? 'Registration failed');
    localStorage.setItem(TOKEN_KEY, json.data!.token);
    setToken(json.data!.token);
    setUser(json.data!.user);
  }

  function logout() {
    fetch(`${BASE_URL}/api/auth/logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {/* fire and forget */});
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
