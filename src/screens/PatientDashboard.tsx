import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { supabase } from '../lib/supabase';
import { HYPO_THRESHOLD } from '../rules/sickDayRules';
import { toBSDateTimeDisplay } from '../utils/bsDateDisplay';
import { computeGlucoseStats } from '../utils/glucoseStats';
import { computeIOB } from '../utils/insulinOnBoard';
import { generateGlucoseReport } from '../utils/pdfReport';
import ISPADBadge from '../components/ISPADBadge';
import ChildAvatar from '../components/ChildAvatar';
import DhakaDivider from '../components/DhakaDivider';
import GlucoseTrendChart from '../components/GlucoseTrendChart';
import TirDonut from '../components/TirDonut';
import { usePreferences } from '../context/PreferencesContext';
import { toDisplayNumber } from '../utils/nepaliNumber';
import { FONT,  T, card, section, avatar } from '../theme';
import type { PatientProfile, GlucoseLog, SickDayEpisode } from '../types';

export default function PatientDashboard({ route, navigation }: any) {
  const patient: PatientProfile = usePatient() || (route.params as any)?.patient;
  const { t, language } = useLanguage();
  const { theme: TH } = usePreferences();
  const isNe = language === 'ne';
  const [latestGlucose, setLatestGlucose] = useState<GlucoseLog | null>(null);
  const [history, setHistory] = useState<GlucoseLog[]>([]);
  const [activeSickDay, setActiveSickDay] = useState<SickDayEpisode | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const [{ data: latest }, { data: logs }, { data: sickDay }] = await Promise.all([
      supabase.from('glucose_logs').select('*').eq('patient_id', patient.id).order('timestamp', { ascending: false }).limit(1),
      supabase.from('glucose_logs').select('*').eq('patient_id', patient.id).gte('timestamp', thirtyDaysAgo).order('timestamp', { ascending: true }),
      supabase.from('sick_day_episodes').select('*').eq('patient_id', patient.id).is('end_date', null).order('start_date', { ascending: false }).limit(1),
    ]);
    setLatestGlucose(latest?.[0] || null);
    setHistory(logs || []);
    setActiveSickDay(sickDay?.[0] || null);
  }, [patient.id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const isHypo = latestGlucose && latestGlucose.value < HYPO_THRESHOLD;
  const stats = computeGlucoseStats(history);
  const iob = computeIOB(history);

  const actions: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; route: string; border: string }[] = [
    { icon: 'water-outline', color: T.blue, label: isNe ? 'ग्लुकोज' : 'Log Glucose', route: 'Log', border: T.border },
    { icon: 'restaurant-outline', color: T.teal, label: isNe ? 'खाना र डोज' : 'Food & Dose', route: 'Food', border: T.teal },
    { icon: 'thermometer-outline', color: T.orange, label: isNe ? 'बिमारी दिन' : 'Sick Day', route: 'SickDayWizard', border: T.orange },
    { icon: 'medical-outline', color: T.purple, label: isNe ? 'इन्सुलिन' : 'Regimen', route: 'RegimenSettings', border: T.border },
    { icon: 'book-outline', color: T.blue, label: isNe ? 'शिक्षा' : 'Education', route: 'Learn', border: T.border },
    { icon: 'medkit-outline', color: T.blue, label: isNe ? 'स्वास्थ्य केन्द्र' : 'Nearby Care', route: 'HealthCenters', border: T.border },
    { icon: 'call-outline', color: T.red, label: isNe ? 'हेल्पलाइन' : 'Helpline', route: 'Helpline', border: T.red },
    { icon: 'chatbubble-ellipses-outline', color: T.blue, label: isNe ? 'सन्देश' : 'Messages', route: 'Messages', border: T.border },
    { icon: 'warning-outline', color: T.red, label: isNe ? 'आपतकाल' : 'Emergency', route: 'Emergency', border: T.red },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TH.blue} colors={[TH.blue]} progressBackgroundColor={TH.surface} />}
      >
        {/* Avatar header */}
        <View style={styles.profileHeader}>
          <ChildAvatar name={patient.name} sex={patient.sex} size={56} />
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.subtitle}>
              {patient.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')} · {patient.sex}
            </Text>
          </View>
        </View>

        <View style={{ marginBottom: 16 }}>
          <DhakaDivider />
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
              <Text style={styles.timestamp}>{toBSDateTimeDisplay(latestGlucose.timestamp)}</Text>
              {iob > 0 && (
                <Text style={styles.iobText}>{isNe ? 'सक्रिय इन्सुलिन' : 'Active insulin'}: {iob} U</Text>
              )}
            </View>
          ) : (
            <Text style={styles.noData}>{isNe ? 'कुनै लग छैन' : t('noLogsYet')}</Text>
          )}
        </View>

        {/* Hypo alert */}
        {isHypo && (
          <View style={styles.hypoAlert}>
            <Text style={styles.hypoAlertTitle}>{isNe ? 'हाइपोग्लाइसेमिया' : 'Hypoglycemia Alert'}</Text>
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
              <Ionicons name="thermometer-outline" size={20} color={T.red} />
              <View>
                <Text style={styles.sickBannerTitle}>{isNe ? 'सक्रिय बिमारी दिन' : 'Active Sick Day'}</Text>
                <Text style={styles.sickBannerSub}>{isNe ? 'निगरानी जारी छ · थिच्नुहोस्' : 'Monitoring in progress · Tap to continue'} ›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* 30-day trends + HbA1c */}
        {history.length >= 2 && (
          <View style={styles.trendCard}>
            <Text style={styles.cardLabel}>{isNe ? 'पछिल्लो ३० दिनको तथ्यांक' : 'Last 30 days'}</Text>
            <TirDonut pct={stats.timeInRangePct} color={TH.teal} label={isNe ? 'समय दायरामा (TIR)' : 'Time in Range'} />
            <View style={styles.statRow}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{toDisplayNumber(stats.timeInRangePct, isNe)}%</Text>
                <Text style={styles.statLabel}>{isNe ? 'समय दायरामा (TIR)' : 'Time in Range'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.meanMgdl}</Text>
                <Text style={styles.statLabel}>{isNe ? 'औसत mg/dL' : 'Mean mg/dL'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.eA1c}%</Text>
                <Text style={styles.statLabel}>{isNe ? 'अनुमानित HbA1c' : 'Est. HbA1c'}</Text>
              </View>
            </View>
            <GlucoseTrendChart logs={history} />
            <Text style={styles.provenance}>
              {isNe ? 'गणना: ISPAD 2022 दिशानिर्देश अनुसार' : 'Calculated per ISPAD 2022 target range (70–180 mg/dL)'}
            </Text>
            <TouchableOpacity style={styles.pdfBtn} onPress={() => generateGlucoseReport(patient, history)} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.pdfBtnText}>{isNe ? 'PDF रिपोर्ट निकाल्नुहोस्' : 'Export PDF Report'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action grid */}
        <Text style={styles.sectionLabel}>{isNe ? 'द्रुत कार्यहरू' : t('quickLog')}</Text>
        <View style={styles.actionGrid}>
          {actions.map((a, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.actionCard, { borderColor: a.border, borderWidth: a.border !== T.border ? 2 : 1 }]}
              onPress={() => navigation.navigate(a.route, { patientId: patient.id })}
              activeOpacity={0.7}
            >
              <Ionicons name={a.icon} size={26} color={a.color} style={{ marginBottom: 6 }} />
              <Text style={styles.actionText}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.cgmCard}>
          <Ionicons name="bluetooth-outline" size={18} color={T.muted} />
          <Text style={styles.cgmText}>
            {isNe ? 'CGM जडान (Dexcom/Libre) — चाँडै आउँदैछ' : 'Connect CGM (Dexcom/Libre) — coming soon'}
          </Text>
        </View>

        <ISPADBadge />
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },

  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileAv: { ...avatar, width: 56, height: 56, borderRadius: 28, backgroundColor: T.blueLight },
  profileAvText: { fontSize: 26, fontFamily: FONT.bold, fontWeight: '700', color: T.blue },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  subtitle: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  glucoseCard: { ...card },
  hypoCard: { backgroundColor: T.redLight, borderWidth: 2, borderColor: T.red },
  cardLabel: { ...section, marginTop: 0, marginBottom: 6 },
  glucoseValue: { fontSize: 42, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  unit: { fontSize: 18, fontFamily: FONT.regular, fontWeight: '400', color: T.muted },
  hypoText: { color: T.red },
  timestamp: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 4 },
  iobText: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: T.purple, marginTop: 4 },
  noData: { fontSize: 15, fontFamily: FONT.regular, color: T.muted, fontStyle: 'italic' },

  hypoAlert: { backgroundColor: T.redLight, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: T.red },
  hypoAlertTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.redDark, marginBottom: 8 },
  hypoStep: { fontSize: 13, fontFamily: FONT.regular, color: T.text, paddingVertical: 2, paddingLeft: 4, lineHeight: 20 },

  sickBanner: { ...card, borderWidth: 1, borderColor: T.orange },
  sickBannerTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: T.amberDark },
  sickBannerSub: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  trendCard: { ...card },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statTile: { flex: 1, backgroundColor: T.blueLight, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  statValue: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: T.blueDark },
  statLabel: { fontSize: 10, fontFamily: FONT.semibold, color: T.blueDark, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  provenance: { fontSize: 10, fontFamily: FONT.regular, color: T.muted, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.blue, borderRadius: 28, paddingVertical: 12, marginTop: 12,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.bold, fontWeight: '700' },

  cgmCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginTop: 16,
  },
  cgmText: { fontSize: 13, fontFamily: FONT.regular, color: T.muted },
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
  actionText: { fontSize: 11, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, textAlign: 'center' },
});
