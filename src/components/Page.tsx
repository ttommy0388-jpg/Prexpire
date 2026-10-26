import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useLayout } from '../layout';
import { Header, NAV_HEIGHT, navOffset } from './HomeComponents';

type Props = {
  title: string;
  subtitle?: string;
  badge: number;
  // Narrower than Home: lists and settings read better at a limited width.
  maxWidth?: number;
  onNavigate: (route: string) => void;
  children: ReactNode;
};

// The frame shared by the Items, Reminders and Settings tabs: the same brand header as Home,
// a page title, and a scrolling body that leaves room for the floating bottom nav.
export function Page({ title, subtitle, badge, maxWidth = 720, onNavigate, children }: Props) {
  const insets = useSafeAreaInsets();
  const layout = useLayout();
  const frame = { maxWidth: Math.min(layout.maxContentWidth, maxWidth), paddingHorizontal: layout.gutter };
  return (
    <View style={[s.root, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
      <View style={[s.frame, frame]}>
        <Header badge={badge} gutter={0} onMenu={() => onNavigate('tab:settings')} onBell={() => onNavigate('tab:reminders')} />
      </View>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ paddingBottom: NAV_HEIGHT + navOffset(insets.bottom) + 24 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[s.frame, frame]}>
          <View style={s.titleBlock}>
            <Text style={s.title} accessibilityRole="header">
              {title}
            </Text>
            {!!subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
          </View>
          {children}
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  frame: { width: '100%', alignSelf: 'center' },
  scroll: { flex: 1 },
  titleBlock: { marginTop: 6, marginBottom: 18 },
  title: { color: colors.text, fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  subtitle: { color: colors.textMuted, fontSize: 15, marginTop: 4 },
});
