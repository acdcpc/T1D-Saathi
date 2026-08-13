import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { T, FONT } from '../theme';

const { width } = Dimensions.get('window');
const ONBOARDING_KEY = 't1d_onboarding_done';

const SLIDES = [
  {
    icon: 'heart-outline' as const,
    color: T.blue,
    title_en: 'Your Diabetes Companion',
    title_ne: 'तपाईंको मधुमेह सहयात्री',
    body_en: 'Track glucose, count carbs from photos, and follow ISPAD 2022 guidance — all in Nepali and English.',
    body_ne: 'ग्लुकोज ट्र्याक गर्नुहोस्, फोटोबाट कार्ब गन्नुहोस्, र ISPAD 2022 दिशानिर्देश पालना गर्नुहोस्।',
  },
  {
    icon: 'camera-outline' as const,
    color: T.teal,
    title_en: 'Photo Your Food',
    title_ne: 'खानाको फोटो खिच्नुहोस्',
    body_en: 'Snap a photo of a dal-bhat plate and get an instant carb estimate and suggested insulin dose.',
    body_ne: 'दाल-भातको फोटो खिच्नुहोस् र तुरुन्तै कार्ब अनुमान र सुझाव गरिएको इन्सुलिन डोज पाउनुहोस्।',
  },
  {
    icon: 'medical-outline' as const,
    color: T.red,
    title_en: 'Help in Emergencies',
    title_ne: 'आपतकालमा सहयोग',
    body_en: 'One-tap emergency protocols, a 24/7 helpline, and sick-day guidance when your child is unwell.',
    body_ne: 'एक-ट्याप आपतकालीन प्रोटोकल, २४/७ हेल्पलाइन, र बिरामी हुँदा सिक-डे मार्गदर्शन।',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    (async () => {
      const done = await AsyncStorage.getItem(ONBOARDING_KEY);
      if (done === '1') navigation.replace('Login');
    })();
  }, [navigation]);

  const finish = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    navigation.replace('Login');
  };

  const s = SLIDES[idx];
  const last = idx === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <View>
            <Text style={styles.brand}>T1D साथी</Text>
            <Text style={styles.brandTagline}>{isNe ? 'तपाईंको मधुमेह सहयात्री' : 'Your Diabetes Companion'}</Text>
          </View>
          <TouchableOpacity onPress={finish}>
            <Text style={styles.skip}>{isNe ? 'छोड्नुहोस्' : 'Skip'}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.iconWrap, { backgroundColor: s.color + '22' }]}>
          <Ionicons name={s.icon} size={72} color={s.color} />
        </View>

        <Text style={styles.title}>{isNe ? s.title_ne : s.title_en}</Text>
        <Text style={styles.body}>{isNe ? s.body_ne : s.body_en}</Text>

        <View style={styles.dots}>
          {SLIDES.map((_, i) => (
            <View key={i} style={[styles.dot, i === idx && styles.dotActive]} />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={() => (last ? finish() : setIdx(idx + 1))}>
          <Text style={styles.nextText}>
            {last ? (isNe ? 'सुरु गर्नुहोस्' : 'Get Started') : (isNe ? 'अर्को' : 'Next')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { flexGrow: 1, padding: 24, alignItems: 'center', justifyContent: 'center' },
  topRow: { position: 'absolute', top: 16, left: 24, right: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 18, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  brandTagline: { fontSize: 12, fontFamily: FONT.medium, color: T.blue, marginTop: 1 },
  skip: { fontSize: 14, fontFamily: FONT.semibold, color: T.muted },
  iconWrap: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, textAlign: 'center', marginBottom: 12 },
  body: { fontSize: 15, fontFamily: FONT.regular, color: T.muted, textAlign: 'center', lineHeight: 22, maxWidth: width - 64 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 32 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: T.border },
  dotActive: { backgroundColor: T.blue, width: 22 },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.blue, borderRadius: 28,
    paddingVertical: 14, paddingHorizontal: 28, marginTop: 24,
  },
  nextText: { color: '#fff', fontSize: 16, fontFamily: FONT.bold, fontWeight: '700' },
});
