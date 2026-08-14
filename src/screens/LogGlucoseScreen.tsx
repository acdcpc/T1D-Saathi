import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { safeInsert } from '../utils/offlineQueue';
import { HYPO_THRESHOLD, HYPO_RECHECK_MINUTES, calculateCorrectionDose, calculateCarbDose, convertGlucose } from '../rules/sickDayRules';
import type { InsulinRegimen, UnitSystem } from '../types';

export default function LogGlucoseScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();

  const [glucose, setGlucose] = useState('');
  const [carbs, setCarbs] = useState('');
  const [unit, setUnit] = useState<UnitSystem>('mgdl');
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ correction: number; carb: number; total: number } | null>(null);
  const [isHypo, setIsHypo] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('insulin_regimens')
        .select('*')
        .eq('patient_id', patientId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      setRegimen(data);
      setLoading(false);
    })();
  }, [patientId]);

  const scheduleHypoReminder = async () => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '🩸 Check Glucose',
        body: '20 minutes have passed. Please recheck glucose now.',
      },
      trigger: { seconds: HYPO_RECHECK_MINUTES * 60, repeats: false } as any,
    });
    Alert.alert(t('reminderSet'), `${t('reminderSet')} (${HYPO_RECHECK_MINUTES} min)`);
  };

  const handleLog = async () => {
    const gVal = parseFloat(glucose);
    if (isNaN(gVal)) return Alert.alert(t('error'), 'Enter a valid glucose value');

    const glucoseMgdl = unit === 'mmol' ? convertGlucose(gVal, 'mmol', 'mgdl') : gVal;
    const isLow = glucoseMgdl < HYPO_THRESHOLD;

    // Save log
    const logEntry = {
      patient_id: patientId,
      user_id: user?.id,
      value: gVal,
      unit,
      context: 'routine' as const,
      timestamp: new Date().toISOString(),
      carbs: parseFloat(carbs) || 0,
    };
    const { online, error } = await safeInsert('glucose_logs', logEntry);
    if (error) return Alert.alert(t('error'), error instanceof Error ? error.message : 'The glucose record could not be saved.');

    if (isLow) {
      setIsHypo(true);
      setResult(null);
      scheduleHypoReminder();
    } else if (regimen?.approved_by_clinician && regimen.tdd && regimen.correction_target) {
      const correction = calculateCorrectionDose(glucoseMgdl, regimen.correction_target, regimen.tdd, regimen.isf);
      const carb = calculateCarbDose(parseFloat(carbs) || 0, regimen.carb_ratio, regimen.tdd);
      setResult({ correction: Math.round(correction * 10) / 10, carb: Math.round(carb * 10) / 10, total: Math.round((correction + carb) * 10) / 10 });
      setIsHypo(false);
    } else {
      setResult(null);
      setIsHypo(false);
    }

    const syncMsg = online ? '' : ' (saved offline)'; Alert.alert('✅', `Glucose logged: ${gVal} ${unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}${syncMsg}`);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('logGlucose')}</Text>

      <Text style={styles.label}>{t('currentGlucose')}</Text>
      <View style={styles.glucoseRow}>
        <TextInput accessibilityLabel={t('enterGlucose')} style={styles.glucoseInput} value={glucose} onChangeText={setGlucose} keyboardType="numeric" placeholder="0" />
        <View style={styles.unitToggle}>
          <TouchableOpacity style={[styles.unitBtn, unit === 'mgdl' && styles.unitActive]} onPress={() => setUnit('mgdl')}>
            <Text style={[styles.unitText, unit === 'mgdl' && styles.unitTextActive]}>{t('mgdl')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.unitBtn, unit === 'mmol' && styles.unitActive]} onPress={() => setUnit('mmol')}>
            <Text style={[styles.unitText, unit === 'mmol' && styles.unitTextActive]}>{t('mmol')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>{t('carbs')} ({t('optional')})</Text>
      <TextInput style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="grams" />

      {regimen && (
        <View style={styles.regimenInfo}>
          <Text style={styles.regimenText}>{t('insulinType')}: {regimen.insulin_type}</Text>
          <Text style={styles.regimenText}>{t('tdd')}: {regimen.tdd || 'N/A'} U</Text>
          <Text style={styles.regimenText}>{t('isf')}: {regimen.isf || 'N/A'} mg/dL per U</Text>
          <Text style={styles.regimenText}>{regimen.approved_by_clinician ? 'Clinician-approved regimen' : 'Dose calculation unavailable until clinician approval'}</Text>
        </View>
      )}

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('calculate')} style={styles.logBtn} onPress={handleLog}>
        <Text style={styles.logBtnText}>{t('calculate')}</Text>
      </TouchableOpacity>

      {isHypo && (
        <View style={styles.hypoAlert}>
          <Text style={styles.hypoTitle}>{t('hypoglycemia')}</Text>
          <Text style={styles.hypoText}>{t('hypoWarning')}</Text>
          <Text style={styles.step}>{t('hypoStep1')}</Text>
          <Text style={styles.step}>{t('hypoStep2')}</Text>
          <Text style={styles.step}>{t('hypoStep3')}</Text>
          <Text style={styles.step}>{t('hypoStep4')}</Text>
        </View>
      )}

      {result !== null && (
        <View style={styles.resultCard}>
          <Text style={styles.resultTitle}>{t('insulinRegimen')}</Text>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>{t('correctionDose')}</Text>
            <Text style={styles.resultValue}>{result.correction} U</Text>
          </View>
          <View style={styles.resultRow}>
            <Text style={styles.resultLabel}>{t('carbDose')}</Text>
            <Text style={styles.resultValue}>{result.carb} U</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.resultRow}>
            <Text style={styles.resultLabelBold}>{t('totalDose')}</Text>
            <Text style={styles.resultValueBold}>{result.total} U</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: '#dadce0' },
  glucoseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  glucoseInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 32, fontWeight: '700', borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  unitToggle: { flexDirection: 'row', gap: 4 },
  unitBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#e8eaed' },
  unitActive: { backgroundColor: '#1a73e8' },
  unitText: { fontSize: 13, color: '#3c4043' },
  unitTextActive: { color: '#fff' },
  regimenInfo: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 14, marginTop: 14 },
  regimenText: { fontSize: 13, color: '#1a73e8', paddingVertical: 1 },
  logBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  logBtnText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  hypoAlert: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 2, borderColor: '#ea4335' },
  hypoTitle: { fontSize: 18, fontWeight: '700', color: '#ea4335', marginBottom: 8 },
  hypoText: { fontSize: 14, color: '#202124', marginBottom: 8 },
  step: { fontSize: 14, color: '#202124', paddingVertical: 2 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginTop: 20, borderWidth: 1, borderColor: '#e8eaed' },
  resultTitle: { fontSize: 16, fontWeight: '700', color: '#202124', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  resultLabel: { fontSize: 15, color: '#5f6368' },
  resultValue: { fontSize: 15, fontWeight: '600', color: '#202124' },
  resultLabelBold: { fontSize: 17, fontWeight: '700', color: '#202124' },
  resultValueBold: { fontSize: 17, fontWeight: '700', color: '#1a73e8' },
  divider: { height: 1, backgroundColor: '#e8eaed', marginVertical: 8 },
});
