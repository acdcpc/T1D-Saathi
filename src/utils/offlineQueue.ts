// Local-first queue for health logs.
// The queue is account-scoped and retries only transport failures.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

type QueueTable = 'glucose_logs' | 'ketone_logs' | 'meal_logs' | 'sick_day_episodes';
interface QueuedEntry { id: string; table: QueueTable; payload: Record<string, unknown>; queued_at: string; retries: number; }

const QUEUE_PREFIX = '@t1d_offline_queue_v2:';
const LAST_SYNC_PREFIX = '@t1d_last_sync_v2:';
const MAX_QUEUE_SIZE = 250;

async function getKeys() {
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

export async function enqueue(table: QueueTable, payload: Record<string, unknown>): Promise<void> {
  const keys = await getKeys();
  const queue = await getQueue();
  if (queue.length >= MAX_QUEUE_SIZE) throw new Error('Offline queue is full. Connect to the internet before recording more data.');
  const clientEventId = typeof payload.client_event_id === 'string' ? payload.client_event_id : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const entry: QueuedEntry = { id: clientEventId, table, payload: { ...payload, client_event_id: clientEventId }, queued_at: new Date().toISOString(), retries: 0 };
  await AsyncStorage.setItem(keys.queue, JSON.stringify([...queue, entry]));
}

export async function getQueueLength(): Promise<number> {
  try { return (await getQueue()).length; } catch { return 0; }
}

export async function getLastSyncTime(): Promise<string | null> {
  try { const { lastSync } = await getKeys(); return AsyncStorage.getItem(lastSync); } catch { return null; }
}

function isTransportFailure(error: { status?: number; message?: string } | null): boolean {
  if (!error) return false;
  if (typeof error.status === 'number' && error.status >= 400) return false;
  const message = (error.message || '').toLowerCase();
  return message.includes('network') || message.includes('fetch') || message.includes('timeout') || message.includes('offline');
}

export async function syncOfflineQueue(): Promise<{ synced: number; failed: number; discarded: number }> {
  const keys = await getKeys();
  const queue = await getQueue();
  if (queue.length === 0) return { synced: 0, failed: 0, discarded: 0 };
  let synced = 0; let failed = 0; let discarded = 0;
  const remaining: QueuedEntry[] = [];
  for (const entry of queue) {
    const { error } = await supabase.from(entry.table).insert(entry.payload);
    if (!error) { synced++; continue; }
    if (isTransportFailure(error) && entry.retries < 3) { remaining.push({ ...entry, retries: entry.retries + 1 }); failed++; }
    else discarded++;
  }
  await AsyncStorage.setItem(keys.queue, JSON.stringify(remaining));
  await AsyncStorage.setItem(keys.lastSync, new Date().toISOString());
  return { synced, failed, discarded };
}

export async function safeInsert(table: QueueTable, payload: Record<string, unknown>): Promise<{ online: boolean; queued: boolean; error?: unknown }> {
  const clientEventId = typeof payload.client_event_id === 'string' ? payload.client_event_id : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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

export async function clearOfflineQueue(): Promise<void> {
  const keys = await getKeys();
  await Promise.all([AsyncStorage.removeItem(keys.queue), AsyncStorage.removeItem(keys.lastSync)]);
}
