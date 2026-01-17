import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

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
  const [profile, setProfile] = useState(null);
  const [household, setHousehold] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        await loadUserData(session.user);
      }

      setLoading(false);
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setHousehold(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserData = async (authUser) => {
    try {
      setUser(authUser);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (profileData) {
        setProfile(profileData);

        if (profileData.household_id) {
          const { data: householdData } = await supabase
            .from('households')
            .select('*')
            .eq('id', profileData.household_id)
            .maybeSingle();

          setHousehold(householdData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const login = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    await loadUserData(data.user);
    return data;
  };

  const register = async (name, email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          name,
          email,
        });

      if (profileError) throw profileError;

      await loadUserData(data.user);
    }

    return data;
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setHousehold(null);
  };

  const refreshHousehold = async () => {
    if (profile?.household_id) {
      const { data } = await supabase
        .from('households')
        .select('*')
        .eq('id', profile.household_id)
        .maybeSingle();

      setHousehold(data);
    } else {
      setHousehold(null);
    }
  };

  const updateUser = async (updates) => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) throw error;

    setProfile({ ...profile, ...updates });
  };

  return (
    <AuthContext.Provider value={{
      user: profile || (user ? { id: user.id, email: user.email, name: profile?.name } : null),
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
