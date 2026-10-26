import { Children, Fragment, type ReactNode } from 'react';
import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Building blocks of the Settings page: a section heading, a card that groups rows,
// and rows with a tinted icon, a title, a short description and a control.

export type Accent = 'amber' | 'purple' | 'mint' | 'blue' | 'teal' | 'pink' | 'red';

export const accents: Record<Accent, string> = {
  amber: '#F5B83D',
  purple: '#A78BFA',
  mint: colors.mint,
  blue: '#60A5FA',
  teal: '#5EC4C9',
  pink: '#F472B6',
  red: '#F87171',
};

// Icon tiles: the accent at low opacity, so a page of them stays calm.
const tile = (hex: string) => ({ backgroundColor: `${hex}1F`, borderColor: `${hex}3D` });

type IconName = keyof typeof Ionicons.glyphMap;

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

// Groups rows in one card with hairline separators between them.
export function SettingsCard({ children, danger = false }: { children: ReactNode; danger?: boolean }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[s.card, danger && s.cardDanger]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={s.separator} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function IconTile({ icon, accent, size = 36 }: { icon: IconName; accent: Accent; size?: number }) {
  return (
    <View style={[s.icon, tile(accents[accent]), { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Ionicons name={icon} size={size * 0.52} color={accents[accent]} />
    </View>
  );
}

type RowProps = {
  icon: IconName;
  accent: Accent;
  title: string;
  description?: string;
  // Control on the right: a toggle, a value, a button.
  right?: ReactNode;
  // Content under the title, e.g. a set of options or a status note.
  below?: ReactNode;
  // Makes the whole row a button with a chevron.
  onPress?: () => void;
  titleColor?: string;
};

export function SettingRow({ icon, accent, title, description, right, below, onPress, titleColor }: RowProps) {
  const body = (
    <View style={s.row}>
      <IconTile icon={icon} accent={accent} />
      <View style={s.rowText}>
        <Text style={[s.rowTitle, titleColor ? { color: titleColor } : null]}>{title}</Text>
        {!!description && <Text style={s.rowDesc}>{description}</Text>}
      </View>
      {right}
      {onPress && <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />}
    </View>
  );
  return (
    <View style={s.rowWrap}>
      {onPress ? (
        <Pressable
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={title}
          accessibilityHint={description}
          style={({ pressed }) => [s.pressable, pressed && s.pressed]}
        >
          {body}
        </Pressable>
      ) : (
        body
      )}
      {below && <View style={s.below}>{below}</View>}
    </View>
  );
}

export function Toggle({ value, onChange, label, disabled = false }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Switch
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      accessibilityLabel={label}
      trackColor={{ false: '#2A3A40', true: '#1E8A6C' }}
      thumbColor={value ? '#E9FFF8' : '#C9D3D6'}
      {...({ activeThumbColor: '#E9FFF8' } as object)}
    />
  );
}

type Option<T> = { value: T; label: string; disabled?: boolean };

// A set of choices shown as chips: one is selected, like radio buttons.
export function Options<T extends string | number>({ label, options, value, onChange }: { label: string; options: Option<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.options} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={String(o.value)}
            onPress={() => !o.disabled && onChange(o.value)}
            disabled={o.disabled}
            accessibilityRole="radio"
            aria-checked={on}
            aria-disabled={!!o.disabled}
            accessibilityLabel={o.label}
            style={({ pressed }) => [s.chip, on && s.chipOn, o.disabled && s.chipDisabled, pressed && s.pressed]}
          >
            {on && <Ionicons name="checkmark" size={14} color={colors.mint} />}
            <Text style={[s.chipText, on && s.chipTextOn, o.disabled && s.chipTextDisabled]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// A short status line under a row: neutral, positive or a warning.
export function Note({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'warn' }) {
  const color = tone === 'ok' ? colors.mint : tone === 'warn' ? colors.amberText : colors.textMuted;
  const icon: IconName = tone === 'ok' ? 'checkmark-circle' : tone === 'warn' ? 'alert-circle' : 'information-circle-outline';
  return (
    <View style={s.note}>
      <Ionicons name={icon} size={15} color={color} style={{ marginTop: 1 }} />
      <Text style={[s.noteText, { color: tone === 'muted' ? colors.textMuted : color }]}>{children}</Text>
    </View>
  );
}

export function SmallButton({ label, onPress, icon, tone = 'neutral', disabled = false, accessibilityLabel }: { label: string; onPress: () => void; icon?: IconName; tone?: 'neutral' | 'mint' | 'danger'; disabled?: boolean; accessibilityLabel?: string }) {
  const color = tone === 'mint' ? colors.mint : tone === 'danger' ? accents.red : colors.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      aria-disabled={disabled}
      style={({ pressed }) => [s.button, tone === 'mint' && s.buttonMint, tone === 'danger' && s.buttonDanger, disabled && s.chipDisabled, pressed && s.pressed]}
    >
      {icon && <Ionicons name={icon} size={16} color={color} />}
      <Text style={[s.buttonText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 22 },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '600', letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 8, marginLeft: 4 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.surfaceBorder, overflow: 'hidden' },
  cardDanger: { borderColor: '#4A2328', backgroundColor: '#140F12' },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: '#22353A', marginLeft: 64 },
  rowWrap: { paddingVertical: 12, paddingHorizontal: 14 },
  pressable: { borderRadius: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 40 },
  icon: { alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  rowText: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 15.5, fontWeight: '600' },
  rowDesc: { color: colors.textMuted, fontSize: 13, marginTop: 2, lineHeight: 18 },
  below: { marginTop: 10, marginLeft: 50, gap: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#0F1E22',
  },
  chipOn: { borderColor: 'rgba(46,232,182,0.55)', backgroundColor: 'rgba(46,232,182,0.10)' },
  chipDisabled: { opacity: 0.45 },
  chipText: { color: colors.textMuted, fontSize: 13.5, fontWeight: '500' },
  chipTextOn: { color: colors.text, fontWeight: '600' },
  chipTextDisabled: { color: colors.textMuted },
  note: { flexDirection: 'row', gap: 6, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12.5, lineHeight: 17 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 36,
    paddingHorizontal: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: '#0F1E22',
  },
  buttonMint: { borderColor: 'rgba(46,232,182,0.45)', backgroundColor: 'rgba(46,232,182,0.08)' },
  buttonDanger: { borderColor: 'rgba(248,113,113,0.45)', backgroundColor: 'rgba(248,113,113,0.08)' },
  buttonText: { fontSize: 14, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
