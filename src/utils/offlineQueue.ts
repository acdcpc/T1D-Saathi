// Local-first offline queue for glucose & meal logs
// Buffers entries in AsyncStorage, syncs to Supabase on reconnect

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { GlucoseLog } from '../types';

const QUEUE_KEY = '@t1d_offline_queue';
const LAST_SYNC_KEY = '@t1d_last_sync';

interface QueuedEntry {
  id: string;
  table: 'glucose_logs' | 'ketone_logs' | 'meal_logs' | 'sick_day_episodes';
  payload: Record<string, any>;
  queued_at: string;
  retries: number;
}

export async function enqueue(table: QueuedEntry['table'], payload: Record<string, any>): Promise<void> {
  const entry: QueuedEntry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    table,
    payload,
    queued_at: new Date().toISOString(),
    retries: 0,
  };

  const queue = await getQueue();
  queue.push(entry);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

async function getQueue(): Promise<QueuedEntry[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function getQueueLength(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

export async function getLastSyncTime(): Promise<string | null> {
  return AsyncStorage.getItem(LAST_SYNC_KEY);
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  const remaining: QueuedEntry[] = [];

  for (const entry of queue) {
    try {
      const { error } = await supabase.from(entry.table).insert({ ...entry.payload, synced_from_offline: true });
      if (error) {
        if (entry.retries < 3) {
          remaining.push({ ...entry, retries: entry.retries + 1 });
        }
        failed++;
      } else {
        synced++;
      }
    } catch {
      remaining.push({ ...entry, retries: entry.retries + 1 });
      failed++;
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

  return { synced, failed };
}

// Safe insert: tries online first, falls back to offline queue
export async function safeInsert(
  table: QueuedEntry['table'],
  payload: Record<string, any>
): Promise<{ online: boolean; error?: any }> {
  try {
    const { error } = await supabase.from(table).insert(payload);
    if (error) {
      await enqueue(table, payload);
      return { online: false, error };
    }
    return { online: true };
  } catch (err) {
    await enqueue(table, payload);
    return { online: false, error: err };
  }
}
