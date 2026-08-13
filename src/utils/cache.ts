// Simple TTL cache backed by AsyncStorage.
import AsyncStorage from '@react-native-async-storage/async-storage';

interface CacheEntry<T> {
  value: T;
  at: number;
}

export async function cacheGet<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;
    const { value, at } = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - at > ttlMs) return null;
    return value;
  } catch {
    return null;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    await AsyncStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    /* ignore */
  }
}
