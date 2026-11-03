import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Organization } from '../types';
import { api, tokenStorage } from '../lib/api';

interface AuthContextType {
  user: User | null;
  organization: Organization | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateOrganizationState: (org: Organization) => void;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [token, setToken] = useState<string | null>(tokenStorage.get());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshSession = async () => {
    const savedToken = tokenStorage.get();
    if (!savedToken) {
      setUser(null);
      setOrganization(null);
      setIsLoading(false);
      return;
    }

    try {
      const data = await api.getMe();
      if (data.success) {
        setUser(data.user);
        setOrganization(data.organization);
      } else {
        tokenStorage.remove();
        setUser(null);
        setOrganization(null);
      }
    } catch (err) {
      console.warn('Session verification failed, logging out:', err);
      tokenStorage.remove();
      setUser(null);
      setOrganization(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshSession();
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    if (res.success) {
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setOrganization(res.organization);
    }
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    password: string;
    confirmPassword: string;
    organizationName: string;
  }) => {
    const res = await api.register(payload);
    if (res.success) {
      tokenStorage.set(res.token);
      setToken(res.token);
      setUser(res.user);
      setOrganization(res.organization);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      tokenStorage.remove();
      setToken(null);
      setUser(null);
      setOrganization(null);
    }
  };

  const updateOrganizationState = (org: Organization) => {
    setOrganization(org);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        token,
        isLoading,
        login,
        register,
        logout,
        updateOrganizationState,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
