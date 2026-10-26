import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

// On-device text recognition: Apple Vision on iOS, Google ML Kit on Android, through the
// expo-text-extractor native module. Nothing leaves the device.
//
// The module is native code, so it exists only in a development or release build. Expo Go
// and the web build do not contain it; `ocrAvailability` says so and the scanner tells the
// user instead of pretending to scan.

type TextExtractorModule = {
  isSupported: boolean;
  extractTextFromImage: (uri: string) => Promise<string[]>;
};

const native = Platform.OS === 'web' ? null : requireOptionalNativeModule<TextExtractorModule>('ExpoTextExtractor');

export type OcrAvailability = 'available' | 'needs-dev-build' | 'unsupported-platform';

export const ocrAvailability: OcrAvailability =
  Platform.OS === 'web' ? 'unsupported-platform' : native?.isSupported ? 'available' : 'needs-dev-build';

export async function recognizeText(uri: string): Promise<string[]> {
  if (!native) throw new Error('Text recognition is not available in this build.');
  // The module expects a plain file path (same as the package's own wrapper).
  const lines = await native.extractTextFromImage(uri.replace('file://', ''));
  return Array.isArray(lines) ? lines.filter((l) => typeof l === 'string') : [];
}
