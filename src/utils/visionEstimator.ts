// Free-only vision-based food estimator pipeline for T1D Saathi
// Pipeline: on-device classify → local Nepali DB (primary) → USDA/OpenFoodFacts (fallback) → manual search
//
// Design intent:
//   The local Nepali food table (src/data/nepaliFoods.ts) is the PRIMARY source of
//   nutrition data, NOT a fallback. On-device classification and external APIs are
//   hints for food identification; the local table provides accurate, culturally-
//   specific macros that generic APIs cannot match for Nepali cuisine.
//
//   On-device models (MobileNet-based) will have lower accuracy on Nepali dishes
//   than paid vision APIs. This is expected and mitigated by the local table.
//
// Former LogMeal/FatSecret integration removed per free-only requirement.

import { NEPALI_FOODS, NepaliFoodItem, searchNepaliFoods } from '../data/nepaliFoods';

export interface FoodItem {
  food_name: string;
  matched_local_item?: NepaliFoodItem;
  portion_desc: string;
  portion_grams: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  calories: number;
  confidence: 'high' | 'medium' | 'low';
  source: 'on_device' | 'local_db' | 'usda' | 'open_food_facts' | 'manual';
}

export interface MealEstimateResult {
  items: FoodItem[];
  total_carbs_g: number;
  total_protein_g: number;
  total_fat_g: number;
  total_calories: number;
  overall_confidence: 'high' | 'medium' | 'low';
}

import { analyzeFoodPhoto } from './visionAPI';

// ─── On-device classifier (placeholder) ──────────────────────────
// TODO: Integrate react-native-fast-tflite with a MobileNet food classifier.
//       On-device results will be matched against local Nepali food table.
//       For now, photos skip directly to the local DB + USDA/OpenFoodFacts path.

// ─── External API fallback ────────────────────────────────────────

async function callExternalAPI(imageUri: string): Promise<FoodItem[]> {
  try {
    const result = await analyzeFoodPhoto(imageUri);
    if (result.success && result.items.length > 0) {
      return result.items.map(item => ({
        food_name: item.name,
        portion_desc: item.portion_desc,
        portion_grams: item.portion_grams,
        carbs_g: item.nutrients?.carbs_g ?? 0,
        protein_g: item.nutrients?.protein_g ?? 0,
        fat_g: item.nutrients?.fat_g ?? 0,
        calories: item.nutrients?.calories ?? 0,
        confidence: item.confidence > 0.8 ? 'high' as const
          : item.confidence > 0.5 ? 'medium' as const : 'low' as const,
        source: 'open_food_facts' as const,
      }));
    }
    return [];
  } catch (err) {
    console.log('External API unavailable, using local database only:', (err as Error).message);
    return [];
  }
}

// ─── Match against local Nepali food database ─────────────────────
// This is the PRIMARY nutrition source — not a fallback.
// External APIs identify the food name; this table provides accurate macros.

function matchLocalFood(item: FoodItem): FoodItem {
  const name = item.food_name.toLowerCase();

  // Try exact matches first
  let bestMatch = NEPALI_FOODS.find(f =>
    f.name.toLowerCase() === name ||
    f.name.toLowerCase().includes(name) ||
    name.includes(f.name.toLowerCase())
  );

  // Try category-based fuzzy match
  if (!bestMatch) {
    const keywords: Record<string, string> = {
      'rice': 'bhat', 'lentil': 'dal', 'daal': 'dal', 'bread': 'roti',
      'curry': 'tarkari', 'potato': 'aloo', 'chicken': 'chicken',
      'dumpling': 'momo', 'yogurt': 'dahi', 'curd': 'dahi',
      'tea': 'chiya', 'egg': 'egg', 'banana': 'banana', 'apple': 'apple',
      'beaten rice': 'chiura', 'flattened rice': 'chiura',
      'porridge': 'jaulo', 'khichdi': 'khichadi', 'buckwheat': 'phapar',
      'sel': 'sel roti', 'chickpea': 'chana', 'milk tea': 'chiya',
    };

    for (const [kw, localName] of Object.entries(keywords)) {
      if (name.includes(kw)) {
        bestMatch = NEPALI_FOODS.find(f => f.name.toLowerCase().includes(localName));
        if (bestMatch) break;
      }
    }
  }

  if (bestMatch) {
    // Scale macros by actual portion vs typical portion
    const scaleFactor = item.portion_grams / bestMatch.typical_portion_g;
    return {
      ...item,
      food_name: bestMatch.name,
      matched_local_item: bestMatch,
      carbs_g: Math.round(bestMatch.carbs_g * scaleFactor * 10) / 10,
      protein_g: Math.round(bestMatch.protein_g * scaleFactor * 10) / 10,
      fat_g: Math.round(bestMatch.fat_g * scaleFactor * 10) / 10,
      calories: Math.round(bestMatch.calories * scaleFactor),
      source: 'local_db', // Local DB is primary — override source
      confidence: 'high',  // Local DB has curated macros, raise confidence
    };
  }

  // No local match — keep whatever the external API returned, flag low confidence
  return { ...item, confidence: 'low' };
}

