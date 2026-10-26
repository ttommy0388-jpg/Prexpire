import { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { ItemsScreen } from './src/screens/ItemsScreen';
import { RemindersScreen } from './src/screens/RemindersScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { BottomNav, type TabId } from './src/components/HomeComponents';
import { CATEGORY_IDS, ItemsProvider, useItems, type CategoryId, type Item } from './src/items';
import { SettingsProvider, useSettings } from './src/settings';
import { remindersDue } from './src/preferences';
import { useLayout } from './src/layout';

type Route = { tab: TabId; category?: CategoryId } | { tab: 'scan' };

const TABS: TabId[] = ['home', 'items', 'reminders', 'settings'];
const WEB = Platform.OS === 'web';

// On the web the open tab is kept in the address (#settings), so a refresh stays on it.
function routeFromHash(): Route {
  if (!WEB || typeof window === 'undefined') return { tab: 'home' };
  const [tab, category] = window.location.hash.replace(/^#\/?/, '').split('/');
  if (!TABS.includes(tab as TabId)) return { tab: 'home' };
  return { tab: tab as TabId, category: CATEGORY_IDS.includes(category as CategoryId) ? (category as CategoryId) : undefined };
}

function writeHash(route: Route) {
  if (!WEB || typeof window === 'undefined' || route.tab === 'scan') return;
  const hash = route.tab === 'home' ? '' : `#${route.tab}${'category' in route && route.category ? `/${route.category}` : ''}`;
  try {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${hash}`);
  } catch {
    // Sandboxed frames can refuse history changes; the tab still opens.
  }
}

// Keyboard focus rings for the web build (react-native-web leaves them to the browser).
function useFocusStyles() {
  useEffect(() => {
    if (!WEB || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent =
      '[role=button]:focus-visible,[role=radio]:focus-visible,[role=switch]:focus-visible,[role=tab]:focus-visible,[role=link]:focus-visible,input:focus-visible{outline:2px solid #2EE8B6;outline-offset:2px;border-radius:10px}';
    document.head.appendChild(style);
    return () => style.remove();
  }, []);
}

function Shell() {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const { items } = useItems();
  const { settings, formatDate } = useSettings();
  const [route, setRoute] = useState<Route>(routeFromHash);
  const [lastTab, setLastTab] = useState<TabId>(route.tab === 'scan' ? 'home' : route.tab);
  const [notice, setNotice] = useState<string | null>(null);
  useFocusStyles();

  useEffect(() => writeHash(route), [route]);

  const badge = useMemo(
    () => (settings.reminders ? remindersDue(items, settings.reminderLead).length : 0),
    [items, settings.reminders, settings.reminderLead],
  );

  const onNavigate = useCallback((to: string) => {
    if (to === 'scan') return setRoute({ tab: 'scan' });
    if (to.startsWith('tab:')) {
      const tab = to.slice(4) as TabId;
      if (TABS.includes(tab)) {
        setRoute({ tab });
        setLastTab(tab);
      }
      return;
    }
    if (to.startsWith('category:')) {
      const category = to.slice(9) as CategoryId;
      if (CATEGORY_IDS.includes(category)) {
        setRoute({ tab: 'items', category });
        setLastTab('items');
      }
    }
  }, []);
  const closeScanner = useCallback(() => setRoute({ tab: lastTab }), [lastTab]);
  const onSaved = useCallback(
    (item: Item) => {
      setNotice(`${item.name} added · expires ${formatDate(item.expiresOn, item.datePrecision)}`);
      setRoute({ tab: 'home' });
      setLastTab('home');
    },
    [formatDate],
  );
  const clearNotice = useCallback(() => setNotice(null), []);

  // The scanner replaces the tabs (and the bottom nav) while open, so the camera
  // is only mounted, and only running, while the user is scanning.
  if (route.tab === 'scan') return <ScannerScreen onClose={closeScanner} onSaved={onSaved} />;

  const screen =
    route.tab === 'items' ? (
      <ItemsScreen key={route.category ?? 'all'} badge={badge} category={route.category} onNavigate={onNavigate} />
    ) : route.tab === 'reminders' ? (
      <RemindersScreen badge={badge} onNavigate={onNavigate} />
    ) : route.tab === 'settings' ? (
      <SettingsScreen badge={badge} onNavigate={onNavigate} />
    ) : (
      <HomeScreen badge={badge} onNavigate={onNavigate} notice={notice} onNoticeDone={clearNotice} />
    );

  return (
    <>
      {screen}
      <BottomNav
        active={route.tab}
        badge={badge}
        insets={insets}
        maxWidth={layout.mode === 'phone' ? 560 : 520}
        onTab={(id) => onNavigate(`tab:${id}`)}
        onScan={() => onNavigate('scan')}
      />
    </>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <SettingsProvider>
        <ItemsProvider>
          <StatusBar style="light" />
          <View style={{ flex: 1, backgroundColor: '#050D10' }}>
            <Shell />
          </View>
        </ItemsProvider>
      </SettingsProvider>
    </SafeAreaProvider>
  );
}
