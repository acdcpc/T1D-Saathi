import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

let lastToken: string | null = null;

const EAS_PROJECT_ID = '71830608-fcdf-4f3e-bee8-f5597571031e';

/** Register this device for remote caregiver alerts (silent; only when permission is already granted). */
export async function registerPushToken(userId: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') return false;
    const projectId = (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId || EAS_PROJECT_ID;
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token) return false;
    lastToken = token;
    await supabase.from('push_tokens').upsert(
      { user_id: userId, expo_push_token: token, platform: Platform.OS, updated_at: new Date().toISOString() },
      { onConflict: 'expo_push_token' },
    );
    return true;
  } catch {
    return false;
  }
}

/** Ask the caregivers' devices to show a low-glucose alert (best effort, never blocks logging). */
export async function sendPushAlertToCaregivers(patientId: string, value: string): Promise<void> {
  try {
    await supabase.functions.invoke('notify-caregivers', {
      body: { patient_id: patientId, value, sender_token: lastToken },
    });
  } catch { /* best effort */ }
}
