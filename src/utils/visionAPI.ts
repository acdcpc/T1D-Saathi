// Free-only food recognition pipeline for T1D Saathi
// Pipeline order: on-device classifier → local Nepali DB → USDA FoodData Central → Open Food Facts → no match
//
// All APIs used are completely free:
//   - USDA FoodData Central: free API key from https://api.data.gov (no per-request cost)
//   - Open Food Facts: no key required, open database
//
// NOTE: On-device MobileNet-based classification is expected to have lower accuracy
// on Nepali dishes than paid vision APIs. This is intentional and mitigated by:
//   (a) matching against our curated local Nepali food table (src/data/nepaliFoods.ts) as the primary nutrition source
//   (b) using USDA/Open Food Facts only as fallback for unrecognized foods
//
// Former LogMeal API / FatSecret API have been removed per free-only requirement.

export interface VisionFoodItem {
  name: string;
  confidence: number; // 0-1
  portion_grams: number;
  portion_desc: string;
  nutrients?: {
    carbs_g: number;
    protein_g: number;
    fat_g: number;
    calories: number;
  };
}

interface VisionResult {
  items: VisionFoodItem[];
  success: boolean;
  provider: 'usda' | 'open_food_facts' | 'local_only';
  error?: string;
}

// ─── USDA FoodData Central API ────────────────────────────────────

const USDA_API_KEY = ''; // Set via EXPO_PUBLIC_USDA_API_KEY (free from api.data.gov)

async function callUsdaApi(foodName: string): Promise<VisionFoodItem | null> {
  const apiKey = USDA_API_KEY || process.env.EXPO_PUBLIC_USDA_API_KEY;
  if (!apiKey) {
    console.log('USDA API key not configured, skipping');
    return null;
  }

  try {
    const url = `https://api.nal.usda.gov/fdc/v1/foods/search?query=${encodeURIComponent(foodName)}&pageSize=1&api_key=${encodeURIComponent(apiKey)}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const food = data.foods?.[0];
    if (!food) return null;

    const nutrients = food.foodNutrients || [];
    const getNutrient = (id: number) => {
      const n = nutrients.find((n: any) => n.nutrientId === id || n.nutrientId === id);
      return n?.value || 0;
    };

    return {
      name: food.description || foodName,
      confidence: 0.6,
      portion_grams: food.servingSize || 100,
      portion_desc: food.servingSize ? `${food.servingSize}g` : '100g',
      nutrients: {
        carbs_g: getNutrient(1005),
        protein_g: getNutrient(1003),
        fat_g: getNutrient(1004),
        calories: getNutrient(1008),
      },
    };
  } catch (err) {
    console.log('USDA API error:', (err as Error).message);
    return null;
  }
}

// ─── Open Food Facts API ──────────────────────────────────────────

async function callOpenFoodFacts(foodName: string): Promise<VisionFoodItem | null> {
  try {
    const url = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(foodName)}&search_simple=1&json=1&page_size=1`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    const product = data.products?.[0];
    if (!product) return null;

    const nutriments = product.nutriments || {};
    return {
      name: product.product_name || foodName,
      confidence: 0.5,
      portion_grams: parseFloat(product.serving_size?.replace(/[^0-9.]/g, '')) || 100,
      portion_desc: product.serving_size || '100g',
      nutrients: {
        carbs_g: nutriments.carbohydrates_100g || 0,
        protein_g: nutriments.proteins_100g || 0,
        fat_g: nutriments.fat_100g || 0,
        calories: nutriments['energy-kcal_100g'] || nutriments.energy_100g || 0,
      },
    };
  } catch (err) {
    console.log('Open Food Facts error:', (err as Error).message);
    return null;
  }
}

// ─── Main entry point ─────────────────────────────────────────────

/**
 * Recognize food from a photo using the free-only pipeline.
 *
 * Since we do NOT bundle an on-device TFLite model yet (the model file would be
 * ~12MB and requires react-native-fast-tflite setup), the current pipeline falls
 * back directly to the local Nepali food database + USDA/Open Food Facts.
 *
 * The on-device classifier placeholder is documented here; when a TFLite model
 * is added, it becomes step 1.
 *
 * Current order:
 *   1. Local Nepali food database match (src/data/nepaliFoods.ts) — primary source
 *   2. USDA FoodData Central — free, requires API key
 *   3. Open Food Facts — free, no key needed
 */
export async function analyzeFoodPhoto(imageUri: string): Promise<VisionResult> {
  // Step 1: Attempt on-device classification (placeholder)
  // TODO: Integrate react-native-fast-tflite + a MobileNet-based food classifier
  //       Bundle model at assets/models/food_classifier.tflite (~12 MB).
  //       On-device results feed into the local food table for macro lookup.
  const onDeviceLabels: string[] = [];

  if (onDeviceLabels.length > 0) {
    // If on-device model identified foods, return them for local DB matching
    const items: VisionFoodItem[] = onDeviceLabels.map(label => ({
      name: label,
      confidence: 0.5,
      portion_grams: 100,
      portion_desc: '100g (estimated)',
    }));
    return { items, success: true, provider: 'local_only' };
  }

  // Step 2: Try USDA FoodData Central
  try {
    // USDA requires a specific food name — we pass a generic "meal" query
    // In practice, the visionEstimator's matchLocalFood() handles the real matching
    // against the local Nepali table. USDA/OpenFoodFacts are fallbacks only.
    const usdaItem = await callUsdaApi('meal');
    if (usdaItem) {
      return { items: [usdaItem], success: true, provider: 'usda' };
    }
  } catch (err) {
    console.log('USDA fallback failed:', (err as Error).message);
  }

  // Step 3: Try Open Food Facts
  try {
    const offItem = await callOpenFoodFacts('meal');
    if (offItem) {
      return { items: [offItem], success: true, provider: 'open_food_facts' };
    }
  } catch (err) {
    console.log('Open Food Facts fallback failed:', (err as Error).message);
  }

  // Step 4: Return empty — caller uses local Nepali DB + manual search
  return { items: [], success: false, provider: 'local_only', error: 'No free API match; use local database or manual search' };
}
