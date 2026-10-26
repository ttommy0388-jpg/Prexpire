import type { ReactNode } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, pills, radius, space, tints, type, type Tint, type Tone } from '../theme';

const wordmark = require('../../assets/wordmark.png');

export function Header({ badge, gutter = space.gutter, onMenu, onBell }: { badge: number; gutter?: number; onMenu: () => void; onBell: () => void }) {
  return (
    <View style={[s.header, { paddingHorizontal: gutter }]}>
      <Pressable onPress={onMenu} hitSlop={10} accessibilityRole="button" accessibilityLabel="Menu" style={s.headerBtn}>
        <Ionicons name="menu" size={30} color={colors.text} />
      </Pressable>
      <Image source={wordmark} style={s.wordmark} resizeMode="contain" accessibilityLabel="Prexpire" />
      <Pressable onPress={onBell} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${badge} notifications`} style={s.headerBtn}>
        <Ionicons name="notifications-outline" size={26} color={colors.text} />
        {badge > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>{badge}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
}

export function AttentionCard({ title, subtitle, onPress }: { title: string; subtitle: string[]; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.alert, pressed && s.pressed]}>
      <View style={s.alertIcon}>
        <Ionicons name="warning-outline" size={25} color={colors.amber} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={s.alertTitle}>{title}</Text>
        <Text style={s.alertSub}>{subtitle.join('  •  ')}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </Pressable>
  );
}

type SectionHeaderProps = { title: string; action: string; first?: boolean; onAction: () => void };

export function SectionHeader({ title, action, first = false, onAction }: SectionHeaderProps) {
  return (
    <View style={[s.section, first && s.sectionFirst]}>
      <Text style={s.sectionTitle}>{title}</Text>
      <Pressable onPress={onAction} hitSlop={8} style={s.sectionAction}>
        <Text style={s.sectionLink}>{action}</Text>
        <Ionicons name="chevron-forward" size={17} color={colors.mint} />
      </Pressable>
    </View>
  );
}

type CategoryTileProps = {
  tint: Tint;
  art: ReactNode;
  name: string;
  sub: string;
  status?: { label: string; tone: Tone };
  width: number;
  compact?: boolean;
  onPress: () => void;
};

export function CategoryTile({ tint, art, name, sub, status, width, compact = false, onPress }: CategoryTileProps) {
  const t = tints[tint];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={name} style={({ pressed }) => [{ width }, pressed && s.pressed]}>
      <LinearGradient
        colors={[t.top, t.bottom]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[s.tile, compact && s.tileCompact, { borderColor: t.border }]}
      >
        <View style={[s.tileArt, compact && s.tileArtCompact, !status && s.tileArtTight]}>{art}</View>
        {/* Tiles without a status line (Add category) have room for a two-line name on narrow tiles. */}
        <Text
          style={[s.tileName, compact && s.tileNameCompact]}
          numberOfLines={status ? 1 : 2}
          adjustsFontSizeToFit={!!status}
          minimumFontScale={0.85}
        >
          {name}
        </Text>
        <Text style={[s.tileSub, compact && s.textCompact]} numberOfLines={1}>
          {sub}
        </Text>
        {status ? (
          <View style={s.status}>
            <View style={[s.dot, { backgroundColor: status.tone === 'amber' ? colors.amber : colors.green }]} />
            <Text
              style={[s.statusText, compact && s.textCompact, { color: status.tone === 'amber' ? colors.amberText : colors.green }]}
              numberOfLines={1}
            >
              {status.label}
            </Text>
          </View>
        ) : (
          <View style={s.statusSpacer} />
        )}
      </LinearGradient>
    </Pressable>
  );
}

type ExpiryRowProps = { art: ReactNode; title: string; sub: string[]; pill: string; tone: Tone; onPress: () => void };

export function ExpiryRow({ art, title, sub, pill, tone, onPress }: ExpiryRowProps) {
  const p = pills[tone];
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [s.row, pressed && s.pressed]}>
      <View style={s.rowIcon}>{art}</View>
      <View style={{ flex: 1 }}>
        <Text style={s.rowTitle} numberOfLines={1}>
          {title}
        </Text>
        <Text style={s.rowSub} numberOfLines={2}>
          {sub.join('  •  ')}
        </Text>
      </View>
      <View style={[s.pill, { backgroundColor: p.bg, borderColor: p.border }]}>
        <Text style={[s.pillText, { color: p.text }]}>{pill}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} style={{ marginLeft: 2 }} />
    </Pressable>
  );
}

export type TabId = 'home' | 'items' | 'reminders' | 'settings';

const tabs: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'home', label: 'Home', icon: 'home-outline', iconOn: 'home' },
  { id: 'items', label: 'Lists', icon: 'list', iconOn: 'list' },
  { id: 'reminders', label: 'Reminders', icon: 'notifications-outline', iconOn: 'notifications' },
  { id: 'settings', label: 'Settings', icon: 'settings-sharp', iconOn: 'settings-sharp' },
];

type BottomNavProps = {
  active: TabId;
  badge: number;
  insets: { bottom: number; left: number; right: number };
  maxWidth?: number;
  onTab: (id: TabId) => void;
  onScan: () => void;
};

// Distance from the bottom edge to the nav pill, and the space content must leave for it.
export const navOffset = (bottomInset: number) => Math.max(bottomInset - 6, 12);
export const NAV_HEIGHT = 68;

export function BottomNav({ active, badge, insets, maxWidth = 560, onTab, onScan }: BottomNavProps) {
  // Narrow phones give the five tabs a little more room so labels are not clipped.
  const narrow = useWindowDimensions().width < 360;
  const sideMargin = narrow ? 8 : 16;
  const renderTab = (tab: (typeof tabs)[number]) => {
    const selected = tab.id === active;
    return (
      <Pressable
        key={tab.id}
        onPress={() => onTab(tab.id)}
        style={s.tab}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        accessibilityLabel={tab.label}
      >
        <View>
          <Ionicons name={selected ? tab.iconOn : tab.icon} size={24} color={selected ? colors.mint : colors.textMuted} />
          {tab.id === 'reminders' && badge > 0 && (
            <View style={[s.badge, { top: -5, right: -9 }]}>
              <Text style={s.badgeText}>{badge}</Text>
            </View>
          )}
        </View>
        <Text
          style={[s.tabLabel, narrow && s.tabLabelNarrow, { color: selected ? colors.mint : colors.textMuted }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.85}
        >
          {tab.label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      pointerEvents="box-none"
      style={[s.navWrap, { bottom: navOffset(insets.bottom), left: sideMargin + insets.left, right: sideMargin + insets.right }]}
    >
      <View style={[s.navShadow, { maxWidth }]}>
        <View style={[s.nav, s.navFallback]}>
          {renderTab(tabs[0])}
          {renderTab(tabs[1])}
          <View style={s.tab}>
            <Pressable onPress={onScan} accessibilityRole="button" accessibilityLabel="Scan a label" style={({ pressed }) => [s.scan, pressed && s.pressed]}>
              <Ionicons name="scan-outline" size={26} color={colors.scanInk} />
              <View style={s.scanLine} />
            </Pressable>
          </View>
          {renderTab(tabs[2])}
          {renderTab(tabs[3])}
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  pressed: { opacity: 0.75, transform: [{ scale: 0.98 }] },
  header: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  wordmark: { width: 118, height: 30 },
  badge: {
    position: 'absolute',
    top: 2,
    right: 0,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.bg,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  alert: {
    marginTop: 4,
    minHeight: 58,
    paddingVertical: 7,
    borderRadius: radius.alert,
    borderWidth: 1,
    borderColor: '#5C4512',
    backgroundColor: '#231E11',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    paddingRight: 14,
    gap: 12,
  },
  alertIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#4A3811', alignItems: 'center', justifyContent: 'center' },
  alertTitle: { color: colors.text, ...type.alertTitle },
  alertSub: { color: colors.textMuted, ...type.body, marginTop: 2 },
  section: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 9,
  },
  sectionFirst: { marginTop: 4 },
  sectionTitle: { color: colors.text, ...type.title, flexShrink: 1 },
  sectionAction: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  sectionLink: { color: colors.mint, ...type.link },
  tile: { height: 156, borderRadius: radius.card, borderWidth: 1, overflow: 'hidden', alignItems: 'center', paddingHorizontal: 8, paddingTop: 12 },
  tileArt: { height: 68, width: '100%', alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  tileCompact: { height: 146, paddingHorizontal: 6, paddingTop: 10 },
  tileArtCompact: { height: 58, marginBottom: 6 },
  tileArtTight: { marginBottom: 2 },
  tileNameCompact: { fontSize: 14 },
  textCompact: { fontSize: 12.5 },
  tileName: { color: colors.text, ...type.tileName, textAlign: 'center' },
  tileSub: { color: colors.textMuted, ...type.body, textAlign: 'center', marginTop: 2 },
  status: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4, height: 18 },
  statusSpacer: { height: 18, marginTop: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { ...type.body, fontWeight: '500' },
  row: {
    minHeight: 53,
    paddingVertical: 6,
    borderRadius: radius.row,
    borderWidth: 1,
    borderColor: colors.surfaceBorder,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 9,
    paddingRight: 8,
    gap: 11,
  },
  rowIcon: { width: 44, height: 40, borderRadius: radius.tile, backgroundColor: colors.iconTile, alignItems: 'center', justifyContent: 'center' },
  rowTitle: { color: colors.text, ...type.rowTitle },
  rowSub: { color: colors.textMuted, ...type.rowSub, fontSize: 12.5, marginTop: 1 },
  pill: { height: 30, paddingHorizontal: 11, borderRadius: radius.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  pillText: { ...type.pill },
  navWrap: { position: 'absolute', alignItems: 'center' },
  navShadow: { width: '100%', borderRadius: 34, shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  nav: {
    height: 68,
    borderRadius: 34,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.10)',
  },
  // backdropFilter only applies on web; native gets the translucent fill.
  navFallback: { backgroundColor: 'rgba(12,24,27,0.72)', backdropFilter: 'blur(22px) saturate(1.4)' } as object,
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, height: 68 },
  tabLabel: { ...type.tab },
  tabLabelNarrow: { fontSize: 10.5 },
  scan: { width: 50, height: 50, borderRadius: 25, backgroundColor: colors.scan, alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', width: 16, height: 2.5, borderRadius: 2, backgroundColor: colors.scanInk },
});
