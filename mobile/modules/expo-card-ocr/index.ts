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

const mod = requireNativeModule<ExpoCardOcrNativeModule>('ExpoCardOcr');

/** Run on-device text recognition over a local image file URI. */
export function recognizeText(uri: string): Promise<OcrLine[]> {
  return mod.recognize(uri);
}
