import { useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { colors, space } from '../theme';
import { categories, upcoming, type ArtKey, type UpcomingItem } from '../data';
import { AttentionCard, BottomNav, CategoryTile, ExpiryRow, Header, SectionHeader, type TabId } from '../components/HomeComponents';
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
  const { width } = useWindowDimensions();
  const [activeTab, setActiveTab] = useState<TabId>('home');

  const go = (route: string) => {
    Haptics.selectionAsync().catch(() => {});
    onNavigate?.(route);
  };

  const contentWidth = Math.min(width, 560) - 2 * space.gutter;
  const tileWidth = Math.floor((contentWidth - 2 * space.gridGap) / 3);
  const compact = tileWidth < 124;
  const addTile = categories.find((c) => c.tint === 'add');
  const tiles = [...categories.filter((c) => c.tint !== 'add').slice(0, 5), ...(addTile ? [addTile] : [])];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <Header badge={3} onMenu={() => go('menu')} onBell={() => go('notifications')} />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 100 + Math.max(insets.bottom - 6, 12) }}
        showsVerticalScrollIndicator={false}
      >
        <AttentionCard title="3 items need attention" subtitle={['2 expired', '1 expiring soon']} onPress={() => go('attention')} />

        <SectionHeader title="Your categories" action="See all" onAction={() => go('categories')} />
        <View style={styles.grid}>
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

        <SectionHeader title="Coming up next" action="View all" onAction={() => go('items')} />
        <View style={{ gap: 7 }}>
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
      </ScrollView>
      <BottomNav
        active={activeTab}
        badge={3}
        bottomInset={insets.bottom}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.gridGap,
    rowGap: space.gridGap,
    paddingHorizontal: space.gutter,
  },
});
