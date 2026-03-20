'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getUser, getProfile, onAuthStateChange } from '@/lib/auth';

const AuthContext = createContext({
  user: null,
  profile: null,
  loading: true,
  refreshProfile: () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchProfile = async () => {
    const { profile: p } = await getProfile();
    setProfile(p);
    return p;
  };

  useEffect(() => {
    // Initial check
    const init = async () => {
      const { user: u } = await getUser();
      setUser(u);
      if (u) {
        await fetchProfile();
      }
      setLoading(false);
    };
    init();

    // Listen for auth changes
    const subscription = onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setUser(session.user);
        await fetchProfile();
        setLoading(false);
        if (pathname === '/login') {
          router.push('/');
          router.refresh();
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        router.push('/login');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Redirect to login if not authenticated (after loading completes)
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [loading, user, pathname, router]);

  // Don't render children (except login page) while loading or unauthenticated
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
        <p>로딩 중...</p>
      </div>
    );
  }

  // Allow login page to render without auth
  if (pathname === '/login') {
    return (
      <AuthContext.Provider value={{ user, profile, loading, refreshProfile: fetchProfile }}>
        {children}
      </AuthContext.Provider>
    );
  }

  // Block rendering if not authenticated
  if (!user) {
    return null;
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, refreshProfile: fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
