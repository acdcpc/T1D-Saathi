import * as Notifications from 'expo-notifications';

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
  if (!enabled.preMeal && !enabled.bedtime) {
    for (const id of Object.values(REMINDER_IDS)) await Notifications.cancelScheduledNotificationAsync(id);
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
  return true;
}
