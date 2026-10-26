import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { ScannerScreen } from './src/screens/ScannerScreen';
import { ItemsProvider, type Item } from './src/items';
import { formatDate } from './src/scanner/dateParser';

type Route = 'home' | 'scan';

export default function App() {
  const [route, setRoute] = useState<Route>('home');
  const [notice, setNotice] = useState<string | null>(null);

  const onNavigate = useCallback((to: string) => {
    if (to === 'scan') setRoute('scan');
  }, []);
  const closeScanner = useCallback(() => setRoute('home'), []);
  const onSaved = useCallback((item: Item) => {
    const date = formatDate({ iso: item.expiresOn, precision: item.datePrecision });
    setNotice(`${item.name} added · expires ${date}`);
    setRoute('home');
  }, []);
  const clearNotice = useCallback(() => setNotice(null), []);

  return (
    <SafeAreaProvider>
      <ItemsProvider>
        <StatusBar style="light" />
        <View style={{ flex: 1, backgroundColor: '#050D10' }}>
          {/* The scanner replaces the home screen (and its bottom nav) while open, so the camera
              is only mounted, and only running, while the user is scanning. */}
          {route === 'scan' ? (
            <ScannerScreen onClose={closeScanner} onSaved={onSaved} />
          ) : (
            <HomeScreen onNavigate={onNavigate} notice={notice} onNoticeDone={clearNotice} />
          )}
        </View>
      </ItemsProvider>
    </SafeAreaProvider>
  );
}
