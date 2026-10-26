import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, space } from '../theme';
import { categories, type ArtKey } from '../data';
import { CATEGORY_NAMES, expiryPhrase, expiryPill, useItems, type Item } from '../items';
import { categoryArt as itemCategoryArt } from '../components/ResultSheet';
import {
  AttentionCard,
  BottomNav,
  CategoryTile,
  ExpiryRow,
  Header,
  NAV_HEIGHT,
  navOffset,
  SectionHeader,
  type TabId,
} from '../components/HomeComponents';
import { gridFor, useLayout } from '../layout';
import { AddArt, AppleArt, BreadArt, CapsuleArt, HouseArt, JarArt, MilkArt, PillArt, PumpBottleArt } from '../components/Art';

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

function itemArt(item: Item) {
  // The prototype's sample items keep their own illustrations.
  if (item.id === 'sample-oat') return <MilkArt size={30} />;
  if (item.id === 'sample-ibu') return <PillArt size={30} />;
  if (item.id === 'sample-bread') return <BreadArt size={30} />;
  return itemCategoryArt(item.category, 30);
}

// How many items "Coming up next" shows, soonest first.
const UPCOMING_COUNT = 4;

type HomeProps = {
  onNavigate?: (route: string) => void;
  // A short confirmation, e.g. after an item was added from the scanner.
  notice?: string | null;
  onNoticeDone?: () => void;
};

export function HomeScreen({ onNavigate, notice, onNoticeDone }: HomeProps) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const [activeTab, setActiveTab] = useState<TabId>('home');
  const { items, saved } = useItems();
  const upcoming = useMemo(() => [...items].sort((a, b) => a.expiresOn.localeCompare(b.expiresOn)).slice(0, UPCOMING_COUNT), [items]);

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

  const navMaxWidth = mode === 'phone' ? 560 : 520;
  const bottomClearance = NAV_HEIGHT + navOffset(insets.bottom) + 16;

  const summary = (
    <AttentionCard title="3 items need attention" subtitle={['2 expired', '1 expiring soon']} onPress={() => go('attention')} />
  );

  const categorySection = (
    <>
      <SectionHeader title="Your categories" action="See all" onAction={() => go('categories')} />
      <View style={[styles.grid, { rowGap: gridGap }]} onLayout={onGridLayout}>
        {tiles.map((c) => (
          <CategoryTile
            key={c.id}
            tint={c.tint}
            width={tileWidth}
            name={c.name}
            sub={c.count === undefined ? c.sub : `${c.count + saved.filter((i) => i.category === c.id).length} items`}
            status={c.status}
            art={categoryArt(c.art, compact ? 56 : 64)}
            compact={compact}
            onPress={() => go(`category:${c.id}`)}
          />
        ))}
      </View>
    </>
  );

  const upcomingSection = (first: boolean) => (
    <>
      <SectionHeader title="Coming up next" action="View all" onAction={() => go('items')} first={first} />
      <View style={styles.list}>
        {upcoming.map((item) => {
          const { pill, tone } = expiryPill(item.expiresOn);
          return (
            <ExpiryRow
              key={item.id}
              art={itemArt(item)}
              title={item.name}
              sub={[CATEGORY_NAMES[item.category], expiryPhrase(item.expiresOn)]}
              pill={pill}
              tone={tone}
              onPress={() => go(`item:${item.id}`)}
            />
          );
        })}
      </View>
    </>
  );

  const frame = { maxWidth: layout.maxContentWidth, paddingHorizontal: gutter };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[styles.frame, frame]}>
        <Header badge={3} gutter={0} onMenu={() => go('menu')} onBell={() => go('notifications')} />
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
      <BottomNav
        active={activeTab}
        badge={3}
        insets={insets}
        maxWidth={navMaxWidth}
        onTab={(id) => {
          setActiveTab(id);
          go(`tab:${id}`);
        }}
        onScan={() => go('scan')}
      />
      {notice && <Toast key={notice} text={notice} bottom={bottomClearance} onDone={onNoticeDone} />}
    </View>
  );
}

function Toast({ text, bottom, onDone }: { text: string; bottom: number; onDone?: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const anim = Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      Animated.delay(2600),
      Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]);
    anim.start(({ finished }) => finished && onDone?.());
    return () => anim.stop();
  }, [opacity, onDone]);
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
