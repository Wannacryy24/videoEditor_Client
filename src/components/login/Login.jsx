import React, { useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import { useAuth } from '../../context/AuthContext';
import './Login.css'

export default function Login() {
  const { user, setUser, } = useAuth();
  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });

    if (error) console.error('Login error:', error.message);
    else console.log('Redirecting to Google...');
  };

  // This runs after redirect from Google
  useEffect(() => {
    const getSession = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.error(error);
      if (session) console.log('✅ Logged in session:', session.user.user_metadata
      );
    };

    getSession();
  }, []);

  const handleLogOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error("Logout error:", error.message);
    else console.log("User logged out");
  };

  return (
    <div className='login-div'>
      {
        user ? (
          <>
            <img src={user.user_metadata.avatar_url} alt="" />
            <button
              onClick={handleLogOut}
            >Sign Out</button>
          </>
        )
          :
          <button onClick={handleGoogleLogin}>
            Sign in with Google
          </button>
      }

    </div>
  );
}
