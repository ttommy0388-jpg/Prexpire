import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { PrexpireMark } from '../components/Art';

const wordmark = require('../../assets/wordmark.png');

export function LaunchScreen({ onDone, hold = 1400 }: { onDone: () => void; hold?: number }) {
  const enter = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const { height } = useWindowDimensions();
  // Shrink the mark on short screens (phone landscape) so the stack stays centered and unclipped.
  const markSize = height < 500 ? 112 : 150;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(enter, { toValue: 1, duration: 520, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.delay(hold),
      Animated.timing(fade, { toValue: 0, duration: 260, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start(({ finished }) => finished && onDone());
  }, [enter, fade, hold, onDone]);

  const scale = enter.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] });

  return (
    <Animated.View style={[styles.root, { opacity: fade }]}>
      <View style={[styles.shape, { top: -120, left: -150 }]} />
      <View style={[styles.shape, { bottom: -150, right: -140 }]} />
      <Animated.View style={{ alignItems: 'center', opacity: enter, transform: [{ scale }] }}>
        <PrexpireMark size={markSize} />
        <Image source={wordmark} style={styles.wordmark} resizeMode="contain" accessibilityLabel="Prexpire" />
        <Text style={styles.tagline}>Know before it expires.</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#061411',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  shape: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 70,
    backgroundColor: '#0F2E27',
    opacity: 0.7,
    transform: [{ rotate: '40deg' }],
  },
  wordmark: { width: 196, height: 50, marginTop: 14 },
  tagline: { color: '#A9B8B3', fontSize: 16, marginTop: 18, letterSpacing: 0.2 },
});
