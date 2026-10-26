import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  AppState,
  BackHandler,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  type LayoutChangeEvent,
  type LayoutRectangle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, radius } from '../theme';
import { ScanFrame } from '../components/ScanFrame';
import { ResultSheet, type SaveInput } from '../components/ResultSheet';
import { useItems, type CategoryId, type Item } from '../items';
import { ocrAvailability } from '../scanner/ocr';
import { useExpiryScanner, type ScanHint } from '../scanner/useExpiryScanner';
import type { Rect, Size } from '../scanner/cropMath';

type Props = {
  onClose: () => void;
  onSaved: (item: Item) => void;
  // Category to preselect when the scanner is opened from a category.
  category?: CategoryId;
};

const HINTS: Record<ScanHint, { icon: keyof typeof Ionicons.glyphMap; text: string }> = {
  aim: { icon: 'scan-outline', text: 'Keep the date inside the frame' },
  'hold-steady': { icon: 'hourglass-outline', text: 'Reading the date… hold steady' },
  'low-light': { icon: 'sunny-outline', text: 'Move closer or improve the lighting' },
  closer: { icon: 'resize-outline', text: 'Move closer so the date fills the frame' },
  manufacture: { icon: 'alert-circle-outline', text: 'That looks like a production date. Look for EXP or BEST BEFORE' },
  unclear: { icon: 'eye-outline', text: "Couldn't read that date clearly. Hold steady" },
  'ocr-error': { icon: 'refresh-outline', text: 'Having trouble reading. Hold the camera steady' },
};

// Picks a capture size that is sharp enough for small print but quick to process.
// iOS lists session presets; Android lists pixel sizes for the camera's 4:3 sensor.
function choosePictureSize(sizes: string[]): string | undefined {
  if (sizes.includes('1920x1080')) return '1920x1080';
  const parsed = sizes
    .map((s) => {
      const [w, h] = s.split('x').map(Number);
      return { s, long: Math.max(w, h), short: Math.min(w, h) };
    })
    .filter((p) => p.long > 0 && Math.abs(p.long / p.short - 4 / 3) < 0.02 && p.long >= 1600 && p.long <= 2600)
    .sort((a, b) => a.long - b.long);
  return parsed[0]?.s;
}

function frameSize(area: Size, hintSpace: number) {
  const width = Math.max(220, Math.min(area.width - 40, 560));
  // A wide, short frame: expiry dates are one or two lines of text.
  let height = Math.min(Math.max(width * 0.42, 110), 230);
  const room = area.height - hintSpace - 24;
  if (height > room) height = Math.max(80, room);
  return { width, height };
}

