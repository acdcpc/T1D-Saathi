// Local-first offline queue for glucose, ketone, and meal logs
// Buffers entries in AsyncStorage, syncs to Supabase on reconnect
//
// Conflict resolution: entries are never silently dropped. On sync failure
// after MAX_RETRIES, the entry is marked as 'conflicted' and retained
// for user review rather than discarded. Exponential backoff between retries.
//
// Multi-device conflict: if a caregiver on another device edits the same
// log entry concurrently, the first-inserted version wins at the DB level
// (Supabase unique constraints). The losing entry stays in the local queue
// flagged for user review — it is not silently discarded.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const QUEUE_KEY = '@t1d_offline_queue';
const LAST_SYNC_KEY = '@t1d_last_sync';
const MAX_RETRIES = 5;

export interface QueuedEntry {
  id: string;
  table: 'glucose_logs' | 'ketone_logs' | 'meal_logs' | 'sick_day_episodes';
  payload: Record<string, any>;
  queued_at: string;
  retries: number;
  conflicted?: boolean; // true if permanently failed — kept for user review
  conflict_reason?: string;
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

/**
 * Compute backoff delay for retry N: 2^N seconds, capped at 60s.
 */
function backoffMs(retries: number): number {
  return Math.min(Math.pow(2, retries) * 1000, 60000);
}

/**
 * Sync offline queue to Supabase.
 *
 * Strategy:
 *   - Entries with retries < MAX_RETRIES are attempted with exponential backoff.
 *   - Entries at MAX_RETRIES are marked `conflicted: true` and retained, not dropped.
 *   - Network errors trigger retry; DB constraint violations (rare with new IDs
 *     but possible in multi-device scenarios) are also flagged for review.
 */
export async function syncOfflineQueue(): Promise<{ synced: number; failed: number; conflicted: number }> {
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, conflicted: 0 };

  let synced = 0;
  let failed = 0;
  let conflicted = 0;
  const remaining: QueuedEntry[] = [];
  const now = Date.now();

  for (const entry of queue) {
    // Already conflicted — keep in queue for visibility, don't retry
    if (entry.conflicted) {
      remaining.push(entry);
      conflicted++;
      continue;
    }

    // Apply backoff: only retry if enough time has passed since last attempt
    if (entry.retries > 0) {
      const lastAttempt = new Date(entry.queued_at).getTime();
      const delayMs = backoffMs(entry.retries);
      if (now - lastAttempt < delayMs) {
        remaining.push(entry);
        failed++;
        continue;
      }
    }

    try {
      const { error } = await supabase.from(entry.table).insert({
        ...entry.payload,
        synced_from_offline: true,
      });

      if (error) {
        // DB-level error (possible constraint violation from multi-device)
        if (entry.retries >= MAX_RETRIES - 1) {
          // Max retries reached — mark as conflicted, retain for user review
          remaining.push({
            ...entry,
            retries: entry.retries + 1,
            conflicted: true,
            conflict_reason: error.message,
          });
          conflicted++;
        } else {
          remaining.push({ ...entry, retries: entry.retries + 1 });
          failed++;
        }
      } else {
        synced++;
        // Entry synced successfully — do not keep in queue
      }
    } catch (netErr) {
      // Network error — keep retrying (not a data conflict)
      if (entry.retries >= MAX_RETRIES - 1) {
        remaining.push({
          ...entry,
          retries: entry.retries + 1,
          conflicted: true,
          conflict_reason: `Network error after ${MAX_RETRIES} retries: ${(netErr as Error).message}`,
        });
        conflicted++;
      } else {
        remaining.push({ ...entry, retries: entry.retries + 1 });
        failed++;
      }
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

  return { synced, failed, conflicted };
}

/**
 * Get conflicted entries for user-facing review UI.
 */
export async function getConflictedEntries(): Promise<QueuedEntry[]> {
  const queue = await getQueue();
  return queue.filter(e => e.conflicted);
}

/** Mark a conflicted entry for retry (resets retry counter and conflicted flag). */
export async function retryConflictedEntry(id: string): Promise<void> {
  const queue = await getQueue();
  const idx = queue.findIndex((e) => e.id === id);
  if (idx >= 0) {
    queue[idx] = { ...queue[idx], conflicted: false, retries: 0, conflict_reason: undefined };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/** Permanently remove a conflicted entry (explicit user action). */
export async function discardConflictedEntry(id: string): Promise<void> {
  const queue = await getQueue();
  const next = queue.filter((e) => e.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(next));
}

/**
 * Safe insert: tries online first, falls back to offline queue on any error.
 */
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
