import { requireNativeModule } from 'expo-modules-core';

/** One recognised line of text. Bounding box is normalised (0–1) with a
 *  top-left origin, matching how the card image is displayed. */
export interface OcrLine {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ExpoCardOcrNativeModule {
  recognize(uri: string): Promise<OcrLine[]>;
}

// The native module only exists in a custom dev/production build — not in Expo
// Go, which can't load custom native code. Resolve it safely so the app keeps
// running there (the scanner shows its camera + UI; identification no-ops).
let nativeModule: ExpoCardOcrNativeModule | null = null;
try {
  nativeModule = requireNativeModule<ExpoCardOcrNativeModule>('ExpoCardOcr');
} catch {
  nativeModule = null;
}

/** Whether on-device OCR is actually available in this runtime. */
export const isOcrAvailable = nativeModule !== null;

/** Run on-device text recognition over a local image file URI. Returns an empty
 *  list when OCR isn't available (e.g. Expo Go). */
export function recognizeText(uri: string): Promise<OcrLine[]> {
  if (!nativeModule) return Promise.resolve([]);
  return nativeModule.recognize(uri);
}
