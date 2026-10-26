import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HomeScreen } from './src/screens/HomeScreen';
import { LaunchScreen } from './src/screens/LaunchScreen';

export default function App() {
  const [showLaunch, setShowLaunch] = useState(true);
  const onLaunchDone = useCallback(() => setShowLaunch(false), []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <View style={{ flex: 1, backgroundColor: '#050D10' }}>
        <HomeScreen />
        {showLaunch && <LaunchScreen onDone={onLaunchDone} />}
      </View>
    </SafeAreaProvider>
  );
}
