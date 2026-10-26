// Settings values and the pure logic that uses them (no React Native imports, so it is tested
// with Node on its own). The provider that loads and saves them lives in src/settings.tsx.

import type { CategoryId, Item } from './items';

export type ReminderLead = 0 | 1 | 3 | 7;
export type WarningDays = 3 | 7 | 14 | 30;
export type DateFormat = 'DMY' | 'MDY' | 'YMD';
export type SortOrder = 'expiry' | 'added' | 'name';
export type DefaultCategory = 'last' | CategoryId;

export type Settings = {
  // Notifications. Nothing is delivered yet: these drive the Reminders tab and its badge.
  reminders: boolean;
  reminderLead: ReminderLead;
  dailySummary: boolean;
  // Appearance
  compact: boolean;
  animations: boolean;
  // Expiry
  warningDays: WarningDays;
  dateFormat: DateFormat;
  sort: SortOrder;
  showExpired: boolean;
  // Inventory
  defaultCategory: DefaultCategory;
  showSamples: boolean;
};

export const REMINDER_LEADS: ReminderLead[] = [0, 1, 3, 7];
export const WARNING_DAYS: WarningDays[] = [3, 7, 14, 30];
export const DATE_FORMATS: DateFormat[] = ['DMY', 'MDY', 'YMD'];
export const SORT_ORDERS: SortOrder[] = ['expiry', 'added', 'name'];

export const DATE_FORMAT_LABELS: Record<DateFormat, string> = { DMY: 'DD/MM/YYYY', MDY: 'MM/DD/YYYY', YMD: 'YYYY-MM-DD' };
export const SORT_LABELS: Record<SortOrder, string> = { expiry: 'Expiry date', added: 'Recently added', name: 'Product name' };

export function reminderLeadLabel(lead: ReminderLead) {
  return lead === 0 ? 'On the expiry day' : lead === 1 ? '1 day before' : `${lead} days before`;
}

export function defaultSettings(dayOrder: 'DMY' | 'MDY' = 'DMY'): Settings {
  return {
    reminders: true,
    reminderLead: 1,
    dailySummary: false,
    compact: false,
    animations: true,
    warningDays: 3,
    dateFormat: dayOrder,
    sort: 'expiry',
    showExpired: true,
    defaultCategory: 'last',
    showSamples: true,
  };
}

// Takes whatever was stored and keeps only valid values, so an old or damaged entry
// falls back to the defaults field by field instead of breaking the app.
export function sanitizeSettings(raw: unknown, defaults: Settings, categories: readonly string[]): Settings {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const bool = (k: keyof Settings) => (typeof r[k] === 'boolean' ? (r[k] as boolean) : (defaults[k] as boolean));
  const oneOf = <T,>(k: keyof Settings, options: readonly T[]) => (options.includes(r[k] as T) ? (r[k] as T) : (defaults[k] as T));
  return {
    reminders: bool('reminders'),
    reminderLead: oneOf('reminderLead', REMINDER_LEADS),
    dailySummary: bool('dailySummary'),
    compact: bool('compact'),
    animations: bool('animations'),
    warningDays: oneOf('warningDays', WARNING_DAYS),
    dateFormat: oneOf('dateFormat', DATE_FORMATS),
    sort: oneOf('sort', SORT_ORDERS),
    showExpired: bool('showExpired'),
    defaultCategory: oneOf('defaultCategory', ['last', ...categories] as DefaultCategory[]),
    showSamples: bool('showSamples'),
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

// Dates are stored as YYYY-MM-DD and only formatted here, for display.
// Month-only dates show the month and year alone.
export function formatDisplayDate(iso: string, precision: 'day' | 'month', format: DateFormat) {
  const [y, m, d] = iso.split('-').map(Number);
  if (precision === 'month') return format === 'YMD' ? `${y}-${pad(m)}` : `${pad(m)}/${y}`;
  if (format === 'YMD') return `${y}-${pad(m)}-${pad(d)}`;
  if (format === 'MDY') return `${pad(m)}/${pad(d)}/${y}`;
  return `${pad(d)}/${pad(m)}/${y}`;
}

function daysBetween(iso: string, today: Date) {
  const [y, m, d] = iso.split('-').map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) / 86400000);
}

export function sortItems(items: Item[], order: SortOrder) {
  const list = [...items];
  if (order === 'name') list.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }) || a.expiresOn.localeCompare(b.expiresOn));
  else if (order === 'added') list.sort((a, b) => b.addedAt.localeCompare(a.addedAt) || a.expiresOn.localeCompare(b.expiresOn));
  else list.sort((a, b) => a.expiresOn.localeCompare(b.expiresOn) || a.name.localeCompare(b.name));
  return list;
}

export type ExpiryStatus = 'expired' | 'soon' | 'ok';

// "soon" covers today through the warning period.
export function expiryStatus(iso: string, warningDays: number, today = new Date()): ExpiryStatus {
  const days = daysBetween(iso, today);
  return days < 0 ? 'expired' : days <= warningDays ? 'soon' : 'ok';
}

// The day a reminder for this item is due (YYYY-MM-DD).
export function reminderDate(iso: string, lead: ReminderLead) {
  const [y, m, d] = iso.split('-').map(Number);
  const r = new Date(Date.UTC(y, m - 1, d - lead));
  return `${r.getUTCFullYear()}-${pad(r.getUTCMonth() + 1)}-${pad(r.getUTCDate())}`;
}

// Items whose reminder day has arrived: expired items, and items within the reminder lead time.
export function remindersDue(items: Item[], lead: ReminderLead, today = new Date()) {
  return items.filter((i) => daysBetween(i.expiresOn, today) <= lead);
}

const EXPORT_FIELDS = ['name', 'category', 'expiresOn', 'datePrecision', 'addedAt', 'source'] as const;

export function itemsToJson(items: Item[], exportedAt: Date, appVersion: string) {
  return JSON.stringify(
    {
      app: 'Prexpire',
      appVersion,
      exportedAt: exportedAt.toISOString(),
      itemCount: items.length,
      items: items.map((i) => Object.fromEntries(EXPORT_FIELDS.map((f) => [f, i[f]]))),
    },
    null,
    2,
  );
}

// RFC 4180 quoting. Cells that a spreadsheet would run as a formula get a leading apostrophe.
function csvCell(value: string) {
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function itemsToCsv(items: Item[], categoryNames: Record<string, string>) {
  const header = ['Name', 'Category', 'Expires on', 'Date precision', 'Added at', 'Source'];
  const rows = items.map((i) => [i.name, categoryNames[i.category] ?? i.category, i.expiresOn, i.datePrecision, i.addedAt, i.source]);
  return [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

export function exportFileName(ext: 'json' | 'csv', now: Date) {
  return `prexpire-items-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}.${ext}`;
}
