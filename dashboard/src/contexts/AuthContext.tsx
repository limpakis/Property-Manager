import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface User {
  user_id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'manager' | 'viewer';
}

interface Account {
  account_id: string;
  company_name: string;
  subscription_tier: 'starter' | 'professional' | 'enterprise';
  subscription_status: 'trial' | 'active' | 'past_due' | 'canceled';
  trial_ends_at: string | null;
  property_limit: number;
  current_property_count: number;
  white_label_enabled: boolean;
  logo_url: string | null;
}

interface AuthContextType {
  user: User | null;
  account: Account | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; full_name: string; company_name: string }) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('auth_token'));
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    setAccount(null);
    setToken(null);
    localStorage.removeItem('auth_token');
  }, []);

  const refreshProfile = useCallback(async () => {
    const storedToken = localStorage.getItem('auth_token');
    if (!storedToken) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      if (!response.ok) {
        logout();
        return;
      }

      const data = await response.json();
      setUser(data.user);
      setAccount(data.account);
      setToken(storedToken);
    } catch {
      logout();
    } finally {
      setIsLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    refreshProfile();
  }, [refreshProfile]);

  const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccount(data.account);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
  };

  const register = async (regData: { email: string; password: string; full_name: string; company_name: string }) => {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(regData),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccount(data.account);
    setToken(data.token);
    localStorage.setItem('auth_token', data.token);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        account,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
