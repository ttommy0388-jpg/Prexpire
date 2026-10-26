import { useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { CameraView } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { File } from 'expo-file-system';
import { cropForFrame } from './cropMath';
import { recognizeText } from './ocr';
import type { FrameGeometry, ScannerCameraProps } from './ScannerCamera.types';

// iOS and Android: expo-camera for the preview, a still about once a second cropped to the
// frame, and on-device text recognition (Apple Vision / ML Kit). The web build uses
// ScannerCamera.web.tsx instead.

// Longest side of the image handed to OCR; larger crops are scaled down to keep passes fast.
const MAX_OCR_SIDE = 1600;

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

function deleteQuietly(uri: string | undefined) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    // Cache files are cleared by the OS eventually; a failed delete is not worth surfacing.
  }
}

async function readFrame(camera: CameraView, geometry: FrameGeometry | null): Promise<string[]> {
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

export function ScannerCamera({ ref, active, torch, onReady, onError }: ScannerCameraProps) {
  const camera = useRef<CameraView>(null);
  const [pictureSize, setPictureSize] = useState<string | undefined>();

  useImperativeHandle(ref, () => ({
    readText: async (geometry) => {
      if (!camera.current) return [];
      return readFrame(camera.current, geometry);
    },
  }));

  const onCameraReady = async () => {
    onReady({ torch: true });
    if (pictureSize) return;
    try {
      const sizes = await camera.current?.getAvailablePictureSizesAsync();
      const chosen = sizes && choosePictureSize(sizes);
      if (chosen) setPictureSize(chosen);
    } catch {
      // The default size works; it is just slower to process.
    }
  };

  return (
    <CameraView
      ref={camera}
      style={StyleSheet.absoluteFill}
      facing="back"
      active={active}
      enableTorch={torch && active}
      animateShutter={false}
      pictureSize={pictureSize}
      autofocus="on"
      onCameraReady={onCameraReady}
      onMountError={(e) => onError('unavailable', e.message || 'No camera was found on this device.')}
    />
  );
}
