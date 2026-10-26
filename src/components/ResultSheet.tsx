import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { CATEGORY_IDS, CATEGORY_NAMES, expiryPhrase, type CategoryId } from '../items';
import { formatDate, isoToday, type ConfirmReason, type Interpretation } from '../scanner/dateParser';
import type { Detection } from '../scanner/useExpiryScanner';
import { AppleArt, CapsuleArt, HouseArt, JarArt, PumpBottleArt } from './Art';

export function categoryArt(id: CategoryId, size: number) {
  switch (id) {
    case 'food':
      return <AppleArt size={size} />;
    case 'medicine':
      return <CapsuleArt size={size} />;
    case 'household':
      return <HouseArt size={0.95 * size} />;
    case 'skincare':
      return <PumpBottleArt size={size} />;
    default:
      return <JarArt size={size} />;
  }
}

const REASON_TEXT: Partial<Record<ConfirmReason, string>> = {
  'no-label': 'No EXP or BEST BEFORE label was found next to this date.',
  'multiple-dates': 'More than one date was found, so the latest one was picked.',
  'month-only': 'Only a month is printed. The item will expire at the end of that month.',
  'in-past': 'This date has already passed.',
  'sell-by': 'This is a sell-by date, which can be earlier than the real expiry date.',
  'no-year': 'No year is printed, so the next time this date comes round was used. Check the year.',
};

export type SaveInput = { name: string; category: CategoryId; date: Interpretation };

