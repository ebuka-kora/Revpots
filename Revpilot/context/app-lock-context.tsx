import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

const PIN_KEY = 'appLockPin';
const BIOMETRIC_KEY = 'appLockUseBiometric';

const isWeb = Platform.OS === 'web';
const webStore: Record<string, string> = {};

async function secureGet(key: string): Promise<string | null> {
  if (isWeb) return webStore[key] ?? null;
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStore[key] = value;
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function secureDelete(key: string): Promise<void> {
  if (isWeb) {
    delete webStore[key];
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

type AppLockContextValue = {
  isLocked: boolean;
  hasPin: boolean;
  useBiometric: boolean;
  isReady: boolean;
  setPin: (pin: string) => Promise<void>;
  removePin: () => Promise<void>;
  setUseBiometric: (value: boolean) => Promise<void>;
  lock: () => void;
  unlock: () => void;
  checkPin: (pin: string) => Promise<boolean>;
  biometricSupported: boolean;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

const PIN_LENGTH = 4;

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(true);
  const [hasPin, setHasPin] = useState(false);
  const [useBiometric, setUseBiometricState] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [pinStored, bioStored, supported] = await Promise.all([
          secureGet(PIN_KEY),
          secureGet(BIOMETRIC_KEY),
          isWeb ? Promise.resolve(false) : LocalAuthentication.hasHardwareAsync().then((h) =>
            h ? LocalAuthentication.isEnrolledAsync() : Promise.resolve(false)
          ),
        ]);
        if (cancelled) return;
        setHasPin(!!pinStored);
        setUseBiometricState(bioStored === 'true');
        setBiometricSupported(supported);
        setIsLocked(!!pinStored);
      } catch {
        if (!cancelled) setIsLocked(false);
      } finally {
        if (!cancelled) setIsReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setPin = useCallback(async (pin: string) => {
    if (pin.length !== PIN_LENGTH) return;
    await secureSet(PIN_KEY, pin);
    setHasPin(true);
    setIsLocked(true);
  }, []);

  const removePin = useCallback(async () => {
    await secureDelete(PIN_KEY);
    await secureDelete(BIOMETRIC_KEY);
    setHasPin(false);
    setUseBiometricState(false);
    setIsLocked(false);
  }, []);

  const setUseBiometric = useCallback(async (value: boolean) => {
    await secureSet(BIOMETRIC_KEY, value ? 'true' : 'false');
    setUseBiometricState(value);
  }, []);

  const lock = useCallback(() => {
    if (hasPin) setIsLocked(true);
  }, [hasPin]);

  const unlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const checkPin = useCallback(async (pin: string): Promise<boolean> => {
    const stored = await secureGet(PIN_KEY);
    return stored === pin;
  }, []);

  const value: AppLockContextValue = {
    isLocked,
    hasPin,
    useBiometric,
    isReady,
    setPin,
    removePin,
    setUseBiometric,
    lock,
    unlock,
    checkPin,
    biometricSupported,
  };

  return (
    <AppLockContext.Provider value={value}>
      {children}
    </AppLockContext.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}

export { PIN_LENGTH };
