/**
 * Authentication Context — Supabase
 * Ported from the Kapoori Ka (working) auth flow:
 *  - Google OAuth via skipBrowserRedirect + WebBrowser.openAuthSessionAsync + manual setSession
 *  - Anonymous guest sign-in with surfaced errors
 *  - Email sign-up that distinguishes "confirm your email" from "signed in"
 *  - Profile row upsert on first sign-in (safety net for the DB trigger)
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as WebBrowser from 'expo-web-browser';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';
import type { UserRole } from '../types';

// Must be called before openAuthSessionAsync (recommended by expo-web-browser)
WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'com.t1dsaathi.app://auth/callback';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: UserRole | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signUp: (email: string, password: string) => Promise<{ data: any; error: any }>;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

/** Parse access_token / refresh_token from a redirect URL fragment or query. */
function parseTokensFromUrl(url: string): { access_token: string | null; refresh_token: string | null } {
  const hashIdx = url.indexOf('#');
  let params: URLSearchParams;
  if (hashIdx !== -1) {
    params = new URLSearchParams(url.substring(hashIdx + 1));
  } else {
    params = new URLSearchParams(url.split('?')[1] || '');
  }
  return {
    access_token: params.get('access_token'),
    refresh_token: params.get('refresh_token'),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRole = useCallback(async (userId: string): Promise<UserRole> => {
    // maybeSingle → no error when the row doesn't exist yet
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) {
      console.warn('[AuthContext] profile read error:', error.message);
    }
    const r = (data?.role as UserRole) || 'parent';
    setRole(r);
    return r;
  }, []);

  /** Upsert a profiles row so screens that read profiles never 404. */
  const ensureProfile = useCallback(async (u: User) => {
    const { error } = await supabase.from('profiles').upsert(
      {
        user_id: u.id,
        full_name: u.user_metadata?.full_name ?? null,
        avatar_url: u.user_metadata?.avatar_url ?? null,
        role: (u.user_metadata?.role as UserRole) || 'parent',
      },
      { onConflict: 'user_id' },
    );
    if (error) console.warn('[AuthContext] profile upsert error:', error.message);
  }, []);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchRole(s.user.id);
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchRole]);

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error && data.user) {
      await ensureProfile(data.user);
      await fetchRole(data.user.id);
    }
    return { data, error };
  };

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: email.split('@')[0] } },
    });
    if (!error && data.user && data.session) {
      // Email confirmation disabled → signed in immediately
      await ensureProfile(data.user);
      await fetchRole(data.user.id);
    }
    return { data, error };
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: REDIRECT_URL,
        skipBrowserRedirect: true,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });

    if (error) throw error;
    if (!data?.url) throw new Error('No OAuth URL returned from Supabase');

    const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL, {
      showInRecents: true,
    });

    if (result.type === 'success' && result.url) {
      const { access_token, refresh_token } = parseTokensFromUrl(result.url);
      if (access_token && refresh_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
      } else {
        // Fallback: session may already be persisted
        await supabase.auth.getSession();
      }
    }
    // result.type 'cancel' / 'dismiss' → leave the user on the login screen
  };

  const signInAsGuest = async () => {
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    if (data.user) {
      await ensureProfile(data.user);
      await fetchRole(data.user.id);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, role, loading, signIn, signUp, signInWithGoogle, signInAsGuest, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
