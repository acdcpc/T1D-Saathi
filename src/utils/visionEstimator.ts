// Vision-based food estimator pipeline for T1D Saathi
// Photo → vision model → local food DB matching → calorie/macro estimate

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
  source: 'vision' | 'local_db' | 'manual';
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

// Call vision API (LogMeal → FatSecret → local fallback)
async function callVisionAPI(imageUri: string): Promise<FoodItem[]> {
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
        source: 'vision' as const,
      }));
    }

    // API answered but returned empty — fall through to empty result
    console.log('Vision API returned empty, using local database only');
    return [];
  } catch (err) {
    console.log('All vision APIs failed, using local database:', (err as Error).message);
    return [];
  }
}

// Fuzzy match vision-identified item to local Nepali food database
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
      source: 'local_db',
      confidence: 'high',
    };
  }

  // No local match — keep generic estimate, flag low confidence
  return { ...item, confidence: 'low', source: 'vision' };
}

// Calorie sanity check: macros × caloric density should ≈ given calories
// carbs=4, protein=4, fat=9 kcal/g
export function validateCalories(item: FoodItem): { valid: boolean; calculated: number; discrepancy: number } {
  const calculated = (item.carbs_g * 4) + (item.protein_g * 4) + (item.fat_g * 9);
  const discrepancy = Math.abs(item.calories - calculated);
  return {
    valid: discrepancy < 50, // within 50 kcal tolerance
    calculated: Math.round(calculated),
    discrepancy: Math.round(discrepancy),
  };
}

// Main estimation pipeline
export async function estimateMealFromPhoto(imageUri: string): Promise<MealEstimateResult> {
  // Step 1: Call vision API
  const visionItems = await callVisionAPI(imageUri);

  // Step 2: Match each item against Nepali food database
  const matchedItems: FoodItem[] = visionItems.map(matchLocalFood);

  // Step 3: Validate calorie math for each item
  const validatedItems = matchedItems.map(item => {
    const check = validateCalories(item);
    if (!check.valid && item.source !== 'manual') {
      return {
        ...item,
        calories: check.calculated, // Prefer calculated from macros when vision diverges
        confidence: 'low' as const,
      };
    }
    return item;
  });

  // Step 4: Calculate totals
  const totals = validatedItems.reduce(
    (acc, item) => ({
      carbs: acc.carbs + item.carbs_g,
      protein: acc.protein + item.protein_g,
      fat: acc.fat + item.fat_g,
      calories: acc.calories + item.calories,
    }),
    { carbs: 0, protein: 0, fat: 0, calories: 0 }
  );

  // Step 5: Overall confidence (lowest of items)
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

// Apply portion adjustments (user slides the scale)
export function adjustItemPortion(item: FoodItem, newPortionGrams: number): FoodItem {
  if (!item.matched_local_item || item.source === 'manual') {
    return { ...item, portion_grams: newPortionGrams };
  }
  const scale = newPortionGrams / item.portion_grams;
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
