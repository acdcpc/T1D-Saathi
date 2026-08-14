// Local-first offline queue for health logs.
// - Account-scoped (keyed by the authenticated user id).
// - Idempotent (every event carries a client_event_id, deduped server-side).
// - Retries ONLY transport/network failures with exponential backoff.
// - Non-transport failures (RLS, validation, schema, auth) are never retried:
//   they move to a dead-letter ("conflicted") state and are surfaced for review.
// - Nothing is silently dropped: dead-letter entries stay until the user
//   explicitly discards them.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

type QueueTable = 'glucose_logs' | 'ketone_logs' | 'meal_logs' | 'sick_day_episodes';

export interface QueuedEntry {
  id: string;               // client_event_id (idempotency key)
  table: QueueTable;
  payload: Record<string, unknown>;
  queued_at: string;
  retries: number;
  last_attempt_at?: string;
  conflicted?: boolean;     // dead-letter — retained for user review
  conflict_reason?: string;
}

const QUEUE_PREFIX = '@t1d_offline_queue_v2:';
const LAST_SYNC_PREFIX = '@t1d_last_sync_v2:';
const MAX_QUEUE_SIZE = 250;
const MAX_RETRIES = 5;

async function getKeys(): Promise<{ queue: string; lastSync: string }> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new Error('Authentication is required for offline health data.');
  return { queue: `${QUEUE_PREFIX}${userId}`, lastSync: `${LAST_SYNC_PREFIX}${userId}` };
}

async function getQueue(): Promise<QueuedEntry[]> {
  const { queue: key } = await getKeys();
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    await AsyncStorage.removeItem(key);
    return [];
  }
}

/** Exponential backoff: 2^N seconds, capped at 60s. */
function backoffMs(retries: number): number {
  return Math.min(Math.pow(2, retries) * 1000, 60000);
}

/** True only for network/transport failures — these are safe to retry. */
function isTransportFailure(error: { status?: number; message?: string } | null): boolean {
  if (!error) return false;
  if (typeof error.status === 'number' && error.status >= 400) return false;
  const message = (error.message || '').toLowerCase();
  return (
    message.includes('network') || message.includes('fetch') ||
    message.includes('timeout') || message.includes('offline') ||
    message.includes('connection') || message.includes('unreachable')
  );
}

export async function enqueue(table: QueueTable, payload: Record<string, unknown>): Promise<void> {
  const keys = await getKeys();
  const queue = await getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) {
    throw new Error('Offline queue is full. Connect to the internet before recording more data.');
  }
  const clientEventId =
    typeof payload.client_event_id === 'string'
      ? payload.client_event_id
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const entry: QueuedEntry = {
    id: clientEventId,
    table,
    payload: { ...payload, client_event_id: clientEventId },
    queued_at: new Date().toISOString(),
    retries: 0,
  };
  await AsyncStorage.setItem(keys.queue, JSON.stringify([...queue, entry]));
}

export async function getQueueLength(): Promise<number> {
  try { return (await getQueue()).length; } catch { return 0; }
}

export async function getLastSyncTime(): Promise<string | null> {
  try {
    const { lastSync } = await getKeys();
    return AsyncStorage.getItem(lastSync);
  } catch { return null; }
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number; discarded: number }> {
  const keys = await getKeys();
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, discarded: 0 };

  let synced = 0;
  let failed = 0;
  let discarded = 0;
  const remaining: QueuedEntry[] = [];
  const now = Date.now();

  for (const entry of queue) {
    if (entry.conflicted) {
      remaining.push(entry);
      discarded++;
      continue;
    }

    if (entry.retries > 0) {
      const lastAttempt = entry.last_attempt_at
        ? new Date(entry.last_attempt_at).getTime()
        : new Date(entry.queued_at).getTime();
      if (now - lastAttempt < backoffMs(entry.retries)) {
        remaining.push(entry);
        failed++;
        continue;
      }
    }

    try {
      const { error } = await supabase.from(entry.table).insert(entry.payload);
      if (!error) {
        synced++;
        continue;
      }
      // Non-transport (RLS/validation/schema/auth) -> dead-letter immediately, never retry.
      remaining.push({
        ...entry,
        retries: entry.retries + 1,
        conflicted: true,
        conflict_reason: error.message,
        last_attempt_at: new Date().toISOString(),
      });
      discarded++;
    } catch (netErr) {
      // Transport failure -> retry with backoff, then dead-letter.
      if (entry.retries < MAX_RETRIES) {
        remaining.push({ ...entry, retries: entry.retries + 1, last_attempt_at: new Date().toISOString() });
        failed++;
      } else {
        remaining.push({
          ...entry,
          retries: entry.retries + 1,
          conflicted: true,
          conflict_reason: `Network error after ${MAX_RETRIES} retries: ${(netErr as Error).message}`,
          last_attempt_at: new Date().toISOString(),
        });
        discarded++;
      }
    }
  }

  await AsyncStorage.setItem(keys.queue, JSON.stringify(remaining));
  await AsyncStorage.setItem(keys.lastSync, new Date().toISOString());
  return { synced, failed, discarded };
}

/**
 * Insert online first; queue only transport failures. Non-transport errors are
 * returned to the caller immediately so they can be surfaced to the user.
 */
export async function safeInsert(
  table: QueueTable,
  payload: Record<string, unknown>
): Promise<{ online: boolean; queued: boolean; error?: unknown }> {
  const clientEventId =
    typeof payload.client_event_id === 'string'
      ? payload.client_event_id
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const data = { ...payload, client_event_id: clientEventId };
  try {
    const { error } = await supabase.from(table).insert(data);
    if (!error) return { online: true, queued: false };
    if (!isTransportFailure(error)) return { online: false, queued: false, error };
    await enqueue(table, data);
    return { online: false, queued: true, error };
  } catch (error) {
    await enqueue(table, data);
    return { online: false, queued: true, error };
  }
}

/** Clear the current account's queue (called on sign-out). */
export async function clearOfflineQueue(): Promise<void> {
  try {
    const keys = await getKeys();
    await Promise.all([AsyncStorage.removeItem(keys.queue), AsyncStorage.removeItem(keys.lastSync)]);
  } catch {
    /* not signed in — nothing to clear */
  }
}

/** Dead-letter entries for user-facing review. */
export async function getConflictedEntries(): Promise<QueuedEntry[]> {
  try { return (await getQueue()).filter((e) => e.conflicted); } catch { return []; }
}

/** Reset a dead-letter entry for retry (clears conflicted flag + retry counter). */
export async function retryConflictedEntry(id: string): Promise<void> {
  try {
    const keys = await getKeys();
    const queue = await getQueue();
    const idx = queue.findIndex((e) => e.id === id);
    if (idx >= 0) {
      queue[idx] = { ...queue[idx], conflicted: false, retries: 0, conflict_reason: undefined };
      await AsyncStorage.setItem(keys.queue, JSON.stringify(queue));
    }
  } catch { /* no-op */ }
}

/** Permanently remove a dead-letter entry (explicit user action only). */
export async function discardConflictedEntry(id: string): Promise<void> {
  try {
    const keys = await getKeys();
    const queue = await getQueue();
    await AsyncStorage.setItem(keys.queue, JSON.stringify(queue.filter((e) => e.id !== id)));
  } catch { /* no-op */ }
}
