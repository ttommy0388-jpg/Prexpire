import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { CATEGORY_IDS, CATEGORY_NAMES, useItems, type CategoryId } from '../items';
import { useSettings } from '../settings';
import { expiryStatus, SORT_LABELS, sortItems } from '../preferences';
import { Page } from '../components/Page';
import { ItemRow } from '../components/ItemRow';
import { Note, Options, SmallButton } from '../components/SettingsRows';

type Props = { badge: number; category?: CategoryId; onNavigate: (route: string) => void };

// Every tracked item, filtered by category and ordered by the sorting chosen in Settings.
export function ItemsScreen({ badge, category, onNavigate }: Props) {
  const { items } = useItems();
  const { settings } = useSettings();
  const [filter, setFilter] = useState<'all' | CategoryId>(category ?? 'all');

  const inCategory = useMemo(() => (filter === 'all' ? items : items.filter((i) => i.category === filter)), [items, filter]);
  const expired = inCategory.filter((i) => expiryStatus(i.expiresOn, settings.warningDays) === 'expired');
  const shown = useMemo(
    () => sortItems(settings.showExpired ? inCategory : inCategory.filter((i) => expiryStatus(i.expiresOn, settings.warningDays) !== 'expired'), settings.sort),
    [inCategory, settings.showExpired, settings.sort, settings.warningDays],
  );

  return (
    <Page title="Items" subtitle="Everything you're tracking." badge={badge} onNavigate={onNavigate}>
      <Options
        label="Category"
        value={filter}
        onChange={setFilter}
        options={[{ value: 'all' as const, label: 'All' }, ...CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORY_NAMES[id] }))]}
      />
      <View style={s.meta}>
        <Text style={s.metaText}>
          {shown.length === 1 ? '1 item' : `${shown.length} items`} · {SORT_LABELS[settings.sort]}
        </Text>
        <Pressable onPress={() => onNavigate('tab:settings')} accessibilityRole="link" hitSlop={8}>
          <Text style={s.link}>Change</Text>
        </Pressable>
      </View>
      {!settings.showExpired && expired.length > 0 && (
        <View style={s.hidden}>
          <Note>
            {expired.length === 1 ? '1 expired item is hidden' : `${expired.length} expired items are hidden`}. You can show them again in Settings.
          </Note>
        </View>
      )}
      <View style={[s.list, settings.compact && s.listCompact]}>
        {shown.map((item) => (
          <ItemRow key={item.id} item={item} showDate />
        ))}
      </View>
      {shown.length === 0 && (
        <View style={s.empty}>
          <Text style={s.emptyTitle}>{items.length ? 'Nothing here' : 'No items yet'}</Text>
          <Text style={s.emptyText}>Scan a label or type a date to add an item.</Text>
          <SmallButton label="Scan a label" icon="scan-outline" tone="mint" onPress={() => onNavigate('scan')} />
        </View>
      )}
    </Page>
  );
}

const s = StyleSheet.create({
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 10 },
  metaText: { color: colors.textMuted, fontSize: 13.5 },
  link: { color: colors.mint, fontSize: 14, fontWeight: '600' },
  hidden: { marginBottom: 10 },
  list: { gap: 8 },
  listCompact: { gap: 6 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 32 },
  emptyTitle: { color: colors.text, fontSize: 17, fontWeight: '600' },
  emptyText: { color: colors.textMuted, fontSize: 14, marginBottom: 6 },
});
