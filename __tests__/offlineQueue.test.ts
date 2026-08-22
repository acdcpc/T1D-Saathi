import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../src/lib/supabase';
import {
  clearOfflineQueue,
  enqueue,
  getConflictedEntries,
  getQueueLength,
  safeInsert,
  syncOfflineQueue,
} from '../src/utils/offlineQueue';

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: { getUser: jest.fn() },
    from: jest.fn(),
  },
}));

const storage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;
const authGetUser = supabase.auth.getUser as jest.Mock;
const from = supabase.from as jest.Mock;
const values = new Map<string, string>();

function useUser(id: string | null) {
  authGetUser.mockResolvedValue({ data: { user: id ? { id } : null } });
}

function mockStorage() {
  storage.getItem.mockImplementation(async (key) => values.get(key) ?? null);
  storage.setItem.mockImplementation(async (key, value) => {
    values.set(key, value);
  });
  storage.removeItem.mockImplementation(async (key) => {
    values.delete(key);
  });
}

function mockInsert(result: { error?: { status?: number; message: string } } | Error) {
  from.mockReturnValue({
    insert: jest.fn().mockImplementation(() =>
      result instanceof Error ? Promise.reject(result) : Promise.resolve(result),
    ),
  });
}

describe('offline queue security and synchronization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    values.clear();
    mockStorage();
    useUser('user-a');
  });

  it('isolates queued health data by authenticated account', async () => {
    await enqueue('glucose_logs', { client_event_id: 'event-a', glucose: 120 });
    expect(await getQueueLength()).toBe(1);

    useUser('user-b');
    expect(await getQueueLength()).toBe(0);

    useUser('user-a');
    expect(await getQueueLength()).toBe(1);
  });

  it('preserves a caller-supplied client event ID for server-side idempotency', async () => {
    mockInsert({});

    const result = await safeInsert('glucose_logs', {
      client_event_id: 'stable-event',
      glucose: 135,
    });

    expect(result).toEqual({ online: true, queued: false });
    expect(from).toHaveBeenCalledWith('glucose_logs');
    expect(from.mock.results[0].value.insert).toHaveBeenCalledWith({
      client_event_id: 'stable-event',
      glucose: 135,
    });
  });

  it('retries transport failures but does not silently drop the entry', async () => {
    await enqueue('glucose_logs', { client_event_id: 'network-event', glucose: 140 });
    mockInsert(new Error('Network request failed'));

    await expect(syncOfflineQueue()).resolves.toEqual({ synced: 0, failed: 1, discarded: 0 });
    expect(await getQueueLength()).toBe(1);
    expect(await getConflictedEntries()).toEqual([]);
  });

  it('dead-letters non-transport failures instead of retrying them', async () => {
    await enqueue('glucose_logs', { client_event_id: 'rls-event', glucose: 140 });
    mockInsert({ error: { status: 403, message: 'new row violates row-level security policy' } });

    await expect(syncOfflineQueue()).resolves.toEqual({ synced: 0, failed: 0, discarded: 1 });
    await expect(getConflictedEntries()).resolves.toEqual([
      expect.objectContaining({
        id: 'rls-event',
        conflicted: true,
        conflict_reason: expect.stringContaining('row-level security'),
      }),
    ]);
  });

  it('clears only the signed-in account queue on sign-out', async () => {
    await enqueue('glucose_logs', { client_event_id: 'event-a', glucose: 120 });
    useUser('user-b');
    await enqueue('glucose_logs', { client_event_id: 'event-b', glucose: 121 });

    await clearOfflineQueue();
    expect(await getQueueLength()).toBe(0);

    useUser('user-a');
    expect(await getQueueLength()).toBe(1);
  });
});
