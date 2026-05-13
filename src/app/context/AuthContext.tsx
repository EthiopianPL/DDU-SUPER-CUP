import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { supabase } from "../../lib/supabase";

interface User {
  id: string;
  name: string;
  email: string;
  favoriteTeam?: string;
  avatar_url?: string;
  role?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string, favoriteTeam?: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithGitHub: () => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const getRedirectUrl = () => {
  if (import.meta.env.PROD) {
    return 'https://ethiopian-premier-league-website.vercel.app/auth/callback';
  }
  return 'http://localhost:5173/auth/callback';
};

// Helper to fetch user profile
const fetchUserProfile = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('role, favorite_team, full_name, avatar_url')
    .eq('id', userId)
    .maybeSingle();
  return data;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function handleSession(session: any, event: string) {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session?.user) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        let profile = await fetchUserProfile(session.user.id);
        
        if (!profile && event === 'SIGNED_IN') {
          // Create profile if doesn't exist (first login)
          await supabase.from('profiles').insert([{
            id: session.user.id,
            full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            role: 'user'
          }]);
          profile = { role: 'user' };
        }
        
        if (mounted) {
          setUser({
            id: session.user.id,
            name: profile?.full_name || session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            email: session.user.email || '',
            avatar_url: profile?.avatar_url || session.user.user_metadata?.avatar_url,
            favoriteTeam: profile?.favorite_team,
            role: profile?.role || 'user',
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        if (mounted) {
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || '',
            email: session.user.email || '',
            avatar_url: session.user.user_metadata?.avatar_url,
            role: 'user',
          });
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    // 1. Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSession(session, 'INITIAL_SESSION');
    });

    // 2. Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      handleSession(session, event);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signup = async (name: string, email: string, password: string, favoriteTeam?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name, favorite_team: favoriteTeam },
        emailRedirectTo: getRedirectUrl(),
      }
    });
    if (error) throw new Error(error.message);
  };

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: getRedirectUrl() },
    });
    if (error) throw new Error(error.message);
  };

  const loginWithGitHub = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: { redirectTo: getRedirectUrl() },
    });
    if (error) throw new Error(error.message);
  };

  const logout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, login, signup, loginWithGoogle, loginWithGitHub, logout, 
      isAuthenticated: !!user, loading 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}