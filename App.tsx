import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { LanguageProvider } from './src/context/LanguageContext';
import { useNetworkSync } from './src/utils/useNetworkSync';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppFonts } from './src/lib/fonts';

import LoginScreen from './src/screens/LoginScreen';
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

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef<any>();

/** Floating one-tap Emergency (SOS) button — visible on every parent screen. */
function EmergencyFab() {
  const { user, role } = useAuth();
  if (!user || role === 'clinician') return null;
  return (
    <TouchableOpacity
      style={styles.fab}
      activeOpacity={0.85}
      onPress={() => { if (navigationRef.isReady()) navigationRef.navigate('Emergency'); }}
    >
      <Text style={styles.fabEmoji}>🆘</Text>
      <Text style={styles.fabText}>Emergency</Text>
    </TouchableOpacity>
  );
}

function AppNavigator() {
  const { user, role } = useAuth();
  useNetworkSync(60000);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!user ? (
        <>
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
        </>
      ) : role === 'clinician' ? (
        <>
          <Stack.Screen name="ClinicianPatientList" component={ClinicianPatientListScreen} />
          <Stack.Screen name="ClinicianPatientDetail" component={ClinicianPatientDetailScreen} />
          <Stack.Screen name="HealthCenters" component={HealthCentersScreen} />
          <Stack.Screen name="Settings" component={SettingsScreen} />
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
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  useAppFonts();
  return (
    <SafeAreaProvider>
      <LanguageProvider>
        <AuthProvider>
          <ErrorBoundary>
            <View style={{ flex: 1 }}>
              <NavigationContainer ref={navigationRef}>
                <AppNavigator />
              </NavigationContainer>
              <EmergencyFab />
            </View>
          </ErrorBoundary>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 96,
    backgroundColor: '#C0392B',
    borderRadius: 28,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
  },
  fabEmoji: { fontSize: 16 },
  fabText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
