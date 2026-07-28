import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApps, initializeApp } from 'firebase/app';
import { browserLocalPersistence, getAuth, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { Platform } from 'react-native';

// getReactNativePersistence exists at runtime for native builds (Metro resolves the RN-specific
// build of firebase/auth) but isn't in the package's published type definitions — a known gap,
// see https://github.com/firebase/firebase-js-sdk/issues/8332.
// @ts-expect-error
import { getReactNativePersistence } from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

// Accounts/friends/messaging are an optional layer on top of the app, not a hard
// requirement to use it — this flag lets the UI degrade to "not set up yet" instead of
// crashing when these env vars aren't configured.
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId);

const placeholderConfig = { apiKey: 'placeholder', authDomain: 'placeholder.firebaseapp.com', projectId: 'placeholder' };
const app = getApps().length ? getApps()[0]! : initializeApp(isFirebaseConfigured ? firebaseConfig : placeholderConfig);

// initializeAuth throws if called more than once against the same app (e.g. Fast Refresh
// during development reusing the module) — fall back to the already-initialized instance.
let authInstance;
try {
  authInstance = initializeAuth(app, {
    persistence: Platform.OS === 'web' ? browserLocalPersistence : getReactNativePersistence(AsyncStorage),
  });
} catch {
  authInstance = getAuth(app);
}

export const auth = authInstance;
export const db = getFirestore(app);
