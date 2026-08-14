// Food-photo analysis boundary.
// Provider credentials and health-image uploads must run server-side. The
// mobile client intentionally does not read EXPO_PUBLIC provider secrets.

export interface VisionFoodItem {
  name: string;
  confidence: number;
  portion_grams: number;
  portion_desc: string;
  nutrients?: { carbs_g: number; protein_g: number; fat_g: number; calories: number };
}

export interface VisionResult {
  items: VisionFoodItem[];
  success: boolean;
  provider: 'server' | 'local_only';
  error?: string;
}

/**
 * Until a privacy-reviewed server endpoint is configured, the app never
 * uploads a child's meal photo. Manual Nepali-food entry remains available.
 */
export async function analyzeFoodPhoto(_imageUri: string): Promise<VisionResult> {
  return {
    items: [],
    success: false,
    provider: 'local_only',
    error: 'Photo analysis is disabled until a privacy-reviewed server endpoint is configured.',
  };
}
