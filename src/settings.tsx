import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { dayOrderForRegion } from './scanner/dateParser';
import { CATEGORY_IDS } from './items';
import { defaultSettings, formatDisplayDate, sanitizeSettings, type Settings } from './preferences';

// User preferences, saved with AsyncStorage (localStorage in the browser) next to the items.

export const SETTINGS_KEY = 'prexpire.settings.v1';

type SettingsContext = {
  settings: Settings;
  ready: boolean;
  // Set when the last save failed; the change still applies until the page is closed.
  saveError: boolean;
  update: (patch: Partial<Settings>) => void;
  // Back to the defaults, in memory and in storage.
  reset: () => Promise<void>;
  // The operating system asks for reduced motion.
  systemReduceMotion: boolean;
  // Animations allowed by both the setting and the operating system.
  motion: boolean;
  formatDate: (iso: string, precision?: 'day' | 'month') => string;
};

const Ctx = createContext<SettingsContext | null>(null);

function regionDefaults() {
  let region: string | null = null;
  try {
    region = getLocales()[0]?.regionCode ?? null;
  } catch {
    // No locale information: day-first.
  }
  return defaultSettings(dayOrderForRegion(region));
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const defaults = useMemo(regionDefaults, []);
  const [settings, setSettings] = useState<Settings>(defaults);
  const [ready, setReady] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [systemReduceMotion, setSystemReduceMotion] = useState(false);
  // Saves go through this ref so quick successive changes build on each other.
  const current = useRef<Settings>(defaults);
  // A change made before the saved settings finish loading wins over them.
  const touched = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(SETTINGS_KEY);
        if (cancelled || !raw || touched.current) return;
        const next = sanitizeSettings(JSON.parse(raw), defaults, CATEGORY_IDS);
        current.current = next;
        setSettings(next);
      } catch {
        // Unreadable storage keeps the defaults.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [defaults]);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setSystemReduceMotion)
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setSystemReduceMotion);
    return () => sub?.remove();
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    const next = { ...current.current, ...patch };
    touched.current = true;
    current.current = next;
    setSettings(next);
    AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(next)).then(
      () => setSaveError(false),
      () => setSaveError(true),
    );
  }, []);

  const reset = useCallback(async () => {
    await AsyncStorage.removeItem(SETTINGS_KEY);
    current.current = defaults;
    setSettings(defaults);
    setSaveError(false);
  }, [defaults]);

  const value = useMemo<SettingsContext>(() => {
    const motion = settings.animations && !systemReduceMotion;
    return {
      settings,
      ready,
      saveError,
      update,
      reset,
      systemReduceMotion,
      motion,
      formatDate: (iso, precision = 'day') => formatDisplayDate(iso, precision, settings.dateFormat),
    };
  }, [settings, ready, saveError, update, reset, systemReduceMotion]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSettings() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
