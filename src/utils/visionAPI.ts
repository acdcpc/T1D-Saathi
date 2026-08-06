// Real vision API integration for food photo estimation
// Supports LogMeal API (primary) with FatSecret fallback

const LOGMEAL_API_KEY = ''; // Set via EXPO_PUBLIC_LOGMEAL_API_KEY
const FATSECRET_CLIENT_ID = ''; // Set via EXPO_PUBLIC_FATSECRET_CLIENT_ID
const FATSECRET_CLIENT_SECRET = ''; // Set via EXPO_PUBLIC_FATSECRET_CLIENT_SECRET

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
  provider: 'logmeal' | 'fatsecret' | 'local_only';
  error?: string;
}

async function callLogMealAPI(imageUri: string): Promise<VisionFoodItem[]> {
  if (!LOGMEAL_API_KEY && !process.env.EXPO_PUBLIC_LOGMEAL_API_KEY) {
    throw new Error('LogMeal API key not configured');
  }

  const apiKey = LOGMEAL_API_KEY || process.env.EXPO_PUBLIC_LOGMEAL_API_KEY;

  // Step 1: Upload image
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'meal.jpg',
  } as any);

  const uploadRes = await fetch('https://api.logmeal.com/v2/image/segmentation/complete', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!uploadRes.ok) throw new Error(`LogMeal upload failed: ${uploadRes.status}`);

  const uploadData = await uploadRes.json();

  // Step 2: Get nutritional info for identified food IDs
  const imageId = uploadData.imageId;
  const nutritionRes = await fetch(`https://api.logmeal.com/v2/recipe/nutritionalInfo`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ imageId }),
  });

  if (!nutritionRes.ok) throw new Error(`LogMeal nutrition failed: ${nutritionRes.status}`);

  const nutritionData = await nutritionRes.json();

  return (nutritionData.foodItems || []).map((item: any) => ({
    name: item.name || item.foodName || 'unknown',
    confidence: item.confidence || 0.7,
    portion_grams: item.grams || item.portion || 100,
    portion_desc: item.portionDesc || `${item.grams || 100}g`,
    nutrients: {
      carbs_g: item.nutritionalInfo?.carbohydrates || item.carbs || 0,
      protein_g: item.nutritionalInfo?.protein || item.protein || 0,
      fat_g: item.nutritionalInfo?.fat || item.fat || 0,
      calories: item.nutritionalInfo?.calories || item.calories || 0,
    },
  }));
}

async function callFatSecretAPI(imageUri: string): Promise<VisionFoodItem[]> {
  if (!FATSECRET_CLIENT_ID && !process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID) {
    throw new Error('FatSecret API not configured');
  }

  const clientId = FATSECRET_CLIENT_ID || process.env.EXPO_PUBLIC_FATSECRET_CLIENT_ID;
  const clientSecret = FATSECRET_CLIENT_SECRET || process.env.EXPO_PUBLIC_FATSECRET_CLIENT_SECRET;

  // Get access token
  const tokenRes = await fetch('https://oauth.fatsecret.com/connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=client_credentials&scope=basic`,
  });

  if (!tokenRes.ok) throw new Error(`FatSecret auth failed: ${tokenRes.status}`);

  const tokenData = await tokenRes.json();

  // Upload image for recognition
  const formData = new FormData();
  formData.append('image', {
    uri: imageUri,
    type: 'image/jpeg',
    name: 'meal.jpg',
  } as any);

  const recRes = await fetch('https://platform.fatsecret.com/rest/image-recognition/v1', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Content-Type': 'multipart/form-data',
    },
    body: formData,
  });

  if (!recRes.ok) throw new Error(`FatSecret recognition failed: ${recRes.status}`);

  const recData = await recRes.json();

  return (recData.foods || recData.recognized_items || []).map((item: any) => ({
    name: item.food_name || item.name || 'unknown',
    confidence: item.confidence || 0.6,
    portion_grams: item.serving_size_grams || item.grams || 100,
    portion_desc: item.serving_description || `${item.serving_size_grams || 100}g`,
    nutrients: {
      carbs_g: item.carbohydrate || item.carbs || 0,
      protein_g: item.protein || 0,
      fat_g: item.fat || 0,
      calories: item.calories || item.energy_kcal || 0,
    },
  }));
}

export async function analyzeFoodPhoto(imageUri: string): Promise<VisionResult> {
  // Try LogMeal first
  try {
    const items = await callLogMealAPI(imageUri);
    if (items.length > 0) {
      return { items, success: true, provider: 'logmeal' };
    }
  } catch (err) {
    console.log('LogMeal failed, trying FatSecret...', (err as Error).message);
  }

  // Fallback to FatSecret
  try {
    const items = await callFatSecretAPI(imageUri);
    if (items.length > 0) {
      return { items, success: true, provider: 'fatsecret' };
    }
  } catch (err) {
    console.log('FatSecret failed, falling back to local...', (err as Error).message);
  }

  // Final fallback: local-only
  return { items: [], success: false, provider: 'local_only', error: 'All vision APIs unavailable' };
}
