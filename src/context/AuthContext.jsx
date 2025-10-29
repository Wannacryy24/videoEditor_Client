import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userSession, setUserSession] = useState(null);
  useEffect(() => {
    // Get current session on mount
    const getSession = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  setUser(session?.user ?? null);
  setLoading(false);

  if (session?.user) {
    setUserSession(session)
  }
};

    getSession();

    // Listen to login/logout
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const isUserLogged = !!user;

  return (
    <AuthContext.Provider value={{ user, isUserLogged, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the context
export const useAuth = () => useContext(AuthContext);