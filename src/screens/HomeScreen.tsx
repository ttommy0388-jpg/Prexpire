import { useState } from 'react';
import { ScrollView, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, space } from '../theme';
import { categories, upcoming, type ArtKey, type UpcomingItem } from '../data';
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

function itemArt(art: UpcomingItem['art']) {
  if (art === 'milk') return <MilkArt size={30} />;
  if (art === 'pill') return <PillArt size={30} />;
  return <BreadArt size={30} />;
}

export function HomeScreen({ onNavigate }: { onNavigate?: (route: string) => void }) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const [activeTab, setActiveTab] = useState<TabId>('home');

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
            sub={c.sub}
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
        {upcoming.map((item) => (
          <ExpiryRow
            key={item.id}
            art={itemArt(item.art)}
            title={item.title}
            sub={item.sub}
            pill={item.pill}
            tone={item.tone}
            onPress={() => go(`item:${item.id}`)}
          />
        ))}
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
    </View>
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
});
