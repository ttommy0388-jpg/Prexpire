import type { Ref } from 'react';
import type { Rect, Size } from './cropMath';

export type FrameGeometry = { view: Size; frame: Rect };

// What the scan loop needs from the camera: read the text behind the frame once.
export type ScannerCameraHandle = {
  readText: (geometry: FrameGeometry | null) => Promise<string[]>;
};

export type CameraErrorKind = 'denied' | 'unavailable' | 'unsupported' | 'ocr' | 'other';

export type ScannerCameraProps = {
  ref?: Ref<ScannerCameraHandle>;
  // False in the background, with the tab hidden, or while the phone is locked.
  active: boolean;
  torch: boolean;
  // Called once the preview is live and text can be read.
  onReady: (capabilities: { torch: boolean }) => void;
  onError: (kind: CameraErrorKind, message: string) => void;
};
