import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { UserProfile } from '../types/manga';
import { getUserProfile, saveUserProfile, clearUserProfile } from '../services/storage';

export interface UserAccount extends UserProfile {
  email?: string;
  passwordHash?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isPro: boolean;
  login: (username: string, password?: string) => { success: boolean; error?: string };
  register: (data: { username: string; password?: string; email?: string; avatar?: string; role?: 'user' | 'pro' | 'admin' }) => { success: boolean; error?: string };
  logout: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
}

const ACCOUNTS_KEY = 'neoko_user_accounts_v2';

export function getStoredAccounts(): UserAccount[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAccount(acc: UserAccount): UserAccount[] {
  const accounts = getStoredAccounts();
  const idx = accounts.findIndex(a => a.username.toLowerCase() === acc.username.toLowerCase());
  if (idx >= 0) {
    accounts[idx] = { ...accounts[idx], ...acc };
  } else {
    accounts.push(acc);
  }
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(accounts));
  return accounts;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoggedIn: false,
  isAdmin: false,
  isPro: false,
  login: () => ({ success: false }),
  register: () => ({ success: false }),
  logout: () => {},
  updateProfile: () => {},
});

export const useAuth = () => useContext(AuthContext);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => getUserProfile());

  useEffect(() => {
    const handleProfileChange = () => {
      setUser(getUserProfile());
    };
    window.addEventListener('neoko_profile_changed', handleProfileChange);
    return () => window.removeEventListener('neoko_profile_changed', handleProfileChange);
  }, []);

  const login = (username: string, password?: string): { success: boolean; error?: string } => {
    const cleanUsername = username.trim();
    if (!cleanUsername) {
      return { success: false, error: 'Please enter your username' };
    }

    const accounts = getStoredAccounts();
    const foundAcc = accounts.find(a => a.username.toLowerCase() === cleanUsername.toLowerCase());

    // Admin password check
    const adminPass = localStorage.getItem('neoko_admin_password') || 'admin123';
    if (password && password === adminPass) {
      const adminProfile = saveUserProfile({
        username: cleanUsername,
        avatar: foundAcc?.avatar || '⚡',
        role: 'admin',
        isPro: true,
      });
      setUser(adminProfile);
      return { success: true };
    }

    // Account check with password
    if (foundAcc) {
      if (foundAcc.passwordHash && password && foundAcc.passwordHash !== password) {
        return { success: false, error: 'Incorrect password' };
      }
      const profile = saveUserProfile(foundAcc);
      setUser(profile);
      return { success: true };
    }

    // New user dynamic login if account not found
    const newProfile = saveUserProfile({
      username: cleanUsername,
      avatar: '🔮',
      role: 'user',
      isPro: false,
      createdAt: Date.now(),
    });
    saveAccount(newProfile);
    setUser(newProfile);
    return { success: true };
  };

  const register = (data: {
    username: string;
    password?: string;
    email?: string;
    avatar?: string;
    role?: 'user' | 'pro' | 'admin';
  }): { success: boolean; error?: string } => {
    const cleanUsername = data.username.trim();
    if (!cleanUsername) {
      return { success: false, error: 'Username is required' };
    }

    const accounts = getStoredAccounts();
    const existing = accounts.find(a => a.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return { success: false, error: 'An account with this username already exists' };
    }

    const newAccount: UserAccount = {
      username: cleanUsername,
      email: data.email?.trim() || '',
      passwordHash: data.password || '',
      avatar: data.avatar || '🔮',
      role: data.role || 'user',
      isPro: data.role === 'pro' || data.role === 'admin',
      createdAt: Date.now(),
    };

    saveAccount(newAccount);
    const profile = saveUserProfile(newAccount);
    setUser(profile);
    return { success: true };
  };

  const logout = () => {
    clearUserProfile();
    setUser(null);
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    const updated = saveUserProfile(updates);
    if (user) {
      saveAccount({ ...user, ...updates });
    }
    setUser(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoggedIn: !!user,
        isAdmin: user?.role === 'admin',
        isPro: user?.isPro || user?.role === 'pro' || user?.role === 'admin',
        login,
        register,
        logout,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
