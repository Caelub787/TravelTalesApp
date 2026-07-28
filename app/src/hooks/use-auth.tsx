import * as Google from 'expo-auth-session/providers/google';
import { GoogleAuthProvider, onAuthStateChanged, signInWithCredential, signOut as firebaseSignOut, type User } from 'firebase/auth';
import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { auth, db, isFirebaseConfigured } from '@/services/firebase';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingResolve = useRef<((error: string | null) => void) | null>(null);

  const [request, response, promptAsync] = Google.useAuthRequest({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });

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

  useEffect(() => {
    if (!response) return;
    const resolve = pendingResolve.current;
    pendingResolve.current = null;

    if (response.type === 'success') {
      const idToken = response.authentication?.idToken ?? response.params?.id_token;
      if (!idToken) {
        resolve?.('Google sign-in did not return a token');
        return;
      }
      const credential = GoogleAuthProvider.credential(idToken);
      signInWithCredential(auth, credential)
        .then(() => resolve?.(null))
        .catch((err) => resolve?.(err instanceof Error ? err.message : String(err)));
    } else if (response.type === 'error') {
      resolve?.(response.error?.message ?? 'Google sign-in failed');
    } else {
      resolve?.(null); // user dismissed/cancelled — not an error
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [response]);

  const signInWithGoogle = useCallback(async (): Promise<string | null> => {
    if (!GOOGLE_WEB_CLIENT_ID) return 'Google sign-in is not configured yet.';
    if (!request) return 'Google sign-in is still loading — try again in a moment.';
    return new Promise((resolve) => {
      pendingResolve.current = resolve;
      promptAsync().catch((err) => {
        pendingResolve.current = null;
        resolve(err instanceof Error ? err.message : String(err));
      });
    });
  }, [request, promptAsync]);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, configured: isFirebaseConfigured, signInWithGoogle, signOut }}>
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
