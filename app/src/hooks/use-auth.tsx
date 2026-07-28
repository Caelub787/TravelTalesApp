import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  type User,
} from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { auth, db, isFirebaseConfigured } from '@/services/firebase';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function friendlyAuthError(err: unknown): string {
  const code = (err as { code?: string })?.code;
  switch (code) {
    case 'auth/invalid-email':
      return 'That email address looks invalid.';
    case 'auth/email-already-in-use':
      return 'An account with that email already exists — try signing in instead.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Incorrect email or password.';
    default:
      return err instanceof Error ? err.message : String(err);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  // Create/update this user's profile doc (used for friend search by email) whenever they
  // sign in — Firestore has no server-side "on user created" trigger without paid Cloud
  // Functions, so this is the client-side equivalent.
  useEffect(() => {
    if (!user) return;
    setDoc(
      doc(db, 'users', user.uid),
      { email: user.email, displayName: user.displayName ?? null, updatedAt: serverTimestamp() },
      { merge: true }
    ).catch(() => {
      // Non-fatal: the app still works this session even if the profile doc write fails.
    });
  }, [user]);

  const signIn = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      return null;
    } catch (err) {
      return friendlyAuthError(err);
    }
  }, []);

  const signUp = useCallback(async (email: string, password: string): Promise<string | null> => {
    try {
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      return null;
    } catch (err) {
      return friendlyAuthError(err);
    }
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