export function ScannerScreen({ onClose, onSaved, category }: Props) {
  const insets = useSafeAreaInsets();
  const { lastCategory, addItem } = useItems();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);

  const [root, setRoot] = useState<Size>({ width: 0, height: 0 });
  const [area, setArea] = useState<LayoutRectangle | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>();
  const [torch, setTorch] = useState(false);
  const [appActive, setAppActive] = useState(AppState.currentState === 'active');
  const [manual, setManual] = useState(false);

  const landscape = root.width > root.height && root.height > 0;
  const granted = !!permission?.granted;
  const ocrReady = ocrAvailability === 'available';

  // Stop the camera and analysis in the background or when the phone locks.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      const active = next === 'active';
      setAppActive(active);
      if (!active) setTorch(false);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => sub.remove();
  }, [onClose]);

  // Geometry for cropping, kept in a ref so the scan loop reads it without re-rendering.
  const hintSpace = 56;
  const frame = useMemo(() => (area ? frameSize(area, hintSpace) : null), [area]);
  const frameInArea = useMemo(() => {
    if (!area || !frame) return null;
    const x = (area.width - frame.width) / 2;
    const y = Math.max(12, (area.height - frame.height - hintSpace) / 2);
    return { x, y, width: frame.width, height: frame.height };
  }, [area, frame]);
  const geometry = useRef<{ view: Size; frame: Rect } | null>(null);
  geometry.current =
    area && frameInArea && root.width ? { view: root, frame: { ...frameInArea, x: frameInArea.x + area.x, y: frameInArea.y + area.y } } : null;

  const { state, reset } = useExpiryScanner({
    camera,
    geometry,
    enabled: granted && cameraReady && appActive && ocrReady && !manual && !cameraError,
  });
  const detected = state.status === 'detected';
  const sheetOpen = detected || manual;

  useEffect(() => {
    if (detected) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [detected]);

  const onCameraReady = useCallback(async () => {
    setCameraReady(true);
    if (pictureSize || Platform.OS === 'web') return;
    try {
      const sizes = await camera.current?.getAvailablePictureSizesAsync();
      const chosen = sizes && choosePictureSize(sizes);
      if (chosen) setPictureSize(chosen);
    } catch {
      // The default size works; it is just slower to process.
    }
  }, [pictureSize]);

  const onAdd = useCallback(
    async ({ name, category: cat, date }: SaveInput) => {
      const item = await addItem({
        name,
        category: cat,
        expiresOn: date.iso,
        datePrecision: date.precision,
        source: manual ? 'manual' : 'scan',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      // Leave the "Added" state on screen for a moment before returning home.
      setTimeout(() => onSaved(item), 650);
    },
    [addItem, manual, onSaved],
  );

  const scanAgain = useCallback(() => {
    setManual(false);
    reset();
  }, [reset]);

  const onAreaLayout = (e: LayoutChangeEvent) => {
    const l = e.nativeEvent.layout;
    setArea((prev) => (prev && prev.x === l.x && prev.y === l.y && prev.width === l.width && prev.height === l.height ? prev : l));
  };

  const torchAvailable = Platform.OS !== 'web' && granted && cameraReady && !cameraError;

  const header = (
    <View style={[s.header, { paddingTop: insets.top + 6, paddingLeft: insets.left + 16, paddingRight: (landscape && sheetOpen ? 0 : insets.right) + 16 }]}>
      <View style={s.headerRow}>
        <Pressable onPress={onClose} hitSlop={8} style={s.roundBtn} accessibilityRole="button" accessibilityLabel="Back">
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={s.title} accessibilityRole="header">
          Live Scan
        </Text>
        <Pressable
          onPress={() => setTorch((t) => !t)}
          disabled={!torchAvailable}
          hitSlop={8}
          style={[s.roundBtn, torch && s.roundBtnOn, !torchAvailable && s.disabled]}
          accessibilityRole="switch"
          accessibilityLabel={torchAvailable ? 'Flashlight' : 'Flashlight unavailable'}
          accessibilityState={{ checked: torch, disabled: !torchAvailable }}
        >
          <Ionicons name={torch ? 'flash' : 'flash-outline'} size={21} color={torch ? colors.scanInk : colors.text} />
        </Pressable>
      </View>
      <Text style={s.instruction}>Point your camera at an expiry date.</Text>
    </View>
  );

  let body: ReactNode;
  if (!permission) {
    body = null;
  } else if (!granted) {
    body = (
      <Notice
        icon="camera-outline"
        title="Allow camera access"
        text="Prexpire reads expiry dates through your camera. Images are processed on this device and never uploaded."
        action={permission.canAskAgain ? 'Allow camera' : 'Open Settings'}
        onAction={() => (permission.canAskAgain ? requestPermission() : Linking.openSettings())}
        secondary="Enter date manually"
        onSecondary={() => setManual(true)}
        hidden={manual}
      />
    );
  } else if (cameraError) {
    body = (
      <Notice
        icon="videocam-off-outline"
        title="Camera unavailable"
        text={`The camera couldn't start. ${cameraError}`}
        secondary="Enter date manually"
        onSecondary={() => setManual(true)}
        hidden={manual}
      />
    );
  } else if (frame && frameInArea) {
    const f = frameInArea;
    const hint = state.status === 'scanning' ? HINTS[state.hint] : null;
    body = (
      <>
        {/* Darken everything except the frame so the date stands out. */}
        <View pointerEvents="none" style={[s.dim, { left: 0, right: 0, top: 0, height: f.y }]} />
        <View pointerEvents="none" style={[s.dim, { left: 0, right: 0, top: f.y + f.height, bottom: 0 }]} />
        <View pointerEvents="none" style={[s.dim, { left: 0, width: f.x, top: f.y, height: f.height }]} />
        <View pointerEvents="none" style={[s.dim, { right: 0, width: f.x, top: f.y, height: f.height }]} />
        <View pointerEvents="none" style={{ position: 'absolute', left: f.x, top: f.y }}>
          <ScanFrame width={f.width} height={f.height} scanning={ocrReady && cameraReady && !sheetOpen && appActive} success={detected} />
        </View>
        <View style={[s.hintWrap, { top: f.y + f.height + 14 }]}>
          {detected ? (
            <View style={[s.hint, s.hintSuccess]} accessibilityLiveRegion="polite">
              <Ionicons name="checkmark-circle" size={18} color={colors.mint} />
              <Text style={[s.hintText, { color: colors.mint }]}>Date detected</Text>
            </View>
          ) : !ocrReady ? (
            manual ? null : (
              <View style={s.unavailable}>
                <Text style={s.unavailableText}>
                  {ocrAvailability === 'unsupported-platform'
                    ? 'Reading dates from the camera works in the iOS and Android app, not on the web.'
                    : 'Reading dates needs the Prexpire development build. Expo Go can show the camera but cannot read text.'}
                </Text>
                <Pressable onPress={() => setManual(true)} style={s.linkBtn} accessibilityRole="button">
                  <Text style={s.linkText}>Enter date manually</Text>
                </Pressable>
              </View>
            )
          ) : (
            hint && (
              <View style={s.hint} accessibilityLiveRegion="polite">
                <Ionicons name={hint.icon} size={17} color={state.status === 'scanning' && state.hint !== 'aim' && state.hint !== 'hold-steady' ? colors.amberText : colors.scan} />
                <Text style={s.hintText} numberOfLines={2}>
                  {hint.text}
                </Text>
              </View>
            )
          )}
        </View>
      </>
    );
  }

  const sheet = sheetOpen ? (
    <ResultSheet
      // A new detection gets a fresh sheet; "Scan again" then a new read starts clean.
      key={detected ? state.detection.key : 'manual'}
      detection={detected ? state.detection : null}
      initialCategory={category ?? lastCategory}
      layout={landscape ? 'side' : 'bottom'}
      maxHeight={landscape ? root.height : Math.round(root.height * 0.62)}
      bottomInset={insets.bottom}
      secondaryLabel={ocrReady && granted && !cameraError ? 'Scan again' : 'Cancel'}
      onAdd={onAdd}
      onSecondary={ocrReady && granted && !cameraError ? scanAgain : onClose}
    />
  ) : null;

  return (
    <View style={s.root} onLayout={(e) => setRoot({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}>
      {granted && !cameraError && (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing="back"
          active={appActive}
          enableTorch={torch && appActive}
          animateShutter={false}
          pictureSize={pictureSize}
          autofocus="on"
          onCameraReady={onCameraReady}
          onMountError={(e) => setCameraError(e.message || 'No camera was found on this device.')}
        />
      )}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[StyleSheet.absoluteFill, landscape && s.row]}>
        <View style={s.column}>
          {header}
          <View style={[s.area, { marginLeft: insets.left, marginRight: landscape && sheetOpen ? 0 : insets.right }]} onLayout={onAreaLayout}>
            {body}
          </View>
        </View>
        {sheet && (
          <View style={landscape ? [s.side, { paddingRight: insets.right, width: Math.min(400, Math.max(320, root.width * 0.42)) }] : s.bottom}>{sheet}</View>
        )}
      </KeyboardAvoidingView>
    </View>
  );
}

type NoticeProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
  action?: string;
  onAction?: () => void;
  secondary: string;
  onSecondary: () => void;
  hidden: boolean;
};

function Notice({ icon, title, text, action, onAction, secondary, onSecondary, hidden }: NoticeProps) {
  if (hidden) return null;
  return (
    <View style={s.noticeWrap}>
      <View style={s.notice}>
        <View style={s.noticeIcon}>
          <Ionicons name={icon} size={28} color={colors.mint} />
        </View>
        <Text style={s.noticeTitle}>{title}</Text>
        <Text style={s.noticeText}>{text}</Text>
        {action && onAction && (
          <Pressable onPress={onAction} style={({ pressed }) => [s.noticeBtn, pressed && { opacity: 0.8 }]} accessibilityRole="button">
            <Text style={s.noticeBtnText}>{action}</Text>
          </Pressable>
        )}
        <Pressable onPress={onSecondary} style={s.linkBtn} accessibilityRole="button">
          <Text style={s.linkText}>{secondary}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row' },
  column: { flex: 1 },
  side: { justifyContent: 'flex-end' },
  // On tablets in portrait the sheet stays phone-width instead of stretching edge to edge.
  bottom: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { backgroundColor: 'rgba(5,13,16,0.82)', paddingBottom: 12, borderBottomLeftRadius: 22, borderBottomRightRadius: 22 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 48 },
  roundBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.08)', alignItems: 'center', justifyContent: 'center' },
  roundBtnOn: { backgroundColor: colors.scan },
  disabled: { opacity: 0.35 },
  title: { color: colors.text, fontSize: 19, fontWeight: '700', letterSpacing: -0.3 },
  instruction: { color: colors.textMuted, fontSize: 14.5, textAlign: 'center', marginTop: 6 },
  area: { flex: 1, overflow: 'hidden' },
  dim: { position: 'absolute', backgroundColor: 'rgba(2,7,9,0.5)' },
  hintWrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center' },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    minHeight: 40,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(5,13,16,0.78)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.14)',
    maxWidth: 460,
  },
  hintSuccess: { borderColor: 'rgba(46,232,182,0.55)' },
  hintText: { color: colors.text, fontSize: 14, fontWeight: '500', flexShrink: 1 },
  unavailable: { alignItems: 'center', maxWidth: 420, backgroundColor: 'rgba(5,13,16,0.85)', borderRadius: 16, padding: 14, gap: 6 },
  unavailableText: { color: colors.text, fontSize: 13.5, textAlign: 'center', lineHeight: 19 },
  linkBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  linkText: { color: colors.mint, fontSize: 15, fontWeight: '600' },
  noticeWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  notice: { maxWidth: 420, width: '100%', alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1, borderRadius: 20, padding: 22 },
  noticeIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#0D2E28', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  noticeTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  noticeText: { color: colors.textMuted, fontSize: 14.5, lineHeight: 21, textAlign: 'center', marginBottom: 16 },
  noticeBtn: { height: 50, alignSelf: 'stretch', borderRadius: radius.pill, backgroundColor: colors.mint, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  noticeBtnText: { color: colors.scanInk, fontSize: 16, fontWeight: '700' },
});
