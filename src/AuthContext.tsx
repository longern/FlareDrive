import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  credentials: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [credentials, setCredentials] = useState<string | null>(null);

  useEffect(() => {
    // Check for stored credentials on app load
    const storedCredentials = localStorage.getItem('flaredrive_auth');
    if (storedCredentials) {
      setCredentials(storedCredentials);
      setIsAuthenticated(true);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // Create Basic Auth credentials
      const basicAuth = btoa(`${username}:${password}`);
      
      // Test the credentials by making a PROPFIND request
      const response = await fetch('/file/', {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${basicAuth}`,
          'Depth': '1'
        }
      });

      if (response.ok) {
        // Store credentials and update state
        localStorage.setItem('flaredrive_auth', basicAuth);
        setCredentials(basicAuth);
        setIsAuthenticated(true);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('flaredrive_auth');
    setCredentials(null);
    setIsAuthenticated(false);
  };

  const value = {
    isAuthenticated,
    credentials,
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};