// ⚠️ DEAD CODE — EXPERIMENTAL — NOT IN ACTIVE USE
// This module was built and tested but proved unreliable on real food photos.
// Real-photo accuracy: 25% top-1, 33% top-3, 75% high-confidence wrong.
// Whole-plate average RGB cannot distinguish Nepali dishes (dal bhat, roti,
// sel roti, momo all collapse to similar brown/golden averages).
//
// Kept for reference — a future approach might use region-based sampling
// or an actual TFLite model. Do NOT re-enable the suggestion chips without
// first re-testing on at least 10 real food photos with real lighting.
//
// See: scripts/test-real-photos.js for the test harness and results.
//
// On-device food classifier using photo color analysis
//
// Pipeline:
//   photo → resize to 32×32 PNG (expo-image-manipulator) →
//   decode pixels (pngjs) → average RGB → match against food color profiles →
//   return ranked suggestions for pre-filtering the local food DB search
//
// This is a heuristic color matcher, not AI/ML. The local Nepali food DB
// provides the accurate macros — this just surfaces likely matches based on
// the plate's dominant colors (e.g., yellow → dal bhat, brown → chicken curry).
//
// Works everywhere: Expo Go, web, iOS, Android. Zero native modules needed.

import * as ImageManipulator from 'expo-image-manipulator';
import { PNG } from 'pngjs';

// ─── Food color profiles (RGB ranges for each Nepali dish) ────────

interface FoodColorProfile {
  foodName: string;
  r: [number, number];
  g: [number, number];
  b: [number, number];
}

const FOOD_COLOR_PROFILES: FoodColorProfile[] = [
  { foodName: 'Bhat (steamed rice)', r: [180,255], g: [175,255], b: [140,255] },
  { foodName: 'Dahi/Curd (yogurt)', r: [200,255], g: [200,255], b: [180,255] },
  { foodName: 'Milk (whole)', r: [210,255], g: [210,255], b: [210,255] },
  { foodName: 'Momo (dumplings)', r: [170,240], g: [155,220], b: [120,200] },
  { foodName: 'Dal Bhat (lentils & rice)', r: [160,220], g: [130,200], b: [50,140] },
  { foodName: 'Dal (lentil soup)', r: [150,220], g: [120,200], b: [40,130] },
  { foodName: 'Sel Roti (rice donut)', r: [160,220], g: [120,190], b: [40,120] },
  { foodName: 'Egg (fried)', r: [170,240], g: [150,210], b: [40,150] },
  { foodName: 'Egg (boiled)', r: [200,255], g: [195,255], b: [140,200] },
  { foodName: 'Chicken Curry', r: [100,190], g: [50,120], b: [30,90] },
  { foodName: 'Aloo Tarkari (potato curry)', r: [140,210], g: [100,165], b: [50,130] },
  { foodName: 'Chana (chickpea curry)', r: [130,200], g: [90,160], b: [40,120] },
  { foodName: 'Tarkari (mixed vegetable curry)', r: [40,130], g: [100,180], b: [40,120] },
  { foodName: 'Roti (flatbread)', r: [150,220], g: [120,190], b: [60,160] },
  { foodName: 'Phapar ko Roti (buckwheat bread)', r: [80,160], g: [60,130], b: [30,100] },
  { foodName: 'Bhuja/Chiura (beaten rice)', r: [180,240], g: [170,230], b: [140,210] },
  { foodName: 'Jaulo (rice & lentil porridge)', r: [140,210], g: [120,185], b: [70,150] },
  { foodName: 'Khichadi (rice-lentil mix)', r: [130,200], g: [110,175], b: [60,140] },
  { foodName: 'Chiya (milk tea)', r: [100,175], g: [70,140], b: [40,100] },
  { foodName: 'Banana', r: [180,240], g: [180,235], b: [40,120] },
  { foodName: 'Apple', r: [140,220], g: [30,90], b: [20,70] },
  { foodName: 'Khajuri/Chaku (molasses candy)', r: [40,100], g: [20,60], b: [10,40] },
];

