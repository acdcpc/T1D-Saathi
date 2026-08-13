// Deep-link handling for T1D Saathi (expo-linking).
// Supported links:
//   com.t1dsaathi.app://patient/<id>   → open that patient's dashboard
//   com.t1dsaathi.app://emergency     → open emergency screen
//   com.t1dsaathi.app://auth/callback → ignored (handled by WebBrowser OAuth)
import * as Linking from 'expo-linking';
import type { NavigationContainerRef } from '@react-navigation/native';

interface NavRef { current: NavigationContainerRef<any> | null; }

const PREFIX = 'com.t1dsaathi.app://';

function parse(url: string): { route: string; params?: Record<string, string> } | null {
  if (!url || url.includes('/auth/callback')) return null;
  const path = url.replace(PREFIX, '').replace(/^\/+/, '').replace(/\/+$/, '');
  if (!path) return null;
  const [route, param] = path.split('/');
  return { route, params: param ? { id: param } : undefined };
}

export function configureDeepLinks(navigationRef: NavRef) {
  const handler = (url: string | null) => {
    if (!url) return;
    const parsed = parse(url);
    if (!parsed) return;
    if (!navigationRef.current?.isReady()) return;
    // Route 'patient/<id>' → open PatientTabs; 'emergency' → Emergency screen.
    if (parsed.route === 'patient' && parsed.params?.id) {
      navigationRef.current.navigate('PatientTabs', { patientId: parsed.params.id } as any);
    } else if (parsed.route === 'emergency') {
      navigationRef.current.navigate('Emergency');
    }
  };

  const sub = Linking.addEventListener('url', ({ url }) => handler(url));
  Linking.getInitialURL().then(handler);
  return () => sub.remove();
}
