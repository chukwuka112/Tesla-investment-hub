import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGetMe, getGetMeQueryKey, UserProfile } from '@workspace/api-client-react';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem('tesla_token'));

  const setToken = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('tesla_token', newToken);
    } else {
      localStorage.removeItem('tesla_token');
    }
    setTokenState(newToken);
  };

  const { data: user, isLoading: isUserLoading, refetch } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: getGetMeQueryKey(),
    }
  });

  useEffect(() => {
    if (token) {
      refetch();
    }
  }, [token, refetch]);

  const logout = () => {
    setToken(null);
  };

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isLoading = isUserLoading;

  return (
    <AuthContext.Provider value={{ user: user || null, token, setToken, logout, isLoading, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
