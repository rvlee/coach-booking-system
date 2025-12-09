import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();
const DEFAULT_EMAIL = 'roylee0628@gmail.com';
const DEFAULT_PASSWORD = 'kanjani8';

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setLoading(false);
      return;
    }

    // Auto-login with default credentials if none stored
    (async () => {
      try {
        const res = await axios.post('/api/auth/login', {
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASSWORD
        });
        const { coach, token } = res.data;
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(coach));
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(coach);
      } catch (err) {
        // Ignore auto-login errors; user can log in manually
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const login = async (email, password) => {
    try {
      const response = await axios.post('/api/auth/login', { email, password });
      const { coach, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(coach));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(coach);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Login failed'
      };
    }
  };

  const register = async (email, password, name) => {
    try {
      const response = await axios.post('/api/auth/register', {
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
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || 'Registration failed'
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    login,
    register,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