type Props = {
  // A scanned detection, or null when the user enters the date by hand.
  detection: Detection | null;
  initialCategory: CategoryId;
  layout: 'bottom' | 'side';
  maxHeight: number;
  bottomInset: number;
  secondaryLabel: string;
  onAdd: (input: SaveInput) => Promise<void>;
  onSecondary: () => void;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

export function ResultSheet({ detection, initialCategory, layout, maxHeight, bottomInset, secondaryLabel, onAdd, onSecondary }: Props) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  const readings = useMemo(() => (detection ? [detection.primary, ...detection.alternatives] : []), [detection]);
  const ambiguous = readings.length > 1;
  // For an ambiguous day/month order the user must pick a reading; nothing is preselected.
  const [picked, setPicked] = useState<number | null>(ambiguous ? null : 0);
  const [edited, setEdited] = useState<Interpretation | null>(detection ? null : { iso: isoToday(new Date()), precision: 'day' });
  const [editing, setEditing] = useState(!detection);
  // Dates that are not high confidence need an explicit "this is the expiry date".
  const needsTick = !!detection && detection.confidence === 'medium' && detection.reasons.some((r) => r !== 'ambiguous-order' && r !== 'month-only');
  const [ticked, setTicked] = useState(false);
  const [save, setSave] = useState<SaveState>('idle');
  // A ref, not state, so a second tap in the same frame is ignored too.
  const busy = useRef(false);
  const mounted = useRef(true);
  useEffect(
    () => () => {
      mounted.current = false;
    },
    [],
  );

  const date: Interpretation | null = edited ?? (picked !== null ? readings[picked] : null);
  const confirmed = !!date && (!!edited || !needsTick || ticked);
  const canSave = confirmed && save !== 'saving' && save !== 'saved';

  const submit = async () => {
    if (!canSave || !date || busy.current) return;
    busy.current = true;
    setSave('saving');
    try {
      await onAdd({ name: name.trim() || `${CATEGORY_NAMES[category]} item`, category, date });
      if (mounted.current) setSave('saved');
    } catch {
      busy.current = false;
      if (mounted.current) setSave('error');
    }
  };

  const reasons = detection ? detection.reasons.filter((r) => REASON_TEXT[r]) : [];
  const dateTitle = !detection ? 'Expiry date' : edited ? 'Expiry date (edited)' : confirmed ? 'Detected expiry date' : 'Check the expiry date';

  return (
    <View style={[s.sheet, layout === 'side' ? s.sheetSide : s.sheetBottom, { maxHeight, paddingBottom: Math.max(bottomInset, 14) }]}>
      {layout === 'bottom' && <View style={s.handle} />}
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} keyboardShouldPersistTaps="handled" bounces={false}>
        <View style={s.productRow}>
          <View style={s.productArt}>{categoryArt(category, 34)}</View>
          <View style={{ flex: 1 }}>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Product name, e.g. Greek yogurt"
              placeholderTextColor={colors.textMuted}
              style={s.nameInput}
              returnKeyType="done"
              maxLength={80}
              accessibilityLabel="Product name"
            />
            <Text style={s.productSub} numberOfLines={1}>
              {CATEGORY_NAMES[category]}
              {date ? `  •  ${expiryPhrase(date.iso)}` : ''}
            </Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
          {CATEGORY_IDS.map((id) => {
            const on = id === category;
            return (
              <Pressable
                key={id}
                onPress={() => setCategory(id)}
                style={[s.chip, on && s.chipOn]}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
              >
                <Text style={[s.chipText, on && s.chipTextOn]}>{CATEGORY_NAMES[id]}</Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={s.divider} />

        <Pressable
          onPress={() => setEditing((e) => !e)}
          style={s.dateRow}
          accessibilityRole="button"
          accessibilityLabel={`${dateTitle}: ${date ? formatDate(date) : 'not chosen'}. Edit date`}
        >
          <View style={[s.calendar, !confirmed && s.calendarWarn]}>
            <Ionicons name="calendar" size={22} color={confirmed ? colors.mint : colors.amber} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.dateLabel, !confirmed && { color: colors.amberText }]}>{dateTitle}</Text>
            <Text style={s.dateValue}>{date ? formatDate(date) : 'Choose the date below'}</Text>
          </View>
          <Ionicons name={editing ? 'chevron-down' : 'chevron-forward'} size={20} color={colors.textMuted} />
        </Pressable>

        {ambiguous && !edited && (
          <View style={s.block}>
            <Text style={s.question}>The day and month could be either way round. Which is it?</Text>
            <View style={s.choiceRow}>
              {readings.map((r, i) => (
                <Pressable
                  key={r.iso}
                  onPress={() => setPicked(i)}
                  style={[s.choice, picked === i && s.choiceOn]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: picked === i }}
                >
                  <Text style={[s.choiceText, picked === i && s.chipTextOn]}>{formatDate(r)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {!edited && reasons.length > 0 && (
          <View style={s.block}>
            {reasons.map((r) => (
              <View key={r} style={s.reason}>
                <Ionicons name="information-circle-outline" size={16} color={colors.amberText} />
                <Text style={s.reasonText}>{REASON_TEXT[r]}</Text>
              </View>
            ))}
            {detection && <Text style={s.raw}>Read on the label: “{detection.labelText ? `${detection.labelText} ` : ''}{detection.raw}”</Text>}
          </View>
        )}

        {editing && (
          <DateEditor
            value={date ?? readings[0] ?? { iso: isoToday(new Date()), precision: 'day' }}
            onChange={(iso) => setEdited({ iso, precision: 'day' })}
          />
        )}
      </ScrollView>

      {needsTick && !edited && (
        <Pressable
          onPress={() => setTicked((t) => !t)}
          style={s.tickRow}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: ticked }}
        >
          <Ionicons name={ticked ? 'checkbox' : 'square-outline'} size={22} color={ticked ? colors.mint : colors.textMuted} />
          <Text style={s.tickText}>Yes, this is the expiry date</Text>
        </Pressable>
      )}

      {save === 'error' && <Text style={s.error}>Couldn't save the item. Please try again.</Text>}
      <Pressable
        onPress={submit}
        disabled={!canSave}
        style={({ pressed }) => [s.primary, !canSave && save !== 'saved' && s.disabled, pressed && s.pressed]}
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSave, busy: save === 'saving' }}
        accessibilityLabel={save === 'saved' ? 'Item added' : 'Add item'}
      >
        {save === 'saving' ? (
          <ActivityIndicator color={colors.scanInk} />
        ) : save === 'saved' ? (
          <View style={s.savedRow}>
            <Ionicons name="checkmark-circle" size={20} color={colors.scanInk} />
            <Text style={s.primaryText}>Added</Text>
          </View>
        ) : (
          <Text style={s.primaryText}>Add item</Text>
        )}
      </Pressable>
      <Pressable
        onPress={onSecondary}
        disabled={save === 'saving' || save === 'saved'}
        style={({ pressed }) => [s.secondary, pressed && s.pressed]}
        accessibilityRole="button"
      >
        <Text style={s.secondaryText}>{secondaryLabel}</Text>
      </Pressable>
    </View>
  );
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// Day, month and year steppers. Works the same on iOS, Android and web without a native picker.
function DateEditor({ value, onChange }: { value: Interpretation; onChange: (iso: string) => void }) {
  const [y, m, d] = value.iso.split('-').map(Number);
  const set = (year: number, month: number, day: number) => {
    const max = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const dd = Math.min(Math.max(day, 1), max);
    onChange(`${year}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
  };
  const wrap = (n: number, lo: number, hi: number) => (n < lo ? hi : n > hi ? lo : n);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const thisYear = new Date().getFullYear();
  return (
    <View style={s.editor}>
      <Stepper label="Day" value={String(d)} onDown={() => set(y, m, wrap(d - 1, 1, daysInMonth))} onUp={() => set(y, m, wrap(d + 1, 1, daysInMonth))} />
      <Stepper label="Month" value={MONTHS[m - 1]} onDown={() => set(y, wrap(m - 1, 1, 12), d)} onUp={() => set(y, wrap(m + 1, 1, 12), d)} />
      <Stepper
        label="Year"
        value={String(y)}
        onDown={() => set(Math.max(y - 1, thisYear - 5), m, d)}
        onUp={() => set(Math.min(y + 1, thisYear + 15), m, d)}
      />
    </View>
  );
}

function Stepper({ label, value, onDown, onUp }: { label: string; value: string; onDown: () => void; onUp: () => void }) {
  return (
    <View style={s.stepper} accessibilityLabel={`${label} ${value}`}>
      <Pressable onPress={onDown} hitSlop={6} style={s.stepBtn} accessibilityRole="button" accessibilityLabel={`Previous ${label.toLowerCase()}`}>
        <Ionicons name="remove" size={18} color={colors.text} />
      </Pressable>
      <View style={s.stepValue}>
        <Text style={s.stepLabel}>{label}</Text>
        <Text style={s.stepText}>{value}</Text>
      </View>
      <Pressable onPress={onUp} hitSlop={6} style={s.stepBtn} accessibilityRole="button" accessibilityLabel={`Next ${label.toLowerCase()}`}>
        <Ionicons name="add" size={18} color={colors.text} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  sheet: { backgroundColor: '#081316', borderColor: colors.surfaceBorder, paddingHorizontal: 18, paddingTop: 10 },
  sheetBottom: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: StyleSheet.hairlineWidth },
  sheetSide: { borderTopLeftRadius: 24, borderBottomLeftRadius: 24, borderLeftWidth: StyleSheet.hairlineWidth, paddingTop: 18 },
  handle: { alignSelf: 'center', width: 38, height: 4, borderRadius: 2, backgroundColor: '#3A4A50', marginBottom: 12 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingBottom: 10 },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  productArt: { width: 58, height: 58, borderRadius: 16, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  nameInput: { color: colors.text, fontSize: 16.5, fontWeight: '600', paddingVertical: 4, paddingHorizontal: 0 },
  productSub: { color: colors.textMuted, fontSize: 13.5, marginTop: 2 },
  chips: { gap: 8, paddingTop: 12 },
  chip: { height: 32, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.surfaceBorder, justifyContent: 'center' },
  chipOn: { borderColor: colors.mint, backgroundColor: 'rgba(46,232,182,0.10)' },
  chipText: { color: colors.textMuted, fontSize: 13.5, fontWeight: '500' },
  chipTextOn: { color: colors.mint, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceBorder, marginTop: 14 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 },
  calendar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0D2E28', alignItems: 'center', justifyContent: 'center' },
  calendarWarn: { backgroundColor: '#3D2B0E' },
  dateLabel: { color: colors.textMuted, fontSize: 13.5 },
  dateValue: { color: colors.text, fontSize: 21, fontWeight: '700', letterSpacing: -0.3, marginTop: 2 },
  block: { gap: 8, paddingBottom: 10 },
  question: { color: colors.text, fontSize: 14, fontWeight: '500' },
  choiceRow: { flexDirection: 'row', gap: 10 },
  choice: { flex: 1, height: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, alignItems: 'center', justifyContent: 'center' },
  choiceOn: { borderColor: colors.mint, backgroundColor: 'rgba(46,232,182,0.10)' },
  choiceText: { color: colors.text, fontSize: 15, fontWeight: '500' },
  reason: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  reasonText: { color: colors.amberText, fontSize: 13, flex: 1, lineHeight: 18 },
  raw: { color: colors.textMuted, fontSize: 12.5 },
  tickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 2, paddingBottom: 10 },
  tickText: { color: colors.text, fontSize: 14.5, fontWeight: '500' },
  editor: { flexDirection: 'row', gap: 8, paddingTop: 4, paddingBottom: 6 },
  stepper: { flex: 1, flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, height: 52 },
  stepBtn: { width: 30, height: '100%', alignItems: 'center', justifyContent: 'center' },
  stepValue: { flex: 1, alignItems: 'center' },
  stepLabel: { color: colors.textMuted, fontSize: 11 },
  stepText: { color: colors.text, fontSize: 15.5, fontWeight: '600' },
  error: { color: colors.red, fontSize: 13, textAlign: 'center', marginBottom: 6 },
  primary: { height: 52, borderRadius: radius.pill, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  primaryText: { color: colors.scanInk, fontSize: 16.5, fontWeight: '700' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  disabled: { opacity: 0.45 },
  secondary: { height: 50, borderRadius: radius.pill, borderWidth: 1, borderColor: '#2C3B40', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: colors.text, fontSize: 15.5, fontWeight: '500' },
  pressed: { opacity: 0.8 },
});
