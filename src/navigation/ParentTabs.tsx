import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { PatientProvider } from '../context/PatientContext';
import { useLanguage } from '../context/LanguageContext';
import { T } from '../theme';
import PatientDashboard from '../screens/PatientDashboard';
import LogGlucoseScreen from '../screens/LogGlucoseScreen';
import FoodEstimatorScreen from '../screens/FoodEstimatorScreen';
import EducationScreen from '../screens/EducationScreen';
import type { PatientProfile } from '../types';

const Tab = createBottomTabNavigator();

const ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Dashboard: 'home-outline',
  Log: 'water-outline',
  Food: 'camera-outline',
  Learn: 'book-outline',
};

/**
 * Patient-scoped bottom tab navigation:
 * Home | Log | Food | Learn  (Emergency stays a global SOS FAB).
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
          tabBarActiveTintColor: T.blue,
          tabBarInactiveTintColor: T.muted,
          tabBarStyle: {
            backgroundColor: T.surface,
            borderTopColor: T.border,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={ICONS[route.name]} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ tabBarLabel: isNe ? 'गृह' : 'Home' }} />
        <Tab.Screen name="Log" component={LogGlucoseScreen} options={{ tabBarLabel: isNe ? 'लग' : 'Log' }} />
        <Tab.Screen name="Food" component={FoodEstimatorScreen} options={{ tabBarLabel: isNe ? 'खाना' : 'Food' }} />
        <Tab.Screen name="Learn" component={EducationScreen} options={{ tabBarLabel: isNe ? 'सिकाइ' : 'Learn' }} />
      </Tab.Navigator>
    </PatientProvider>
  );
}