// ─── PNG pixel extraction ─────────────────────────────────────────

function extractAverageColor(base64PNG: string): { r: number; g: number; b: number } | null {
  try {
    // Decode base64 → Uint8Array (no Buffer dependency)
    const binary = atob(base64PNG);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    // pngjs accepts Uint8Array directly
    const png = PNG.sync.read(bytes as any);

    // Average all pixels
    let r = 0, g = 0, b = 0;
    const total = png.width * png.height;
    for (let i = 0; i < png.data.length; i += 4) {
      r += png.data[i];
      g += png.data[i + 1];
      b += png.data[i + 2];
    }

    return {
      r: Math.round(r / total),
      g: Math.round(g / total),
      b: Math.round(b / total),
    };
  } catch {
    return null;
  }
}

// ─── Color matching ───────────────────────────────────────────────

interface ClassificationResult {
  foodName: string;
  score: number; // 0–1
}

function matchColorToFoods(r: number, g: number, b: number): ClassificationResult[] {
  const results: ClassificationResult[] = [];

  for (const profile of FOOD_COLOR_PROFILES) {
    const rMid = (profile.r[0] + profile.r[1]) / 2;
    const gMid = (profile.g[0] + profile.g[1]) / 2;
    const bMid = (profile.b[0] + profile.b[1]) / 2;
    const dist = Math.sqrt(Math.pow(r - rMid, 2) + Math.pow(g - gMid, 2) + Math.pow(b - bMid, 2));
    const score = Math.max(0, 1 - dist / 350);
    // Cap confidence: large distance = at most medium, regardless of score

    if (score > 0.1) {
      const inRange = r >= profile.r[0] && r <= profile.r[1] &&
        g >= profile.g[0] && g <= profile.g[1] &&
        b >= profile.b[0] && b <= profile.b[1];
      const finalScore = inRange ? Math.min(1, score + 0.2) : score;
      // Clamp: if raw distance > 120, never exceed 0.5 (medium max)
      const clamped = dist > 120 ? Math.min(finalScore, 0.5) : finalScore;
      results.push({
        foodName: profile.foodName,
        score: clamped,
      });
    }
  }

  // Deduplicate by food name, keeping highest score
  const seen = new Set<string>();
  return results
    .sort((a, b) => b.score - a.score)
    .filter(r => { if (seen.has(r.foodName)) return false; seen.add(r.foodName); return true; })
    .slice(0, 8);
}

// ─── Main entry point ─────────────────────────────────────────────

export interface ClassifierOutput {
  suggestions: ClassificationResult[];
  overallConfidence: 'high' | 'medium' | 'low';
  extractedColor: { r: number; g: number; b: number } | null;
}

/**
 * Analyze a food photo using on-device color matching.
 *
 * Resizes the image to 32×32, extracts average RGB, and matches against
 * known Nepali food color profiles. Returns ranked suggestions to pre-filter
 * the local food DB search.
 *
 * Works entirely on-device with zero network calls. Falls back to empty
 * suggestions if color extraction fails for any reason.
 */
export async function classifyPhotoColors(imageUri: string): Promise<ClassifierOutput> {
  try {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { width: 32, height: 32 } }],
      { format: ImageManipulator.SaveFormat.PNG, base64: true }
    );

    if (!result.base64) {
      return { suggestions: [], overallConfidence: 'low', extractedColor: null };
    }

    const color = extractAverageColor(result.base64);
    if (!color) {
      return { suggestions: [], overallConfidence: 'low', extractedColor: null };
    }

    const suggestions = matchColorToFoods(color.r, color.g, color.b);
    const bestScore = suggestions[0]?.score || 0;
    const confidence = bestScore > 0.85 ? 'high' : bestScore > 0.55 ? 'medium' : 'low';

    return { suggestions, overallConfidence: confidence, extractedColor: color };
  } catch {
    return { suggestions: [], overallConfidence: 'low', extractedColor: null };
  }
}
