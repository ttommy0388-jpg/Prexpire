import { CATEGORY_NAMES, expiryPhrase, type Item } from '../items';
import { daysUntil } from '../scanner/dateParser';
import { expiryStatus } from '../preferences';
import { useSettings } from '../settings';
import { BreadArt, MilkArt, PillArt } from './Art';
import { ExpiryRow } from './HomeComponents';
import { categoryArt } from './ResultSheet';

export function itemArt(item: Item, size = 30) {
  // The prototype's sample items keep their own illustrations.
  if (item.id === 'sample-oat') return <MilkArt size={size} />;
  if (item.id === 'sample-ibu') return <PillArt size={size} />;
  if (item.id === 'sample-bread') return <BreadArt size={size} />;
  return categoryArt(item.category, size);
}

// Amber from today through the warning period chosen in Settings, green after that.
export function itemPill(item: Item, warningDays: number, today = new Date()) {
  const status = expiryStatus(item.expiresOn, warningDays, today);
  if (status === 'expired') return { pill: 'Expired', tone: 'amber' as const };
  const days = daysUntil(item.expiresOn, today);
  const pill = days === 0 ? 'Today' : days === 1 ? '1 day' : `${days} days`;
  return { pill, tone: status === 'soon' ? ('amber' as const) : ('green' as const) };
}

type Props = {
  item: Item;
  // Adds the formatted expiry date to the subtitle.
  showDate?: boolean;
  // Replaces the expiry phrase, e.g. "Reminder on 03/11/2026".
  note?: string;
  onPress?: () => void;
};

// An item in a list, styled by the Settings preferences (compact rows, warning period, date format).
export function ItemRow({ item, showDate = false, note, onPress }: Props) {
  const { settings, formatDate } = useSettings();
  const { pill, tone } = itemPill(item, settings.warningDays);
  const sub = [CATEGORY_NAMES[item.category], note ?? expiryPhrase(item.expiresOn)];
  if (showDate) sub.push(formatDate(item.expiresOn, item.datePrecision));
  return (
    <ExpiryRow
      art={itemArt(item, settings.compact ? 24 : 30)}
      title={item.name}
      sub={sub}
      pill={pill}
      tone={tone}
      compact={settings.compact}
      onPress={onPress}
    />
  );
}
