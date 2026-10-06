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
          tabBarActiveTintColor: T.blue,
          tabBarInactiveTintColor: T.muted,
          tabBarStyle: {
            backgroundColor: '#FFFFFF',
            borderTopColor: T.border,
            height: 68,
            paddingBottom: 10,
            paddingTop: 8,
          },
          tabBarLabelStyle: { fontSize: 12, fontWeight: '700', fontFamily: FONT.semibold },
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? ICONS[route.name].filled : ICONS[route.name].outline}
              size={size + 2}
              color={color}
            />
          ),
        })}
      >
        <Tab.Screen name="Dashboard" component={PatientDashboard} options={{ tabBarLabel: isNe ? 'गृह' : 'Home' }} />
        <Tab.Screen name="Log" component={LogGlucoseScreen} options={{ tabBarLabel: isNe ? 'ग्लुकोज' : 'Glucose' }} />
        <Tab.Screen name="Food" component={FoodEstimatorScreen} options={{ tabBarLabel: isNe ? 'खाना' : 'Food' }} />
        <Tab.Screen
          name="Learn"
          component={EducationScreen}
          options={{
            tabBarLabel: isNe ? 'सिकाइ' : 'Learn',
            tabBarButton: () => null,
            tabBarItemStyle: { display: 'none' },
          }}
        />
      </Tab.Navigator>
    </PatientProvider>
  );
}
