import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi, householdApi } from '../lib/api';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');

      if (token && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setUser(parsedUser);

          const res = await authApi.me();
          setUser(res.data);
          localStorage.setItem('user', JSON.stringify(res.data));

          if (res.data.household_id) {
            try {
              const hRes = await householdApi.getMy();
              setHousehold(hRes.data);
            } catch (hError) {
              console.error('Failed to fetch household:', hError);
            }
          }
        } catch (error) {
          console.error('Auth init error:', error);
          if (error.response?.status === 401 || error.message?.includes('Server not configured')) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
          } else {
            const savedUserData = localStorage.getItem('user');
            if (savedUserData) {
              try {
                setUser(JSON.parse(savedUserData));
              } catch (e) {
                console.error('Failed to parse saved user:', e);
              }
            }
          }
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    
    if (res.data.user.household_id) {
      const hRes = await householdApi.getMy();
      setHousehold(hRes.data);
    }
    
    return res.data;
  };

  const register = async (name, email, password) => {
    const res = await authApi.register({ name, email, password });
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('user', JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setHousehold(null);
  };

  const refreshHousehold = async () => {
    if (user?.household_id) {
      const hRes = await householdApi.getMy();
      setHousehold(hRes.data);
    } else {
      setHousehold(null);
    }
  };

  const updateUser = (newUser) => {
    setUser(newUser);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider value={{
      user,
      household,
      loading,
      login,
      register,
      logout,
      refreshHousehold,
      updateUser,
      isAuthenticated: !!user,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