// Calorie sanity check: macros × caloric density should ≈ given calories
export function validateCalories(item: FoodItem): { valid: boolean; calculated: number; discrepancy: number } {
  const calculated = (item.carbs_g * 4) + (item.protein_g * 4) + (item.fat_g * 9);
  const discrepancy = Math.abs(item.calories - calculated);
  return {
    valid: discrepancy < 50,
    calculated: Math.round(calculated),
    discrepancy: Math.round(discrepancy),
  };
}

// ─── Main estimation pipeline ─────────────────────────────────────

export async function estimateMealFromPhoto(imageUri: string): Promise<MealEstimateResult> {
  // Step 1: On-device classification (placeholder — not yet implemented)
  // TODO: Integrate TFLite model here. On-device labels feed into matchLocalFood().

  // Step 2: Try external free APIs for food identification
  const externalItems = await callExternalAPI(imageUri);

  // Step 3: Match EVERY item against local Nepali database (primary nutrition source)
  const matchedItems: FoodItem[] = externalItems.map(matchLocalFood);

  // Step 4: If no external items identified at all, return empty
  // User will use manual search to add foods from the local database
  if (matchedItems.length === 0) {
    return {
      items: [],
      total_carbs_g: 0,
      total_protein_g: 0,
      total_fat_g: 0,
      total_calories: 0,
      overall_confidence: 'low',
    };
  }

  // Step 5: Validate calorie math
  const validatedItems = matchedItems.map(item => {
    const check = validateCalories(item);
    if (!check.valid && item.source !== 'manual') {
      return {
        ...item,
        calories: check.calculated,
        confidence: 'low' as const,
      };
    }
    return item;
  });

  // Step 6: Calculate totals
  const totals = validatedItems.reduce(
    (acc, item) => ({
      carbs: acc.carbs + item.carbs_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories,
    }),
    { carbs: 0, protein: 0, fat: 0, calories: 0 }
  );

  // Overall confidence = lowest of items
  const confidences = validatedItems.map(i => i.confidence);
  const overallConfidence = confidences.includes('low') ? 'low'
    : confidences.includes('medium') ? 'medium' : 'high';

  return {
    items: validatedItems,
    total_carbs_g: Math.round(totals.carbs * 10) / 10,
    total_protein_g: Math.round(totals.protein * 10) / 10,
    total_fat_g: Math.round(totals.fat * 10) / 10,
    total_calories: Math.round(totals.calories),
    overall_confidence: overallConfidence,
  };
}

// Apply portion adjustments — scales macros from the base (typical) portion.
// Works for manual, on-device, and external items alike.
export function adjustItemPortion(item: FoodItem, newPortionGrams: number): FoodItem {
  const base = item.matched_local_item;
  if (base && base.typical_portion_g > 0) {
    const scale = newPortionGrams / base.typical_portion_g;
    return {
      ...item,
      portion_grams: newPortionGrams,
      carbs_g: Math.round(base.carbs_g * scale * 10) / 10,
      protein_g: Math.round(base.protein_g * scale * 10) / 10,
      fat_g: Math.round(base.fat_g * scale * 10) / 10,
      calories: Math.round(base.calories * scale),
    };
  }
  // No local match — scale relative to current grams
  const scale = item.portion_grams > 0 ? newPortionGrams / item.portion_grams : 1;
  return {
    ...item,
    portion_grams: newPortionGrams,
    carbs_g: Math.round(item.carbs_g * scale * 10) / 10,
    protein_g: Math.round(item.protein_g * scale * 10) / 10,
    fat_g: Math.round(item.fat_g * scale * 10) / 10,
    calories: Math.round(item.calories * scale),
  };
}

// Recalculate totals from items array
export function recalculateTotals(items: FoodItem[]): Pick<MealEstimateResult, 'total_carbs_g' | 'total_protein_g' | 'total_fat_g' | 'total_calories'> {
  const t = items.reduce((a, i) => ({
    carbs: a.carbs + i.carbs_g,
    protein: a.protein + i.protein_g,
    fat: a.fat + i.fat_g,
    calories: a.calories + i.calories,
  }), { carbs: 0, protein: 0, fat: 0, calories: 0 });
  return {
    total_carbs_g: Math.round(t.carbs * 10) / 10,
    total_protein_g: Math.round(t.protein * 10) / 10,
    total_fat_g: Math.round(t.fat * 10) / 10,
    total_calories: Math.round(t.calories),
  };
}
