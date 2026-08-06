import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { HYPO_THRESHOLD } from '../rules/sickDayRules';
import { T, card, section, avatar } from '../theme';
import type { PatientProfile, GlucoseLog, SickDayEpisode } from '../types';

export default function PatientDashboard({ route, navigation }: any) {
  const { patient }: { patient: PatientProfile } = route.params;
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
  const [latestGlucose, setLatestGlucose] = useState<GlucoseLog | null>(null);
  const [activeSickDay, setActiveSickDay] = useState<SickDayEpisode | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const [{ data: glucose }, { data: sickDay }] = await Promise.all([
      supabase.from('glucose_logs').select('*').eq('patient_id', patient.id).order('timestamp', { ascending: false }).limit(1),
      supabase.from('sick_day_episodes').select('*').eq('patient_id', patient.id).is('end_date', null).order('start_date', { ascending: false }).limit(1),
    ]);
    setLatestGlucose(glucose?.[0] || null);
    setActiveSickDay(sickDay?.[0] || null);
  }, [patient.id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const isHypo = latestGlucose && latestGlucose.value < HYPO_THRESHOLD;

  const actions = [
    { icon: '🩸', label: isNe ? 'ग्लुकोज' : 'Log Glucose', route: 'LogGlucose', border: T.border },
    { icon: '🍽️', label: isNe ? 'खाना र डोज' : 'Food & Dose', route: 'FoodEstimator', border: T.teal },
    { icon: '🤒', label: isNe ? 'बिमारी दिन' : 'Sick Day', route: 'SickDayWizard', border: T.orange },
    { icon: '💉', label: isNe ? 'इन्सुलिन' : 'Regimen', route: 'RegimenSettings', border: T.border },
    { icon: '📚', label: isNe ? 'शिक्षा' : 'Education', route: 'Education', border: T.border },
    { icon: '🏥', label: isNe ? 'स्वास्थ्य केन्द्र' : 'Nearby Care', route: 'HealthCenters', border: T.border },
    { icon: '📞', label: isNe ? 'हेल्पलाइन' : 'Helpline', route: 'Helpline', border: T.red },
    { icon: '💬', label: isNe ? 'सन्देश' : 'Messages', route: 'Messages', border: T.border },
    { icon: '🚨', label: isNe ? 'आपतकाल' : 'Emergency', route: 'Emergency', border: T.red },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
      >
        {/* Avatar header — Kapoori Ka ChildDashboard pattern */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAv}>
            <Text style={styles.profileAvText}>
              {patient.name[0]?.toUpperCase()}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.subtitle}>
              {patient.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')} · {patient.sex}
            </Text>
          </View>
        </View>

        {/* Glucose stat card */}
        <View style={[styles.glucoseCard, isHypo && styles.hypoCard]}>
          <Text style={styles.cardLabel}>{isNe ? 'पछिल्लो ग्लुकोज' : 'Latest Glucose'}</Text>
          {latestGlucose ? (
            <View>
              <Text style={[styles.glucoseValue, isHypo && styles.hypoText]}>
                {latestGlucose.value}
                <Text style={styles.unit}> mg/dL</Text>
              </Text>
              <Text style={styles.timestamp}>{new Date(latestGlucose.timestamp).toLocaleString()}</Text>
            </View>
          ) : (
            <Text style={styles.noData}>{isNe ? 'कुनै लग छैन' : t('noLogsYet')}</Text>
          )}
        </View>

        {/* Hypo alert */}
        {isHypo && (
          <View style={styles.hypoAlert}>
            <Text style={styles.hypoAlertTitle}>⚠️ {isNe ? 'हाइपोग्लाइसेमिया' : 'Hypoglycemia Alert'}</Text>
            <Text style={styles.hypoStep}>1. {isNe ? '१५ ग्राम चिनी वा ग्लुकोज खानुहोस्' : 'Take 15g fast-acting glucose'}</Text>
            <Text style={styles.hypoStep}>2. {isNe ? '१५ मिनेट पर्खनुहोस्' : 'Wait 15 minutes'}</Text>
            <Text style={styles.hypoStep}>3. {isNe ? 'पुन: जाँच गर्नुहोस्' : 'Recheck glucose'}</Text>
            <Text style={styles.hypoStep}>4. {isNe ? 'आवश्यक परे ९८५१३५०८८३ मा फोन गर्नुहोस्' : 'Call 9851350883 if needed'}</Text>
          </View>
        )}

        {/* Sick day banner */}
        {activeSickDay && (
          <TouchableOpacity style={styles.sickBanner} onPress={() => navigation.navigate('SickDayWizard', { patientId: patient.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>🤒</Text>
              <View>
                <Text style={styles.sickBannerTitle}>{isNe ? 'सक्रिय बिमारी दिन' : 'Active Sick Day'}</Text>
                <Text style={styles.sickBannerSub}>{isNe ? 'निगरानी जारी छ · थिच्नुहोस्' : 'Monitoring in progress · Tap to continue'} ›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Action grid — Kapoori Ka pattern */}
        <Text style={styles.sectionLabel}>
          {isNe ? 'द्रुत कार्यहरू' : t('quickLog')}
        </Text>
        <View style={styles.actionGrid}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { borderColor: a.border, borderWidth: a.border !== T.border ? 2 : 1 }]}
              onPress={() => navigation.navigate(a.route, { patientId: patient.id })}
              activeOpacity={0.7}
            >
              <Text style={styles.actionIcon}>{a.icon}</Text>
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },

  // Profile header — Kapoori Ka pattern
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileAv: {
    ...avatar,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: T.blueLight,
  },
  profileAvText: { fontSize: 26, fontWeight: '700', color: T.blue },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontWeight: '800', color: T.text },
  subtitle: { fontSize: 14, color: T.muted, marginTop: 2 },

  // Glucose card
  glucoseCard: { ...card },
  hypoCard: { backgroundColor: T.redLight, borderWidth: 2, borderColor: T.red },
  cardLabel: { ...section, marginTop: 0, marginBottom: 6 },
  glucoseValue: { fontSize: 42, fontWeight: '700', color: T.text },
  unit: { fontSize: 18, fontWeight: '400', color: T.muted },
  hypoText: { color: T.red },
  timestamp: { fontSize: 12, color: T.muted, marginTop: 4 },
  noData: { fontSize: 15, color: T.muted, fontStyle: 'italic' },

  // Hypo alert
  hypoAlert: { backgroundColor: T.redLight, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: T.red },
  hypoAlertTitle: { fontSize: 16, fontWeight: '700', color: T.redDark, marginBottom: 8 },
  hypoStep: { fontSize: 13, color: T.text, paddingVertical: 2, paddingLeft: 4, lineHeight: 20 },

  // Sick banner
  sickBanner: { ...card, borderWidth: 1, borderColor: T.orange },
  sickBannerTitle: { fontSize: 15, fontWeight: '700', color: T.amberDark },
  sickBannerSub: { fontSize: 13, color: T.muted, marginTop: 2 },

  // Action grid
  sectionLabel: { ...section, paddingHorizontal: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '30%',
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionText: { fontSize: 11, fontWeight: '600', color: T.text, textAlign: 'center' },
});
