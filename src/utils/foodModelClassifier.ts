// On-device food classifier using Google AIY Food V1 TFLite model
//
// Model: aiy/vision/classifier/food_V1 (Google, Apache 2.0)
//   - MobileNet V2-based, trained on 2000+ food classes
//   - Input: 192×192×3 uint8 RGB
//   - Output: softmax over 2025 classes
//   - Model file: assets/models/food_v1.tflite (~21 MB)
//   - Label map: assets/models/food_v1_labels.csv
//
// Runtime: react-native-fast-tflite (requires dev client / EAS build)
//   - NOT compatible with Expo Go
//   - Compatible with EAS dev-client builds (already configured)
//   - On web: returns empty suggestions (model unavailable in browser)
//
// Pipeline:
//   photo → resize to 192×192 → TFLite inference → top-N predictions →
//   keyword match against label map → map to local Nepali food DB →
//   return ranked suggestions

import { Platform } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { NEPALI_FOODS } from '../data/nepaliFoods';
import { mapPredictionToFoods, MIN_CONFIDENCE } from '../data/foodLabelMapping';
import type { NepaliFoodItem } from '../data/nepaliFoods';

// ─── Types ───────────────────────────────────────────────────────

export interface ModelSuggestion {
  foodName: string;
  item: NepaliFoodItem;
  modelLabel: string;
  confidence: number;
}

export interface ModelResult {
  suggestions: ModelSuggestion[];
  topLabels: Array<{ label: string; confidence: number }>;
  inferenceTimeMs: number;
}

// ─── Model loading (lazy, singleton) ─────────────────────────────

let modelInstance: any = null;
let modelLoading = false;
let modelError: string | null = null;

async function getModel(): Promise<any | null> {
  if (modelInstance) return modelInstance;
  if (modelError) return null;

  // Web: TFLite not available in browser
  if (Platform.OS === 'web') {
    modelError = 'TFLite not available on web';
    return null;
  }

  if (modelLoading) {
    // Wait for concurrent load to complete
    await new Promise(r => setTimeout(r, 100));
    return getModel();
  }

  modelLoading = true;
  try {
    const TFLite = require('react-native-fast-tflite');
    const { Asset } = require('expo-asset');
    const modelAsset = Asset.fromModule(require('../../assets/models/food_v1.tflite'));
    await modelAsset.downloadAsync();
    if (!modelAsset.localUri) {
      throw new Error('Model asset failed to resolve');
    }
    modelInstance = await TFLite.loadModel(modelAsset.localUri);
    modelLoading = false;
    return modelInstance;
  } catch (err: any) {
    modelError = err.message || 'Failed to load model';
    modelLoading = false;
    console.error('[FoodClassifier] Model load failed:', modelError);
    return null;
  }
}

// ─── Inference ───────────────────────────────────────────────────

/**
 * Run the AIY Food V1 classifier on a photo.
 *
 * Steps:
 *   1. Resize photo to 192×192 (model input size)
 *   2. Convert to RGB uint8 tensor
 *   3. Run TFLite inference
 *   4. Extract top-5 predictions
 *   5. Map each prediction to Nepali food DB entries
 *   6. Return deduplicated, ranked suggestions
 *
 * Falls back to empty results if:
 *   - Running on web (no TFLite support)
 *   - Model fails to load
 *   - No predictions exceed MIN_CONFIDENCE
 */
export async function classifyFoodPhoto(imageUri: string): Promise<ModelResult> {
  const startTime = Date.now();

  try {
    // Step 1: Resize to model input size (192×192)
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 192, height: 192 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!resized.base64) {
      return { suggestions: [], topLabels: [], inferenceTimeMs: Date.now() - startTime };
    }

    // Step 2: Decode base64 → RGB uint8 array
    const binary = atob(resized.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // Parse PNG to get RGB pixels (skip PNG header, extract pixel data)
    // pngjs handles this properly. For now, use pngjs for decoding.
    const { PNG } = require('pngjs');
    const png = PNG.sync.read(bytes as any);

    // Extract RGB pixels (drop alpha channel)
    const inputTensor = new Uint8Array(192 * 192 * 3);
    for (let i = 0; i < png.data.length; i += 4) {
      const pixelIdx = (i / 4) * 3;
      inputTensor[pixelIdx] = png.data[i];       // R
      inputTensor[pixelIdx + 1] = png.data[i + 1]; // G
      inputTensor[pixelIdx + 2] = png.data[i + 2]; // B
    }

    // Step 3: Load model and run inference
    const model = await getModel();
    if (!model) {
      return {
        suggestions: [],
        topLabels: [],
        inferenceTimeMs: Date.now() - startTime,
      };
    }

    const output = await model.run([inputTensor]);
    const predictions = output[0] as Float32Array; // shape: [1, 2025]

    // Step 4: Extract top-5 predictions
    const indexed: Array<{ index: number; confidence: number }> = [];
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] > MIN_CONFIDENCE) {
        indexed.push({ index: i, confidence: predictions[i] });
      }
    }
    indexed.sort((a, b) => b.confidence - a.confidence);
    const top5 = indexed.slice(0, 5);

    // Step 5 & 6: Map predictions to Nepali food DB
    const allSuggestions: ModelSuggestion[] = [];
    const seenFoods = new Set<string>();

    for (const pred of top5) {
      const mapped = mapPredictionToFoods(pred.index, pred.confidence);
      for (const m of mapped) {
        if (seenFoods.has(m.foodName)) continue;
        seenFoods.add(m.foodName);

        const item = NEPALI_FOODS.find(f => f.name === m.foodName);
        if (item) {
          allSuggestions.push({
            foodName: m.foodName,
            item,
            modelLabel: m.source,
            confidence: m.confidence,
          });
        }
      }
    }

    return {
      suggestions: allSuggestions.slice(0, 8),
      topLabels: top5.map(p => ({
        label: `class_${p.index}`,
        confidence: Math.round(p.confidence * 100) / 100,
      })),
      inferenceTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error('[FoodClassifier] Inference failed:', (err as Error).message);
    return {
      suggestions: [],
      topLabels: [],
      inferenceTimeMs: Date.now() - startTime,
    };
  }
}
