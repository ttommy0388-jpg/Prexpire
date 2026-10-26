import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import type { CameraView } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { getLocales } from 'expo-localization';
import { cropForFrame, type Rect, type Size } from './cropMath';
import { dayOrderForRegion, parseExpiry, type ScanParseResult } from './dateParser';
import { recognizeText } from './ocr';

export type Detection = Extract<ScanParseResult, { kind: 'found' }>;

export type ScanHint = 'aim' | 'low-light' | 'closer' | 'manufacture' | 'unclear' | 'hold-steady' | 'ocr-error';

export type ScannerState = { status: 'scanning'; hint: ScanHint } | { status: 'detected'; detection: Detection };

type Options = {
  camera: RefObject<CameraView | null>;
  // Size of the camera view and the frame inside it, in the same coordinates. Read on each pass.
  geometry: RefObject<{ view: Size; frame: Rect } | null>;
  // False while the camera is not ready, the app is in the background, or OCR is unavailable.
  enabled: boolean;
};

// Pause between passes. Each pass takes a still, crops it to the frame and reads it on device,
// so frames are sampled roughly once a second instead of analysing every preview frame.
const PASS_GAP_MS = 450;
// A date has to be read the same way in two of the last three passes before it counts.
const AGREEMENT_WINDOW = 3;
const AGREEMENT_NEEDED = 2;
// Misses before a hint replaces "Keep the date inside the frame".
const MISSES_BEFORE_HINT = 3;
// Longest side of the image handed to OCR; larger crops are scaled down to keep passes fast.
const MAX_OCR_SIDE = 1600;

function deleteQuietly(uri: string | undefined) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    // Cache files are cleared by the OS eventually; a failed delete is not worth surfacing.
  }
}

async function readFrame(camera: CameraView, geometry: { view: Size; frame: Rect } | null): Promise<string[]> {
  const photo = await camera.takePictureAsync({ quality: 0.7, shutterSound: false, exif: false });
  if (!photo?.uri) return [];
  let croppedUri: string | undefined;
  try {
    const crop = geometry ? cropForFrame(geometry.view, geometry.frame, { width: photo.width, height: photo.height }) : null;
    const ctx = ImageManipulator.manipulate(photo.uri);
    // Reading only the area behind the frame keeps OCR on the date instead of the whole package.
    // When the crop cannot be computed the whole photo is read and the parser sorts it out.
    const region = crop ?? { x: 0, y: 0, width: photo.width, height: photo.height };
    if (crop) ctx.crop({ originX: crop.x, originY: crop.y, width: crop.width, height: crop.height });
    const longest = Math.max(region.width, region.height);
    if (longest > MAX_OCR_SIDE) {
      ctx.resize(region.width >= region.height ? { width: MAX_OCR_SIDE } : { height: MAX_OCR_SIDE });
    }
    const image = await ctx.renderAsync();
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
    croppedUri = saved.uri;
    image.release();
    ctx.release();
    return await recognizeText(saved.uri);
  } finally {
    deleteQuietly(photo.uri);
    deleteQuietly(croppedUri);
  }
}

export function useExpiryScanner({ camera, geometry, enabled }: Options) {
  const [state, setState] = useState<ScannerState>({ status: 'scanning', hint: 'aim' });
  const stateRef = useRef(state);
  const history = useRef<(string | null)[]>([]);
  const misses = useRef(0);
  // Bumped by reset() so a pass that was already running when the user tapped "Scan again"
  // cannot publish a stale detection.
  const generation = useRef(0);

  // Only re-render when what the user sees changes.
  const publish = useCallback((next: ScannerState) => {
    const prev = stateRef.current;
    if (prev.status === next.status && (next.status === 'detected' || (prev.status === 'scanning' && prev.hint === next.hint))) return;
    stateRef.current = next;
    setState(next);
  }, []);

  const reset = useCallback(() => {
    generation.current += 1;
    history.current = [];
    misses.current = 0;
    stateRef.current = { status: 'scanning', hint: 'aim' };
    setState(stateRef.current);
  }, []);

  const detected = state.status === 'detected';

  useEffect(() => {
    if (!enabled || detected) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const gen = generation.current;
    const preferredOrder = dayOrderForRegion(getLocales()[0]?.regionCode);

    const pass = async () => {
      const cam = camera.current;
      if (!cam) return schedule();
      let result: ScanParseResult | null = null;
      let failed = false;
      try {
        const lines = await readFrame(cam, geometry.current);
        result = parseExpiry(lines, { today: new Date(), preferredOrder });
      } catch {
        // Capture can fail while the camera is reconfiguring (rotation, backgrounding).
        failed = true;
      }
      if (cancelled || gen !== generation.current) return;

      if (result?.kind === 'found') {
        const h = [...history.current, result.key].slice(-AGREEMENT_WINDOW);
        history.current = h;
        if (h.filter((k) => k === result.key).length >= AGREEMENT_NEEDED) {
          publish({ status: 'detected', detection: result });
          return;
        }
        misses.current = 0;
        publish({ status: 'scanning', hint: 'hold-steady' });
      } else {
        history.current = [...history.current, null].slice(-AGREEMENT_WINDOW);
        misses.current += 1;
        if (misses.current >= MISSES_BEFORE_HINT) {
          const hint: ScanHint = failed
            ? 'ocr-error'
            : result?.hint === 'no-text'
              ? 'low-light'
              : result?.hint === 'manufacture-only'
                ? 'manufacture'
                : result?.hint === 'invalid-date'
                  ? 'unclear'
                  : 'closer';
          publish({ status: 'scanning', hint });
        } else if (stateRef.current.status === 'scanning' && stateRef.current.hint === 'hold-steady') {
          publish({ status: 'scanning', hint: 'aim' });
        }
      }
      schedule();
    };

    const schedule = () => {
      if (!cancelled) timer = setTimeout(pass, PASS_GAP_MS);
    };

    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, detected, camera, geometry, publish]);

  return { state, reset };
}
