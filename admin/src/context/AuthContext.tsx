import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, AdminUser, toast } from '../api/client';

interface AuthContextType {
  user: AdminUser | null;
  loading: boolean;
  setupRequired: boolean;
  installed: boolean;
  checkAuth: () => Promise<void>;
  login: (username: string, password: string) => Promise<void>;
  setupFirstAdmin: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [installed, setInstalled] = useState<boolean>(false);

  const checkAuth = async () => {
    try {
      setLoading(true);
      const status = await api.getSetupStatus();
      setInstalled(status.installed);
      
      if (status.setupRequired) {
        setSetupRequired(true);
        setUser(null);
        setLoading(false);
        return;
      }
      setSetupRequired(false);

      // Check current session
      const meRes = await api.getMe();
      setUser(meRes.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();

    // Subscribe to centralized API interceptor 401 Unauthorized events
    const unsubscribeUnauthorized = api.onUnauthorized(() => {
      setUser(null);
    });

    return () => {
      unsubscribeUnauthorized();
    };
  }, []);

  const login = async (username: string, password: string) => {
    const res = await api.login({ username, password });
    setUser(res.user);
    setSetupRequired(false);
  };

  const setupFirstAdmin = async (username: string, password: string) => {
    const res = await api.setupFirstAdmin({ username, password });
    setUser(res.user);
    setSetupRequired(false);
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err: any) {
      console.warn('Logout endpoint warning:', err);
    } finally {
      setUser(null);
      toast.info('You have been logged out successfully.', 'Session Closed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        setupRequired,
        installed,
        checkAuth,
        login,
        setupFirstAdmin,
        logout,
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
