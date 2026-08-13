// App version check / force-update gate (checks a Supabase app_versions table).
import Constants from 'expo-constants';
import { supabase } from '../lib/supabase';

export interface VersionStatus {
  current: string;
  latest: string;
  minRequired: string;
  updateRecommended: boolean;
  updateRequired: boolean;
}

const CURRENT = Constants.expoConfig?.version || '1.0.0';

function cmp(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] || 0) - (pb[i] || 0);
    if (d !== 0) return d;
  }
  return 0;
}

/** Returns version status; resolves to null (no gate) if the table is unavailable. */
export async function checkAppVersion(): Promise<VersionStatus | null> {
  try {
    const { data, error } = await supabase
      .from('app_versions')
      .select('latest, min_required')
      .limit(1)
      .maybeSingle();
    if (error || !data) return null;
    const latest = data.latest as string;
    const minRequired = data.min_required as string;
    return {
      current: CURRENT,
      latest,
      minRequired,
      updateRecommended: cmp(CURRENT, latest) < 0,
      updateRequired: cmp(CURRENT, minRequired) < 0,
    };
  } catch {
    return null;
  }
}
