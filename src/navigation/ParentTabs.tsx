import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { PatientProvider } from '../context/PatientContext';
import { useLanguage } from '../context/LanguageContext';
import { FONT, T } from '../theme';
import PatientDashboard from '../screens/PatientDashboard';
import LogGlucoseScreen from '../screens/LogGlucoseScreen';
import FoodEstimatorScreen from '../screens/FoodEstimatorScreen';
import EducationScreen from '../screens/EducationScreen';
import FloatingTabBar from '../components/FloatingTabBar';
import type { PatientProfile } from '../types';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, { outline: keyof typeof Ionicons.glyphMap; filled: keyof typeof Ionicons.glyphMap }> = {
  Dashboard: { outline: 'home-outline', filled: 'home' },
  Log: { outline: 'water-outline', filled: 'water' },
  Food: { outline: 'camera-outline', filled: 'camera' },
  Learn: { outline: 'book-outline', filled: 'book' },
};

/**
 * Patient-scoped bottom tab navigation: Home | Glucose | Food | (Learn hidden for now).
 * The Learn route stays registered (dashboard action still opens it) but has no tab button.
 */
export default function ParentTabs({ route }: any) {
  const { patient } = route.params as { patient: PatientProfile };
  const { language } = useLanguage();
  const isNe = language === 'ne';

  return (
    <PatientProvider value={patient}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
        })}
        tabBar={(props) => <FloatingTabBar {...props} />}
      >
        <Tab.Screen name="Dashboard" component={PatientDashboard} />
        <Tab.Screen name="Log" component={LogGlucoseScreen} />
        <Tab.Screen name="Food" component={FoodEstimatorScreen} />
        <Tab.Screen name="Learn" component={EducationScreen} options={{ tabBarButton: () => null }} />
      </Tab.Navigator>
    </PatientProvider>
  );
}
