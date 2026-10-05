import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export interface ReminderTimes {
  preMeal: boolean;   // 7am, 12pm, 7pm
  bedtime: boolean;   // 9pm
}

const REMINDER_IDS = {
  breakfast: 't1d_rem_breakfast',
  lunch: 't1d_rem_lunch',
  dinner: 't1d_rem_dinner',
  bedtime: 't1d_rem_bedtime',
};

async function ensurePermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

async function scheduleDaily(id: string, title: string, body: string, hour: number, minute: number) {
  await Notifications.cancelScheduledNotificationAsync(id);
  await Notifications.scheduleNotificationAsync({
    identifier: id,
    content: { title, body },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
  });
}

/** Schedules (or clears) pre-meal + bedtime glucose-check reminders. */
export async function configureReminders(enabled: ReminderTimes): Promise<boolean> {
  if (Platform.OS === 'web') {
    console.info('[Reminders] Local notifications are not supported in the browser.');
    return false;
  }
  if (!enabled.preMeal && !enabled.bedtime) {
    for (const id of Object.values(REMINDER_IDS)) await Notifications.cancelScheduledNotificationAsync(id);
    await saveReminderPrefs(enabled);
    return true;
  }
  const ok = await ensurePermission();
  if (!ok) return false;

  if (enabled.preMeal) {
    await scheduleDaily(REMINDER_IDS.breakfast, 'Check Glucose', 'Pre-meal check — before breakfast (7 AM).', 7, 0);
    await scheduleDaily(REMINDER_IDS.lunch, 'Check Glucose', 'Pre-meal check — before lunch (12 PM).', 12, 0);
    await scheduleDaily(REMINDER_IDS.dinner, 'Check Glucose', 'Pre-meal check — before dinner (7 PM).', 19, 0);
  } else {
    for (const id of [REMINDER_IDS.breakfast, REMINDER_IDS.lunch, REMINDER_IDS.dinner]) {
      await Notifications.cancelScheduledNotificationAsync(id);
    }
  }

  if (enabled.bedtime) {
    await scheduleDaily(REMINDER_IDS.bedtime, '🌙 Bedtime Check', 'Evening glucose check (9 PM).', 21, 0);
  } else {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDS.bedtime);
  }
  await saveReminderPrefs(enabled);
  return true;
}

const PREFS_KEY = '@t1d_reminder_prefs_v1';

export interface NextReminder {
  key: 'breakfast' | 'lunch' | 'dinner' | 'bedtime';
  hour: number;
  minute: number;
}

/** Persisted reminder toggles (survive app restarts). */
export async function loadReminderPrefs(): Promise<ReminderTimes> {
  try {
    const raw = await AsyncStorage.getItem(PREFS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { preMeal: !!parsed.preMeal, bedtime: !!parsed.bedtime };
    }
  } catch { /* ignore */ }
  return { preMeal: false, bedtime: false };
}

export async function saveReminderPrefs(prefs: ReminderTimes): Promise<void> {
  try { await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
}

/** Next scheduled reminder based on enabled toggles (times: 7/12/19/21). */
export function getNextReminder(prefs: ReminderTimes, now = new Date()): NextReminder | null {
  const candidates: NextReminder[] = [];
  if (prefs.preMeal) {
    candidates.push({ key: 'breakfast', hour: 7, minute: 0 });
    candidates.push({ key: 'lunch', hour: 12, minute: 0 });
    candidates.push({ key: 'dinner', hour: 19, minute: 0 });
  }
  if (prefs.bedtime) candidates.push({ key: 'bedtime', hour: 21, minute: 0 });
  if (candidates.length === 0) return null;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const sorted = [...candidates].sort((a, b) => (a.hour * 60 + a.minute) - (b.hour * 60 + b.minute));
  return sorted.find((c) => c.hour * 60 + c.minute > minutesNow) ?? sorted[0];
}

export interface CustomReminder {
  id: string;
  label: string;
  hour: number;
  minute: number;
  weekdays: number[]; // 1=Sunday ... 7=Saturday
}

const CUSTOM_KEY = '@t1d_c…s_v1';

export async function loadCustomReminders(): Promise<CustomReminder[]> {
  try {
    const raw = await AsyncStorage.getItem(CUSTOM_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCustomReminders(list: CustomReminder[]): Promise<void> {
  try { await AsyncStorage.setItem(CUSTOM_KEY, JSON.stringify(list)); } catch { /* ignore */ }
}

/** Re-schedule local notifications for the custom reminder list (weekly per weekday). */
export async function syncCustomReminderNotifications(list: CustomReminder[]): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const existing = await Notifications.getAllScheduledNotificationsAsync();
    for (const n of existing) {
      if (n.identifier.startsWith('t1d_custom_')) {
        await Notifications.cancelScheduledNotificationAsync(n.identifier);
      }
    }
    if (list.length === 0) return true;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return false;
    for (const r of list) {
      for (const wd of r.weekdays) {
        await Notifications.scheduleNotificationAsync({
          identifier: `t1d_custom_${r.id}_${wd}`,
          content: { title: r.label || 'Reminder', body: r.label || 'T1D Saathi reminder' },
          trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: wd, hour: r.hour, minute: r.minute } as any,
        });
      }
    }
    return true;
  } catch {
    return false;
  }
}
