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
            if (r.synced > 0) console.log(`Synced ${r.synced} offline entries`);
          });
        }
      }
    });

    // Initial sync
    syncOfflineQueue().then((r) => {
      if (r.synced > 0) console.log(`Initial sync: ${r.synced} entries`);
    });

    // Periodic sync
    const timer = setInterval(() => {
      syncOfflineQueue().then((r) => {
        if (r.synced > 0) console.log(`Periodic sync: ${r.synced} entries`);
      });
    }, intervalMs);

    return () => {
      sub.remove();
      clearInterval(timer);
    };
  }, [intervalMs]);
}
