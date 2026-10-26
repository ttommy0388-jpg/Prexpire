import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, space } from '../theme';
import { categories, type ArtKey } from '../data';
import { useItems } from '../items';
import { useSettings } from '../settings';
import { expiryStatus } from '../preferences';
import { AttentionCard, CategoryTile, Header, NAV_HEIGHT, navOffset, SectionHeader } from '../components/HomeComponents';
import { ItemRow } from '../components/ItemRow';
import { gridFor, useLayout } from '../layout';
import { AddArt, AppleArt, CapsuleArt, HouseArt, JarArt, PumpBottleArt } from '../components/Art';

function categoryArt(art: ArtKey, size: number) {
  switch (art) {
    case 'apple':
      return <AppleArt size={size} />;
    case 'capsule':
      return <CapsuleArt size={size} />;
    case 'house':
      return <HouseArt size={0.95 * size} />;
    case 'pump':
      return <PumpBottleArt size={size} />;
    case 'jar':
      return <JarArt size={size} />;
    default:
      return <AddArt size={0.82 * size} />;
  }
}

// How many items "Coming up next" shows, soonest first.
const UPCOMING_COUNT = 4;

type HomeProps = {
  onNavigate?: (route: string) => void;
  // Reminders due, shown on the bell.
  badge: number;
  // A short confirmation, e.g. after an item was added from the scanner.
  notice?: string | null;
  onNoticeDone?: () => void;
};

export function HomeScreen({ onNavigate, badge, notice, onNoticeDone }: HomeProps) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { items, saved } = useItems();
  const { settings, motion } = useSettings();
  const { warningDays, showExpired, showSamples } = settings;
  const upcoming = useMemo(
    () =>
      items
        .filter((i) => showExpired || expiryStatus(i.expiresOn, warningDays) !== 'expired')
        .sort((a, b) => a.expiresOn.localeCompare(b.expiresOn))
        .slice(0, UPCOMING_COUNT),
    [items, showExpired, warningDays],
  );
  // Expired items, and items expiring within the warning period chosen in Settings.
  const attention = useMemo(() => {
    const statuses = items.map((i) => ({ category: i.category, status: expiryStatus(i.expiresOn, warningDays) }));
    return {
      expired: statuses.filter((x) => x.status === 'expired').length,
      soon: statuses.filter((x) => x.status === 'soon').length,
      byCategory: (id: string) => statuses.filter((x) => x.category === id && x.status !== 'ok').length,
    };
  }, [items, warningDays]);

  const go = (route: string) => {
    Haptics.selectionAsync().catch(() => {});
    onNavigate?.(route);
  };

  const { mode, gutter } = layout;
  const split = mode === 'split';
  const gridGap = mode === 'phone' ? space.gridGap : 12;
  const columnGap = layout.width >= 900 ? 28 : 18;

  // Width of the content area after safe-area insets, max width and gutters.
  const usable = layout.width - insets.left - insets.right;
  const bodyWidth = Math.min(usable, layout.maxContentWidth) - 2 * gutter;
  const leftWidth = split ? Math.min(Math.round((bodyWidth - columnGap) * layout.leftFraction), 560) : bodyWidth;

  // The grid is measured once laid out (split view, multitasking); the estimate covers the first frame.
  const [measuredGrid, setMeasuredGrid] = useState(0);
  const onGridLayout = (e: LayoutChangeEvent) => {
    const w = Math.round(e.nativeEvent.layout.width);
    if (w !== measuredGrid) setMeasuredGrid(w);
  };
  const gridWidth = measuredGrid || leftWidth;
  const { tileWidth } = gridFor(gridWidth, gridGap, 100);
  const compact = tileWidth < 112 || layout.short;

  const addTile = categories.find((c) => c.tint === 'add');
  const tiles = [...categories.filter((c) => c.tint !== 'add').slice(0, 5), ...(addTile ? [addTile] : [])];

  const bottomClearance = NAV_HEIGHT + navOffset(insets.bottom) + 16;

  const needAttention = attention.expired + attention.soon;
  const summary =
    needAttention > 0 ? (
      <AttentionCard
        title={needAttention === 1 ? '1 item needs attention' : `${needAttention} items need attention`}
        subtitle={[
          ...(attention.expired ? [`${attention.expired} expired`] : []),
          ...(attention.soon ? [`${attention.soon} expiring soon`] : []),
        ]}
        onPress={() => go('tab:reminders')}
      />
    ) : null;

  const categorySection = (
    <>
      <SectionHeader title="Your categories" action="See all" onAction={() => go('tab:items')} />
      <View style={[styles.grid, { rowGap: gridGap }]} onLayout={onGridLayout}>
        {tiles.map((c) => (
          <CategoryTile
            key={c.id}
            tint={c.tint}
            width={tileWidth}
            name={c.name}
            sub={c.count === undefined ? c.sub : `${(showSamples ? c.count : 0) + saved.filter((i) => i.category === c.id).length} items`}
            status={c.count === undefined ? undefined : tileStatus(attention.byCategory(c.id))}
            art={categoryArt(c.art, compact ? 56 : 64)}
            compact={compact}
            onPress={() => go(c.tint === 'add' ? 'tab:settings' : `category:${c.id}`)}
          />
        ))}
      </View>
    </>
  );

  const upcomingSection = (first: boolean) => (
    <>
      <SectionHeader title="Coming up next" action="View all" onAction={() => go('tab:items')} first={first} />
      <View style={[styles.list, settings.compact && styles.listCompact]}>
        {upcoming.map((item) => (
          <ItemRow key={item.id} item={item} onPress={() => go('tab:items')} />
        ))}
        {upcoming.length === 0 && <Text style={styles.empty}>Nothing coming up. Scan a label to add an item.</Text>}
      </View>
    </>
  );

  const frame = { maxWidth: layout.maxContentWidth, paddingHorizontal: gutter };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.frame, frame]}>
        <Header badge={badge} gutter={0} onMenu={() => go('tab:settings')} onBell={() => go('tab:reminders')} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomClearance }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.frame, frame]}>
          {split ? (
            <View style={[styles.columns, { columnGap }]}>
              <View style={{ width: leftWidth }}>
                {summary}
                {categorySection}
              </View>
              <View style={styles.rightColumn}>{upcomingSection(true)}</View>
            </View>
          ) : (
            <>
              {summary}
              {categorySection}
              {upcomingSection(false)}
            </>
          )}
        </View>
      </ScrollView>
      {notice && <Toast key={notice} text={notice} bottom={bottomClearance} motion={motion} onDone={onNoticeDone} />}
    </View>
  );
}

