import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { HYPO_THRESHOLD } from '../rules/sickDayRules';
import type { PatientProfile, GlucoseLog, SickDayEpisode } from '../types';

export default function PatientDashboard({ route, navigation }: any) {
  const { patient }: { patient: PatientProfile } = route.params;
  const { t } = useLanguage();
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

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
      <Text style={styles.name}>{patient.name}</Text>
      <Text style={styles.subtitle}>{patient.insulin_type} · {patient.sex}</Text>

      {/* Glucose Card */}
      <View style={[styles.glucoseCard, isHypo && styles.hypoCard]}>
        <Text style={styles.cardLabel}>{t('currentGlucose')}</Text>
        {latestGlucose ? (
          <View>
            <Text style={[styles.glucoseValue, isHypo && styles.hypoText]}>
              {latestGlucose.value}
              <Text style={styles.unit}> mg/dL</Text>
            </Text>
            <Text style={styles.timestamp}>{new Date(latestGlucose.timestamp).toLocaleString()}</Text>
          </View>
        ) : (
          <Text style={styles.noData}>{t('noLogsYet')}</Text>
        )}
      </View>

      {isHypo && (
        <View style={styles.hypoAlert}>
          <Text style={styles.hypoAlertTitle}>{t('hypoglycemia')}</Text>
          <Text style={styles.hypoAlertText}>{t('hypoWarning')}</Text>
          <Text style={styles.hypoStep}>{t('hypoStep1')}</Text>
          <Text style={styles.hypoStep}>{t('hypoStep2')}</Text>
          <Text style={styles.hypoStep}>{t('hypoStep3')}</Text>
          <Text style={styles.hypoStep}>{t('hypoStep4')}</Text>
        </View>
      )}

      {/* Sick Day Banner */}
      {activeSickDay && (
        <TouchableOpacity style={styles.sickBanner} onPress={() => navigation.navigate('SickDayWizard', { patientId: patient.id })}>
          <Text style={styles.sickBannerTitle}>🤒 {t('activeSickDay')}</Text>
          <Text style={styles.sickBannerSub}>{t('sickDay')} ›</Text>
        </TouchableOpacity>
      )}

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>{t('quickLog')}</Text>
      <View style={styles.actionGrid}>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('LogGlucose', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>🩸</Text>
          <Text style={styles.actionText}>{t('logGlucose')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, styles.foodAction]} onPress={() => navigation.navigate('FoodEstimator', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>🍽️</Text>
          <Text style={styles.actionText}>Food & Dose</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, styles.sickAction]} onPress={() => navigation.navigate('SickDayWizard', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>🤒</Text>
          <Text style={styles.actionText}>{t('sickDay')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('RegimenSettings', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>💉</Text>
          <Text style={styles.actionText}>{t('insulinRegimen')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Education', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>📚</Text>
          <Text style={styles.actionText}>{t('education')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('HealthCenters', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>🏥</Text>
          <Text style={styles.actionText}>Nearby Care</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, styles.helplineAction]} onPress={() => navigation.navigate('Helpline')}>
          <Text style={styles.actionIcon}>📞</Text>
          <Text style={styles.actionText}>Helpline</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate('Messages', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>💬</Text>
          <Text style={styles.actionText}>{t('messages')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionCard, styles.emergencyAction]} onPress={() => navigation.navigate('Emergency', { patientId: patient.id })}>
          <Text style={styles.actionIcon}>🚨</Text>
          <Text style={styles.actionText}>{t('emergency')}</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Logs */}
      <Text style={styles.sectionTitle}>{t('recentLogs')}</Text>
      {latestGlucose ? (
        <View style={styles.logItem}>
          <Text style={styles.logValue}>{latestGlucose.value} mg/dL</Text>
          <Text style={styles.logTime}>{new Date(latestGlucose.timestamp).toLocaleString()}</Text>
          <Text style={styles.logContext}>{latestGlucose.context === 'sick_day' ? `🤒 ${t('sickDay')}` : '📋 Routine'}</Text>
        </View>
      ) : (
        <Text style={styles.noData}>{t('noLogsYet')}</Text>
      )}

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 60 },
  name: { fontSize: 28, fontWeight: '800', color: '#202124' },
  subtitle: { fontSize: 15, color: '#5f6368', marginBottom: 20 },
  glucoseCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#e8eaed' },
  hypoCard: { backgroundColor: '#fce8e6', borderColor: '#ea4335' },
  cardLabel: { fontSize: 14, color: '#5f6368', marginBottom: 8 },
  glucoseValue: { fontSize: 42, fontWeight: '700', color: '#202124' },
  unit: { fontSize: 18, fontWeight: '400', color: '#5f6368' },
  hypoText: { color: '#ea4335' },
  timestamp: { fontSize: 12, color: '#5f6368', marginTop: 4 },
  noData: { fontSize: 15, color: '#80868b', fontStyle: 'italic' },
  hypoAlert: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: '#ea4335' },
  hypoAlertTitle: { fontSize: 18, fontWeight: '700', color: '#ea4335', marginBottom: 8 },
  hypoAlertText: { fontSize: 14, color: '#202124', marginBottom: 8 },
  hypoStep: { fontSize: 14, color: '#202124', paddingVertical: 2, paddingLeft: 4 },
  sickBanner: { backgroundColor: '#fef7e0', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#f9ab00' },
  sickBannerTitle: { fontSize: 16, fontWeight: '600', color: '#e37400', marginBottom: 4 },
  sickBannerSub: { fontSize: 14, color: '#5f6368' },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#202124', marginTop: 20, marginBottom: 12 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: { width: '30%', backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginBottom: 4 },
  sickAction: { borderColor: '#f9ab00', borderWidth: 2 },
  emergencyAction: { borderColor: '#ea4335', borderWidth: 2 },
  foodAction: { borderColor: '#34a853', borderWidth: 2 },
  helplineAction: { borderColor: '#ea4335', borderWidth: 2, backgroundColor: '#FFF5F5' },
  actionIcon: { fontSize: 28, marginBottom: 6 },
  actionText: { fontSize: 12, fontWeight: '600', color: '#202124', textAlign: 'center' },
  logItem: { backgroundColor: '#fff', borderRadius: 10, padding: 14, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginBottom: 8 },
  logValue: { fontSize: 17, fontWeight: '600', color: '#202124' },
  logTime: { fontSize: 12, color: '#5f6368' },
  logContext: { fontSize: 12, color: '#5f6368' },
});
