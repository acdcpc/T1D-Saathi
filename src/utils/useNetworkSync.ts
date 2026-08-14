// Network connectivity hook — syncs offline queue when online

import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { syncOfflineQueue } from './offlineQueue';

export function useNetworkSync(intervalMs = 60000) {
  const lastSync = useRef(0);

  useEffect(() => {
    // Sync when app comes to foreground
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        const now = Date.now();
        if (now - lastSync.current > intervalMs) {
          lastSync.current = now;
          syncOfflineQueue().then((r) => {
            if (r.discarded > 0) console.warn(`${r.discarded} offline entries require review and were not retried`);
          }).catch(() => undefined);
        }
      }
    });

    // Initial sync
    syncOfflineQueue().then((r) => {
      if (r.discarded > 0) console.warn(`${r.discarded} offline entries require review and were not retried`);
    }).catch(() => undefined);

    // Periodic sync
    const timer = setInterval(() => {
      syncOfflineQueue().then((r) => {
        if (r.discarded > 0) console.warn(`${r.discarded} offline entries require review and were not retried`);
      }).catch(() => undefined);
    }, intervalMs);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [intervalMs]);
}
