// Web implementation of the food classifier using TensorFlow.js (tfjs-tflite).
// Runs the SAME Google AIY Food V1 model in the browser, so the PWA gets
// "point camera → auto carbs" parity with the Android build.
//
// Model: assets/models/food_v1.tflite (bundled as a web asset, cached by SW)
// Runtime: @tensorflow/tfjs-tflite WASM (served from /wasm/ via public/wasm/)

import * as tf from '@tensorflow/tfjs-core';
// NOTE: import the pre-bundled ESM (dist/index.js is broken for bundlers — its
// task-library clients import a file that only ships in wasm/).
import * as tflite from '@tensorflow/tfjs-tflite/dist/tf-tflite.fesm.js';
import * as ImageManipulator from 'expo-image-manipulator';
import { Asset } from 'expo-asset';
import { NEPALI_FOODS } from '../data/nepaliFoods';
import { mapPredictionToFoods, MIN_CONFIDENCE } from '../data/foodLabelMapping';
import type { NepaliFoodItem } from '../data/nepaliFoods';

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

let modelPromise: Promise<tflite.TFLiteModel | null> | null = null;
let wasmConfigured = false;

function getModelUrl(): string {
  // On web, Metro resolves the asset require to its served URL.
  return Asset.fromModule(require('../../assets/models/food_v1.tflite')).uri;
}

function loadModel(): Promise<tflite.TFLiteModel | null> {
  if (!modelPromise) {
    modelPromise = (async () => {
      try {
        if (!wasmConfigured) {
          tflite.setWasmPath('/wasm/');
          wasmConfigured = true;
        }
        return await tflite.loadTFLiteModel(getModelUrl());
      } catch (err) {
        console.error('[FoodClassifier] TF.js model load failed:', (err as Error).message);
        return null;
      }
    })();
  }
  return modelPromise;
}

export async function classifyFoodPhoto(imageUri: string): Promise<ModelResult> {
  const startTime = Date.now();
  try {
    // Step 1: Resize to model input size (192×192)
    const resized = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 192, height: 192 } }],
      { format: ImageManipulator.SaveFormat.JPEG, base64: true, compress: 0.9 }
    );
    if (!resized.base64) {
      return { suggestions: [], topLabels: [], inferenceTimeMs: Date.now() - startTime };
    }

    // Step 2: Decode JPEG base64 → RGB uint8 array (192×192×3)
    const binary = atob(resized.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const jpeg = require('jpeg-js');
    const { data, width, height } = jpeg.decode(bytes, { useTArray: true });
    const input = new Uint8Array(192 * 192 * 3);
    const pixelCount = width * height;
    for (let i = 0; i < pixelCount; i++) {
      const src = i * 4;
      const dst = i * 3;
      input[dst] = data[src];       // R
      input[dst + 1] = data[src + 1]; // G
      input[dst + 2] = data[src + 2]; // B
    }

    // Step 3: Load model and run inference
    const model = await loadModel();
    if (!model) {
      return { suggestions: [], topLabels: [], inferenceTimeMs: Date.now() - startTime };
    }

    // AIY Food V1 input is uint8 [1,192,192,3]; TF.js has no uint8 dtype, so
    // use int32 (tfjs-tflite maps int32 → uint8 internally).
    const inputTensor = tf.tensor4d(Int32Array.from(input), [1, 192, 192, 3], 'int32');
    let predictions: Float32Array;
    try {
      const output = model.predict(inputTensor) as tf.Tensor;
      predictions = (await output.data()) as Float32Array; // [1, 2025] softmax
      output.dispose();
    } finally {
      inputTensor.dispose();
    }

    // Step 4: Extract top-5 predictions
    const indexed: Array<{ index: number; confidence: number }> = [];
    for (let i = 0; i < predictions.length; i++) {
      if (predictions[i] > MIN_CONFIDENCE) indexed.push({ index: i, confidence: predictions[i] });
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
        const item = NEPALI_FOODS.find((f) => f.name === m.foodName);
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
      topLabels: top5.map((p) => ({
        label: `class_${p.index}`,
        confidence: Math.round(p.confidence * 100) / 100,
      })),
      inferenceTimeMs: Date.now() - startTime,
    };
  } catch (err) {
    console.error('[FoodClassifier] Web inference failed:', (err as Error).message);
    return { suggestions: [], topLabels: [], inferenceTimeMs: Date.now() - startTime };
  }
}
