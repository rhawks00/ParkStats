import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import type { User } from '@supabase/supabase-js';

const supabaseConfigured = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({ provider: 'google' });

  const signOut = () => supabase.auth.signOut();

  return { user, loading, signInWithGoogle, signOut, supabaseConfigured };
}
