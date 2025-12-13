import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Coach, AuthContextType } from '../types';

const AuthContext = createContext<AuthContextType | undefined>(undefined);
// Removed DEFAULT_EMAIL and DEFAULT_PASSWORD for production
// Auto-login removed - users must manually authenticate

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<Coach | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData) as Coach);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
    setLoading(false);
    // Removed auto-login for production - users must log in manually
  }, []);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post<{ coach: Coach; token: string }>('/api/auth/login', { email, password });
      const { coach, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(coach));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(coach);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await axios.post<{ coach: Coach; token: string }>('/api/auth/register', {
        email,
        password,
        name
      });
      const { coach, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(coach));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(coach);
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value: AuthContextType = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

