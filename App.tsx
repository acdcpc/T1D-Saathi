import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { PreferencesProvider } from './src/context/PreferencesContext';
import { StaffViewProvider, useStaffView } from './src/context/StaffViewContext';
import { useNetworkSync } from './src/utils/useNetworkSync';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from './src/lib/fonts';
import { configureDeepLinks } from './src/utils/deepLinks';
import { installCrashReporting } from './src/utils/crashReporting';
import { useShakeDetector } from './src/hooks/useShakeDetector';

import LoginScreen from './src/screens/LoginScreen';
import ResetPasswordScreen from './src/screens/ResetPasswordScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import HomeScreen from './src/screens/HomeScreen';
import AddPatientScreen from './src/screens/AddPatientScreen';
import ParentTabs from './src/navigation/ParentTabs';
import SickDayWizardScreen from './src/screens/SickDayWizardScreen';
import HealthCentersScreen from './src/screens/HealthCentersScreen';
import HelplineScreen from './src/screens/HelplineScreen';
import QuizScreen from './src/screens/QuizScreen';
import MessagesScreen from './src/screens/MessagesScreen';
import EmergencyScreen from './src/screens/EmergencyScreen';
import ErrorBoundary from './src/components/ErrorBoundary';
import SettingsScreen from './src/screens/SettingsScreen';
import RegimenSettingsScreen from './src/screens/RegimenSettingsScreen';
import ClinicianPatientListScreen from './src/screens/ClinicianPatientListScreen';
import ClinicianPatientDetailScreen from './src/screens/ClinicianPatientDetailScreen';
import BarcodeScannerScreen from './src/screens/BarcodeScannerScreen';
import CommunityScreen from './src/screens/CommunityScreen';
import ConsentScreen from './src/screens/ConsentScreen';
import InviteClinicianScreen from './src/screens/InviteClinicianScreen';
import AdminConsoleScreen from './src/screens/AdminConsoleScreen';

const Stack = createNativeStackNavigator();

/** Shown while the user's role resolves — avoids a transient family-stack flash for staff accounts. */
function RoleSplash() {
  return (
    <View style={{ flex: 1, backgroundColor: '#F7F1EB', alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: '800', color: '#0B5E58' }}>Sano Bir</Text>
      <ActivityIndicator color="#0D9488" style={{ marginTop: 14 }} />
    </View>
  );
}
const navigationRef = createNavigationContainerRef<any>();

/** Global side-effects that need the navigation context (shake-to-emergency). */
function GlobalHandlers() {
  useShakeDetector(true);
  return null;
}

function AppNavigator() {
  const { user, role, recoveryMode } = useAuth();
  const { personalView } = useStaffView();
  useNetworkSync(60000);

  // Flipping between the clinician console and the family side must land on the
  // new stack's initial route. Without a fresh key, React Navigation keeps the
  // current route (ClinicianPatientList exists in both stacks), so the switch
  // looks like a no-op on device and web.
  const navigatorKey = role === 'clinician' && !personalView ? 'clinician' : 'family';

  // Device-proven gap (A24, v10): changing the Navigator key alone does NOT
  // re-land the stack on the target route (the current route state is kept, so
  // the console/user-side flip looked like a no-op). When personalView flips,
  // force the root route explicitly after the screen-set swaps.
  const prevPersonalViewRef = useRef(personalView);
  useEffect(() => {
    if (prevPersonalViewRef.current === personalView) return;
    prevPersonalViewRef.current = personalView;
    if (!user || !role) return;
    const target = role === 'clinician' && !personalView ? 'ClinicianPatientList' : 'Home';
    const t = setTimeout(() => {
      if (navigationRef.current?.isReady()) {
        navigationRef.current.resetRoot({ index: 0, routes: [{ name: target }] });
      }
    }, 60);
    return () => clearTimeout(t);
  }, [personalView, user, role]);

  return (
    <Stack.Navigator key={navigatorKey} screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : recoveryMode ? (
        <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
      ) : !role ? (
        <Stack.Screen name="RoleSplash" component={RoleSplash} />
      ) : role === 'clinician' && !personalView ? (
        <>
          <Stack.Screen name="ClinicianPatientList" component={ClinicianPatientListScreen} />
          <Stack.Screen name="ClinicianPatientDetail" component={ClinicianPatientDetailScreen} />
          <Stack.Screen name="AdminConsole" component={AdminConsoleScreen} />
          <Stack.Screen name="HealthCenters" component={HealthCentersScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Consent" component={ConsentScreen} />
        </>
      ) : (
        <>
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="AddPatient" component={AddPatientScreen} />
          <Stack.Screen name="PatientTabs" component={ParentTabs} />
          <Stack.Screen name="SickDayWizard" component={SickDayWizardScreen} />
          <Stack.Screen name="HealthCenters" component={HealthCentersScreen} />
          <Stack.Screen name="Helpline" component={HelplineScreen} />
          <Stack.Screen name="Quiz" component={QuizScreen} />
          <Stack.Screen name="Messages" component={MessagesScreen} />
          <Stack.Screen name="Emergency" component={EmergencyScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="RegimenSettings" component={RegimenSettingsScreen} />
          <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} />
          <Stack.Screen name="Community" component={CommunityScreen} />
          <Stack.Screen name="Consent" component={ConsentScreen} />
          <Stack.Screen name="InviteClinician" component={InviteClinicianScreen} />
          <Stack.Screen name="AdminConsole" component={AdminConsoleScreen} />
          <Stack.Screen name="ClinicianPatientList" component={ClinicianPatientListScreen} />
          <Stack.Screen name="ClinicianPatientDetail" component={ClinicianPatientDetailScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  useAppFonts();

  useEffect(() => {
    installCrashReporting();
    return configureDeepLinks(navigationRef);
  }, []);

  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <PreferencesProvider>
          <AuthProvider>
          <StaffViewProvider>
            <ErrorBoundary>
              <View style={{ flex: 1 }} testID="app-root">
                <NavigationContainer ref={navigationRef}>
                  <AppNavigator />
                  <GlobalHandlers />
                </NavigationContainer>
              </View>
            </ErrorBoundary>
          </StaffViewProvider>
          </AuthProvider>
        </PreferencesProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
