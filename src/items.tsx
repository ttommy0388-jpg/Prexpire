import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { daysUntil } from './scanner/dateParser';
import { useSettings } from './settings';

// Items the user tracks. Items added in the app are saved on the device with AsyncStorage;
// the three sample items from the prototype stay in memory so the home screen is not empty
// (Settings can hide them).

export type CategoryId = 'food' | 'medicine' | 'household' | 'skincare' | 'pantry';

export const CATEGORY_NAMES: Record<CategoryId, string> = {
  food: 'Food',
  medicine: 'Medicine',
  household: 'Household',
  skincare: 'Skincare',
  pantry: 'Pantry',
};

export const CATEGORY_IDS = Object.keys(CATEGORY_NAMES) as CategoryId[];

export type Item = {
  id: string;
  name: string;
  category: CategoryId;
  // YYYY-MM-DD. For month-only dates this is the last day of the month.
  expiresOn: string;
  datePrecision: 'day' | 'month';
  addedAt: string;
  source: 'scan' | 'manual' | 'sample';
};

const STORAGE_KEY = 'prexpire.items.v1';
const LAST_CATEGORY_KEY = 'prexpire.lastCategory.v1';

function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sampleItems(): Item[] {
  const addedAt = new Date(0).toISOString();
  return [
    { id: 'sample-oat', name: 'Oat milk', category: 'food', expiresOn: isoInDays(1), datePrecision: 'day', addedAt, source: 'sample' },
    { id: 'sample-ibu', name: 'Ibuprofen', category: 'medicine', expiresOn: isoInDays(3), datePrecision: 'day', addedAt, source: 'sample' },
    { id: 'sample-bread', name: 'Bread', category: 'food', expiresOn: isoInDays(5), datePrecision: 'day', addedAt, source: 'sample' },
  ];
}

function isItem(x: unknown): x is Item {
  const i = x as Item;
  return !!i && typeof i.id === 'string' && typeof i.name === 'string' && i.category in CATEGORY_NAMES && /^\d{4}-\d{2}-\d{2}$/.test(i.expiresOn);
}

export type NewItem = Omit<Item, 'id' | 'addedAt'>;

type ItemsContext = {
  items: Item[];
  // Items added on this device (not the samples).
  saved: Item[];
  ready: boolean;
  lastCategory: CategoryId;
  // The category new items start in: the one chosen in Settings, or the last one used.
  defaultCategory: CategoryId;
  addItem: (item: NewItem) => Promise<Item>;
  // Deletes every saved item and the remembered category from storage.
  clearSaved: () => Promise<void>;
};

const Ctx = createContext<ItemsContext | null>(null);

export function ItemsProvider({ children }: { children: ReactNode }) {
  const [saved, setSaved] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [lastCategory, setLastCategory] = useState<CategoryId>('food');
  const { settings } = useSettings();
  const allSamples = useMemo(sampleItems, []);
  const samples = settings.showSamples ? allSamples : [];
  // Writes go through this ref so two quick saves never overwrite each other.
  const savedRef = useRef<Item[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [raw, cat] = await AsyncStorage.multiGet([STORAGE_KEY, LAST_CATEGORY_KEY]);
        const parsed: unknown = raw[1] ? JSON.parse(raw[1]) : [];
        const list = Array.isArray(parsed) ? parsed.filter(isItem) : [];
        if (cancelled) return;
        savedRef.current = list;
        setSaved(list);
        if (cat[1] && cat[1] in CATEGORY_NAMES) setLastCategory(cat[1] as CategoryId);
      } catch {
        // Unreadable storage starts empty rather than blocking the app.
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const addItem = useCallback(async (input: NewItem) => {
    const item: Item = { ...input, id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, addedAt: new Date().toISOString() };
    const next = [...savedRef.current, item];
    // Persist first: if the write fails the caller shows an error and nothing changes on screen.
    await AsyncStorage.multiSet([
      [STORAGE_KEY, JSON.stringify(next)],
      [LAST_CATEGORY_KEY, item.category],
    ]);
    savedRef.current = next;
    setSaved(next);
    setLastCategory(item.category);
    return item;
  }, []);

  const clearSaved = useCallback(async () => {
    await AsyncStorage.multiRemove([STORAGE_KEY, LAST_CATEGORY_KEY]);
    savedRef.current = [];
    setSaved([]);
    setLastCategory('food');
  }, []);

  const defaultCategory = settings.defaultCategory === 'last' ? lastCategory : settings.defaultCategory;
  const value = useMemo(
    () => ({ items: [...samples, ...saved], saved, ready, lastCategory, defaultCategory, addItem, clearSaved }),
    [samples, saved, ready, lastCategory, defaultCategory, addItem, clearSaved],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useItems() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useItems must be used inside ItemsProvider');
  return ctx;
}

// "Expires in 5 days", "Expires tomorrow", "Expired 2 days ago".
export function expiryPhrase(iso: string, today = new Date()) {
  const days = daysUntil(iso, today);
  if (days < -1) return `Expired ${-days} days ago`;
  if (days === -1) return 'Expired yesterday';
  if (days === 0) return 'Expires today';
  if (days === 1) return 'Expires tomorrow';
  return `Expires in ${days} days`;
}

export function expiryPill(iso: string, today = new Date()) {
  const days = daysUntil(iso, today);
  if (days < 0) return { pill: 'Expired', tone: 'amber' as const };
  if (days === 0) return { pill: 'Today', tone: 'amber' as const };
  return { pill: days === 1 ? '1 day' : `${days} days`, tone: days <= 1 ? ('amber' as const) : ('green' as const) };
}
