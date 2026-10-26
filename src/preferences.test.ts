// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultSettings,
  expiryStatus,
  exportFileName,
  formatDisplayDate,
  itemsToCsv,
  itemsToJson,
  reminderDate,
  remindersDue,
  sanitizeSettings,
  sortItems,
} from './preferences.ts';
import type { Item } from './items';

const today = new Date(2026, 9, 26); // 26 Oct 2026
const cats = ['food', 'medicine', 'household', 'skincare', 'pantry'];

function item(id: string, name: string, expiresOn: string, addedAt = '2026-10-01T00:00:00.000Z'): Item {
  return { id, name, category: 'food', expiresOn, datePrecision: 'day', addedAt, source: 'manual' };
}

test('defaults follow the region day order', () => {
  assert.equal(defaultSettings('MDY').dateFormat, 'MDY');
  assert.equal(defaultSettings('DMY').dateFormat, 'DMY');
  assert.equal(defaultSettings().reminders, true);
});

test('stored settings are validated field by field', () => {
  const d = defaultSettings();
  assert.deepEqual(sanitizeSettings(null, d, cats), d);
  assert.deepEqual(sanitizeSettings('junk', d, cats), d);
  const s = sanitizeSettings({ reminders: false, reminderLead: 5, warningDays: 14, dateFormat: 'YMD', sort: 'bogus', defaultCategory: 'pantry', compact: 'yes' }, d, cats);
  assert.equal(s.reminders, false);
  assert.equal(s.reminderLead, d.reminderLead);
  assert.equal(s.warningDays, 14);
  assert.equal(s.dateFormat, 'YMD');
  assert.equal(s.sort, 'expiry');
  assert.equal(s.defaultCategory, 'pantry');
  assert.equal(s.compact, false);
  assert.equal(sanitizeSettings({ defaultCategory: 'toys' }, d, cats).defaultCategory, 'last');
});

test('dates are formatted for display without changing the stored value', () => {
  assert.equal(formatDisplayDate('2026-03-04', 'day', 'DMY'), '04/03/2026');
  assert.equal(formatDisplayDate('2026-03-04', 'day', 'MDY'), '03/04/2026');
  assert.equal(formatDisplayDate('2026-03-04', 'day', 'YMD'), '2026-03-04');
  assert.equal(formatDisplayDate('2027-10-31', 'month', 'DMY'), '10/2027');
  assert.equal(formatDisplayDate('2027-10-31', 'month', 'YMD'), '2027-10');
});

test('sorting', () => {
  const list = [item('a', 'banana', '2026-11-05', '2026-10-03T00:00:00Z'), item('b', 'Apple', '2026-10-30', '2026-10-01T00:00:00Z'), item('c', 'cherry', '2026-10-20', '2026-10-05T00:00:00Z')];
  assert.deepEqual(sortItems(list, 'expiry').map((i) => i.id), ['c', 'b', 'a']);
  assert.deepEqual(sortItems(list, 'name').map((i) => i.id), ['b', 'a', 'c']);
  assert.deepEqual(sortItems(list, 'added').map((i) => i.id), ['c', 'a', 'b']);
  assert.deepEqual(list.map((i) => i.id), ['a', 'b', 'c'], 'input is not mutated');
});

test('warning period decides "expiring soon"', () => {
  assert.equal(expiryStatus('2026-10-25', 3, today), 'expired');
  assert.equal(expiryStatus('2026-10-26', 3, today), 'soon');
  assert.equal(expiryStatus('2026-10-29', 3, today), 'soon');
  assert.equal(expiryStatus('2026-10-30', 3, today), 'ok');
  assert.equal(expiryStatus('2026-10-30', 7, today), 'soon');
});

test('reminders', () => {
  assert.equal(reminderDate('2026-11-01', 3), '2026-10-29');
  assert.equal(reminderDate('2026-03-01', 1), '2026-02-28');
  assert.equal(reminderDate('2026-11-01', 0), '2026-11-01');
  const list = [item('x', 'old', '2026-10-20'), item('t', 'today', '2026-10-26'), item('d', 'tomorrow', '2026-10-27'), item('w', 'week', '2026-11-02')];
  assert.deepEqual(remindersDue(list, 0, today).map((i) => i.id), ['x', 't']);
  assert.deepEqual(remindersDue(list, 1, today).map((i) => i.id), ['x', 't', 'd']);
  assert.deepEqual(remindersDue(list, 7, today).map((i) => i.id), ['x', 't', 'd', 'w']);
});

test('CSV export quotes fields and defuses formulas', () => {
  const csv = itemsToCsv([item('1', 'Milk, "whole"', '2026-11-01'), item('2', '=HYPERLINK("x")', '2026-11-02')], { food: 'Food' });
  const lines = csv.trimEnd().split('\r\n');
  assert.equal(lines[0], 'Name,Category,Expires on,Date precision,Added at,Source');
  assert.equal(lines[1], '"Milk, ""whole""",Food,2026-11-01,day,2026-10-01T00:00:00.000Z,manual');
  assert.ok(lines[2].startsWith(`"'=HYPERLINK(""x"")"`));
});

test('JSON export holds only the item fields', () => {
  const json = JSON.parse(itemsToJson([item('1', 'Milk', '2026-11-01')], today, '0.1.0'));
  assert.equal(json.itemCount, 1);
  assert.deepEqual(Object.keys(json.items[0]), ['name', 'category', 'expiresOn', 'datePrecision', 'addedAt', 'source']);
  assert.equal(exportFileName('csv', today), 'prexpire-items-2026-10-26.csv');
});
