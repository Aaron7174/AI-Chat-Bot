import { createContext, useContext, useMemo, useState } from 'react';
import { hasPermission as userHasPermission, hasRole as userHasRole } from '../utils/permissions';

const AuthContext = createContext(null);

const readSession = () => {
  try {
    return JSON.parse(localStorage.getItem('companyai-session')) || null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession);
  const user = session?.user || null;

  const value = useMemo(() => ({
    user,
    token: session?.token || null,
    isAuthenticated: Boolean(session?.token && user),
    login: (nextSession) => {
      localStorage.setItem('companyai-session', JSON.stringify(nextSession));
      setSession(nextSession);
    },
    logout: () => {
      localStorage.removeItem('companyai-session');
      setSession(null);
    },
    hasPermission: (permission) => userHasPermission(user, permission),
    hasRole: (...roles) => userHasRole(user, ...roles),
  }), [session, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
