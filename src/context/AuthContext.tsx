import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthUser, UserRole } from '../types';

interface SignupInput {
  name: string;
  email: string;
  password: string;
}

interface LoginInput {
  email: string;
  password: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  users: AuthUser[];
  signup: (input: SignupInput) => Promise<void>;
  login: (input: LoginInput) => Promise<void>;
  logout: () => void;
  updateUserRole: (userId: string, role: UserRole) => void;
  updateProfile: (updates: { name?: string }) => void;
  changePassword: (input: { currentPassword: string; newPassword: string }) => Promise<void>;
}

type StoredUser = AuthUser & { passwordHash: string };

const USERS_STORAGE_KEY = 'complianceReviewer.auth.users';
const CURRENT_USER_STORAGE_KEY = 'complianceReviewer.auth.currentUser';
const MIN_PASSWORD_LENGTH = 8;

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const hashPassword = (password: string) => {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    return window.crypto.subtle.digest('SHA-256', encoder.encode(password)).then((buffer) => {
      const bytes = Array.from(new Uint8Array(buffer));
      return bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('');
    });
  }
  try {
    return Promise.resolve(btoa(password));
  } catch (error) {
    console.warn('[Auth] Unable to hash password, using plain fallback.', error);
    return Promise.resolve(password);
  }
};

const generateId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `user-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const readStoredUsers = (): StoredUser[] => {
  if (typeof window === 'undefined') {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StoredUser[];
    if (!Array.isArray(parsed)) return [];
    return parsed.map((user) => ({
      ...user,
      passwordHash: user.passwordHash ?? '',
    }));
  } catch (error) {
    console.warn('[Auth] Failed to read stored users', error);
    return [];
  }
};

const seedDefaultUsers = (existing: StoredUser[]): StoredUser[] => {
  if (existing.length > 0) return existing;
  return [
    {
      id: generateId(),
      name: 'Compliance Admin',
      email: 'admin@compliance.local',
      role: 'admin',
      passwordHash: '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    },
  ];
};

const toAuthUser = (user: StoredUser): AuthUser => {
  const { passwordHash: _passwordHash, ...rest } = user;
  return rest;
};

export const AuthProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [users, setUsers] = useState<StoredUser[]>(() => seedDefaultUsers(readStoredUsers()));
  const [currentUserId, setCurrentUserId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return window.localStorage.getItem(CURRENT_USER_STORAGE_KEY);
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (currentUserId) {
      window.localStorage.setItem(CURRENT_USER_STORAGE_KEY, currentUserId);
    } else {
      window.localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, [currentUserId]);

  const currentUser = useMemo(() => {
    if (!currentUserId) return null;
    const match = users.find((user) => user.id === currentUserId);
    return match ? toAuthUser(match) : null;
  }, [currentUserId, users]);

  const signup = useCallback(
    async ({ name, email, password }: SignupInput) => {
      if (!name.trim() || !email.trim() || !password.trim()) {
        throw new Error('All fields are required.');
      }
      if (password.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      const normalizedEmail = email.trim().toLowerCase();
      const existing = users.find((user) => user.email.toLowerCase() === normalizedEmail);
      if (existing) {
        throw new Error('Account already exists for this email.');
      }
      const passwordHash = await hashPassword(password);
      const newUser: StoredUser = {
        id: generateId(),
        name: name.trim(),
        email: normalizedEmail,
        role: users.length === 0 ? 'admin' : 'reviewer',
        passwordHash,
      };
      setUsers((prev) => [...prev, newUser]);
      setCurrentUserId(newUser.id);
    },
    [users],
  );

  const login = useCallback(
    async ({ email, password }: LoginInput) => {
      const normalizedEmail = email.trim().toLowerCase();
      const stored = users.find((user) => user.email.toLowerCase() === normalizedEmail);
      if (!stored) {
        throw new Error('Account not found.');
      }
      const attemptedHash = await hashPassword(password);
      if (attemptedHash !== stored.passwordHash) {
        throw new Error('Invalid credentials.');
      }
      setCurrentUserId(stored.id);
    },
    [users],
  );

  const logout = useCallback(() => {
    setCurrentUserId(null);
  }, []);

  const updateUserRole = useCallback(
    (userId: string, role: UserRole) => {
      setUsers((prev) =>
        prev.map((user) => (user.id === userId ? { ...user, role } : user)),
      );
    },
    [],
  );

  const updateProfile = useCallback(
    ({ name }: { name?: string }) => {
      if (!currentUserId) {
        throw new Error('No active session.');
      }
      if (name && name.trim().length) {
        const trimmed = name.trim();
        setUsers((prev) =>
          prev.map((user) => (user.id === currentUserId ? { ...user, name: trimmed } : user)),
        );
      }
    },
    [currentUserId],
  );

  const changePassword = useCallback(
    async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      if (!currentUserId) {
        throw new Error('No active session.');
      }
      if (newPassword.length < MIN_PASSWORD_LENGTH) {
        throw new Error(`New password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      }
      const stored = users.find((user) => user.id === currentUserId);
      if (!stored) {
        throw new Error('User not found.');
      }
      const currentHash = await hashPassword(currentPassword);
      if (currentHash !== stored.passwordHash) {
        throw new Error('Current password is incorrect.');
      }
      const nextHash = await hashPassword(newPassword);
      setUsers((prev) =>
        prev.map((user) => (user.id === currentUserId ? { ...user, passwordHash: nextHash } : user)),
      );
    },
    [currentUserId, users],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user: currentUser,
      users: users.map(toAuthUser),
      signup,
      login,
      logout,
      updateUserRole,
      updateProfile,
      changePassword,
    }),
    [currentUser, signup, login, logout, updateUserRole, updateProfile, changePassword, users],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};