function tileStatus(n: number) {
  return n > 0 ? { label: `${n} expiring`, tone: 'amber' as const } : { label: 'All good', tone: 'green' as const };
}

function Toast({ text, bottom, motion, onDone }: { text: string; bottom: number; motion: boolean; onDone?: () => void }) {
  const opacity = useRef(new Animated.Value(motion ? 0 : 1)).current;
  useEffect(() => {
    // With animations off the toast appears and disappears without fading.
    const fade = motion ? 200 : 0;
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: fade, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(opacity, { toValue: 0, duration: fade, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onDone?.());
    return () => anim.stop();
  }, [opacity, motion, onDone]);
  return (
    <Animated.View pointerEvents="none" style={[styles.toastWrap, { bottom, opacity }]} accessibilityLiveRegion="polite">
      <View style={styles.toast}>
        <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
        <Text style={styles.toastText} numberOfLines={2}>
          {text}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  frame: { width: '100%', alignSelf: 'center' },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  columns: { flexDirection: 'row', alignItems: 'flex-start' },
  rightColumn: { flex: 1, minWidth: 0 },
  // space-between absorbs the rounding left over from whole-pixel tile widths.
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  // 8px between "Coming up next" rows.
  list: { gap: 8 },
  listCompact: { gap: 6 },
  empty: { color: colors.textMuted, fontSize: 14, paddingVertical: 12 },
  toastWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: 460,
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 999,
    backgroundColor: '#0D2E28',
    borderWidth: 1,
    borderColor: 'rgba(46,232,182,0.45)',
  },
  toastText: { color: colors.text, fontSize: 14, fontWeight: '500', flexShrink: 1 },
});
