import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';

import { auth } from '@/services/firebase.config';

// Polardex accounts are usernames, not emails. We map them to a synthetic email
// domain for Firebase, and pad short passwords past Firebase's 6-char minimum
// with a fixed pepper. Both transforms must match the account-creation script.
const EMAIL_DOMAIN = 'polardex.app';
const PEPPER = '::pdx-7k';
export const usernameToEmail = (u: string) => `${u.trim().toLowerCase()}@${EMAIL_DOMAIN}`;
export const toSecret = (p: string) => `${p}${PEPPER}`;
export const emailToUsername = (e: string | null | undefined) => (e ? e.split('@')[0] : null);

const GUEST_KEY = 'polardex_guest';
const BIO_KEY = 'polardex_bio'; // SecureStore: JSON { username, password }

export type AuthStatus = 'loading' | 'authed' | 'guest' | 'unauthed';
export type BiometricType = 'face' | 'fingerprint' | 'biometric';

interface AuthValue {
  status: AuthStatus;
  user: User | null;
  username: string | null;
  canEdit: boolean; // signed in (not a guest)
  /** True when a signed-in session is gated behind a biometric unlock this launch. */
  locked: boolean;

  signIn: (username: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  continueAsGuest: () => Promise<void>;
  exitGuest: () => Promise<void>;

  biometricAvailable: boolean;
  biometricType: BiometricType;
  biometricEnabled: boolean;
  enableBiometric: (username: string, password: string) => Promise<boolean>;
  disableBiometric: () => Promise<void>;
  /** Prompt biometrics to lift the lock on an already signed-in session. */
  unlock: () => Promise<void>;
  /** Prompt biometrics from the login screen, then sign in with stored creds. */
  loginWithBiometric: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

function friendlyError(code: string): string {
  if (code.includes('invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found'))
    return 'Incorrect username or password.';
  if (code.includes('too-many-requests')) return 'Too many attempts — try again shortly.';
  if (code.includes('network')) return 'No connection. Check your internet.';
  return 'Could not sign in. Please try again.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isGuest, setIsGuest] = useState(false);
  const [flagsReady, setFlagsReady] = useState(false);

  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricType, setBiometricType] = useState<BiometricType>('biometric');
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);

  // Firebase auth session (persisted via AsyncStorage in firebase.config).
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // Persisted guest flag + biometric capability/enablement.
  useEffect(() => {
    (async () => {
      const [guest, bioCreds] = await Promise.all([
        AsyncStorage.getItem(GUEST_KEY),
        SecureStore.getItemAsync(BIO_KEY).catch(() => null),
      ]);
      setIsGuest(guest === '1');
      setBiometricEnabled(!!bioCreds);

      const [hasHw, enrolled, types] = await Promise.all([
        LocalAuthentication.hasHardwareAsync(),
        LocalAuthentication.isEnrolledAsync(),
        LocalAuthentication.supportedAuthenticationTypesAsync(),
      ]);
      setBiometricAvailable(hasHw && enrolled);
      if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) setBiometricType('face');
      else if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) setBiometricType('fingerprint');
      setFlagsReady(true);
    })();
  }, []);

  const signIn = useCallback(async (username: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, usernameToEmail(username), toSecret(password));
      await AsyncStorage.setItem(GUEST_KEY, '0');
      setIsGuest(false);
      setSessionUnlocked(true); // they just proved identity
    } catch (e: unknown) {
      const code = e instanceof Error ? (e as { code?: string }).code ?? e.message : String(e);
      throw new Error(friendlyError(code));
    }
  }, []);

  const signOutUser = useCallback(async () => {
    await signOut(auth);
    await AsyncStorage.setItem(GUEST_KEY, '0');
    setIsGuest(false);
    setSessionUnlocked(false);
  }, []);

  const continueAsGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, '1');
    setIsGuest(true);
  }, []);

  const exitGuest = useCallback(async () => {
    await AsyncStorage.setItem(GUEST_KEY, '0');
    setIsGuest(false);
  }, []);

  const enableBiometric = useCallback(async (username: string, password: string) => {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Enable quick unlock',
      disableDeviceFallback: false,
    });
    if (!res.success) return false;
    await SecureStore.setItemAsync(BIO_KEY, JSON.stringify({ username, password }));
    setBiometricEnabled(true);
    setSessionUnlocked(true);
    return true;
  }, []);

  const disableBiometric = useCallback(async () => {
    await SecureStore.deleteItemAsync(BIO_KEY);
    setBiometricEnabled(false);
  }, []);

  const unlock = useCallback(async () => {
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Unlock Polardex' });
    if (res.success) setSessionUnlocked(true);
  }, []);

  const loginWithBiometric = useCallback(async () => {
    const raw = await SecureStore.getItemAsync(BIO_KEY).catch(() => null);
    if (!raw) return;
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: 'Sign in to Polardex' });
    if (!res.success) return;
    const { username, password } = JSON.parse(raw) as { username: string; password: string };
    await signIn(username, password);
  }, [signIn]);

  const value = useMemo<AuthValue>(() => {
    const status: AuthStatus = !authReady || !flagsReady
      ? 'loading'
      : user
        ? 'authed'
        : isGuest
          ? 'guest'
          : 'unauthed';
    const locked = status === 'authed' && biometricEnabled && !sessionUnlocked;
    return {
      status,
      user,
      username: emailToUsername(user?.email),
      canEdit: status === 'authed',
      locked,
      signIn,
      signOutUser,
      continueAsGuest,
      exitGuest,
      biometricAvailable,
      biometricType,
      biometricEnabled,
      enableBiometric,
      disableBiometric,
      unlock,
      loginWithBiometric,
    };
  }, [
    authReady, flagsReady, user, isGuest, biometricEnabled, sessionUnlocked,
    biometricAvailable, biometricType, signIn, signOutUser, continueAsGuest,
    exitGuest, enableBiometric, disableBiometric, unlock, loginWithBiometric,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
