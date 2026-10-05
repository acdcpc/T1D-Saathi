import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import ISPADBadge from '../components/ISPADBadge';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { speak } from '../utils/speech';
import { supabase } from '../lib/supabase';
import { saveGlucoseEntry } from '../utils/glucoseEntries';
import { saveInsulinDose } from '../utils/insulinLogs';
import { sendCaregiverAlert } from '../utils/caregiverAlert';
import { HYPO_THRESHOLD, HYPO_RECHECK_MINUTES, calculateCorrectionDose, calculateCarbDose, convertGlucose } from '../rules/sickDayRules';
import type { InsulinRegimen, UnitSystem } from '../types';
import { FONT, T } from '../theme';
import { usePreferences } from '../context/PreferencesContext';

export default function LogGlucoseScreen({ route, navigation }: any) {
  const patientId = (route.params as any)?.patientId || usePatient()?.id || '';
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { theme: TH, fontScale } = usePreferences();

  const [glucose, setGlucose] = useState('');
  const [carbs, setCarbs] = useState('');
  const [insulinGiven, setInsulinGiven] = useState('');
  const [unit, setUnit] = useState<UnitSystem>('mgdl');
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ correction: number; carb: number; total: number } | null>(null);
  const [isHypo, setIsHypo] = useState(false);
  const [glucoseError, setGlucoseError] = useState<string | null>(null);
  const [mood, setMood] = useState('');
  const [activityType, setActivityType] = useState('');
  const [activityMinutes, setActivityMinutes] = useState('');
  const [longActing, setLongActing] = useState('');

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
    if (Platform.OS === 'web') return; // local notifications unsupported in browser
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Check Glucose',
        body: '20 minutes have passed. Please recheck glucose now.',
      },
      trigger: { seconds: HYPO_RECHECK_MINUTES * 60, repeats: false } as any,
    });
    Alert.alert(t('reminderSet'), `${t('reminderSet')} (${HYPO_RECHECK_MINUTES} min)`);
  };

  const handleLog = async () => {
    const gVal = parseFloat(glucose);
    if (isNaN(gVal) || gVal <= 0) {
      setGlucoseError(language === 'ne' ? 'मान्य ग्लुकोज मान लेख्नुहोस्' : 'Enter a valid glucose value');
      return;
    }
    setGlucoseError(null);

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
      insulin_given: parseFloat(insulinGiven) || 0,
      source: 'manual',
      ...(mood ? { mood } : {}),
      ...(activityType ? { activity_type: activityType } : {}),
      ...(activityType && activityMinutes ? { activity_minutes: parseFloat(activityMinutes) || 0 } : {}),
    };
    const { online, error } = await saveGlucoseEntry(logEntry);
    if (error) return Alert.alert(t('error'), error instanceof Error ? error.message : 'The glucose record could not be saved.');

    const longUnits = parseFloat(longActing);
    if (Number.isFinite(longUnits) && longUnits > 0 && user?.id) {
      const doseRes = await saveInsulinDose({ patient_id: patientId, user_id: user.id, units: longUnits, insulin_type: 'long', source: 'manual' });
      if (!doseRes.saved && doseRes.message) Alert.alert(t('error'), doseRes.message);
    }

    if (isLow) {
      setIsHypo(true);
      setResult(null);
      scheduleHypoReminder();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speak(language === 'ne' ? 'ग्लुकोज कम छ। तुरुन्त उपचार गर्नुहोस्।' : 'Low glucose. Treat hypoglycemia immediately.', language);
    } else if (regimen?.approved_by_clinician && regimen.tdd && regimen.correction_target) {
      const correction = calculateCorrectionDose(glucoseMgdl, regimen.correction_target, regimen.tdd, regimen.isf);
      const carb = calculateCarbDose(parseFloat(carbs) || 0, regimen.carb_ratio, regimen.tdd);
      setResult({ correction: Math.round(correction * 10) / 10, carb: Math.round(carb * 10) / 10, total: Math.round((correction + carb) * 10) / 10 });
      setIsHypo(false);
    } else {
      setResult(null);
      setIsHypo(false);
    }

    const syncMsg = online ? '' : ' (saved offline)'; Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert(t('success'), `Glucose logged: ${gVal} ${unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}${syncMsg}`);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <ScrollView style={[styles.container, { backgroundColor: TH.bg }]} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('logGlucose')}</Text>
      <ISPADBadge />

      <Text style={styles.label}>{t('currentGlucose')}</Text>
      <View style={styles.glucoseRow}>
        <TextInput accessibilityLabel={t('enterGlucose')} style={[styles.glucoseInput, glucoseError && styles.inputError, { color: TH.text }]} value={glucose} onChangeText={(v) => { setGlucose(v); if (glucoseError) setGlucoseError(null); }} keyboardType="numeric" placeholder="0" />        <View style={styles.unitToggle}>
          <TouchableOpacity style={[styles.unitBtn, unit === 'mgdl' && styles.unitActive]} onPress={() => setUnit('mgdl')}>
            <Text style={[styles.unitText, unit === 'mgdl' && styles.unitTextActive]}>{t('mgdl')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.unitBtn, unit === 'mmol' && styles.unitActive]} onPress={() => setUnit('mmol')}>
            <Text style={[styles.unitText, unit === 'mmol' && styles.unitTextActive]}>{t('mmol')}</Text>
          </TouchableOpacity>
        </View>
      </View>
      {glucoseError ? <Text style={styles.errorText}>{glucoseError}</Text> : null}

      <Text style={styles.label}>{t('carbs')} ({t('optional')})</Text>
      <TextInput style={styles.input} value={carbs} onChangeText={setCarbs} keyboardType="numeric" placeholder="grams" />

      <Text style={styles.label}>{t('insulinGiven') || 'Insulin given (U)'} ({t('optional')})</Text>
      <TextInput style={styles.input} value={insulinGiven} onChangeText={setInsulinGiven} keyboardType="numeric" placeholder="0" />

      <Text style={styles.label}>{language === 'ne' ? 'लामो-कार्य इन्सुलिन दिइयो (U)' : 'Long-acting insulin given (U)'} ({t('optional')})</Text>
      <TextInput style={styles.input} value={longActing} onChangeText={setLongActing} keyboardType="numeric" placeholder="0" />

      <Text style={styles.label}>{language === 'ne' ? 'कस्तो महसुस भयो?' : 'Feeling'} ({t('optional')})</Text>
      <View style={styles.chipRow}>
        {[
          { id: 'good', label: language === 'ne' ? 'राम्रो महसुस' : 'Feeling good' },
          { id: 'low', label: language === 'ne' ? 'कम महसुस' : 'Feeling low' },
          { id: 'high', label: language === 'ne' ? 'उच्च महसुस' : 'Feeling high' },
        ].map((m) => (
          <TouchableOpacity key={m.id} style={[styles.chip, mood === m.id && styles.chipActive]} onPress={() => setMood(mood === m.id ? '' : m.id)} accessibilityRole="button">
            <Text style={[styles.chipText, mood === m.id && styles.chipTextActive]}>{m.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{language === 'ne' ? 'शारीरिक गतिविधि' : 'Activity'} ({t('optional')})</Text>
      <View style={styles.chipRow}>
        {[
          { id: 'walk', label: language === 'ne' ? 'हिँडाइ' : 'Walking' },
          { id: 'play', label: language === 'ne' ? 'खेल' : 'Playing' },
          { id: 'sport', label: language === 'ne' ? 'खेलकुद' : 'Sports' },
        ].map((a) => (
          <TouchableOpacity key={a.id} style={[styles.chip, activityType === a.id && styles.chipActive]} onPress={() => setActivityType(activityType === a.id ? '' : a.id)} accessibilityRole="button">
            <Text style={[styles.chipText, activityType === a.id && styles.chipTextActive]}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {activityType ? (
        <TextInput style={styles.input} value={activityMinutes} onChangeText={setActivityMinutes} keyboardType="numeric" placeholder={language === 'ne' ? 'मिनेट (वैकल्पिक)' : 'Minutes (optional)'} />
      ) : null}

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
          <TouchableOpacity
            style={styles.notifyBtn}
            onPress={() => sendCaregiverAlert(language === 'ne'
              ? `T1D साथी सूचना: कम ग्लुकोज (${glucose} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}) रेकर्ड भयो। कृपया जाँच गर्नुहोस्।`
              : `T1D Saathi alert: low glucose (${glucose} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}) was logged. Please check on the child.`)}
          >
            <Text style={styles.notifyBtnText}>{language === 'ne' ? 'हेरचाहकर्तालाई जानकारी (WhatsApp)' : 'Notify caregiver (WhatsApp)'}</Text>
          </TouchableOpacity>
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

      {result !== null && regimen?.max_bolus && result.total > regimen.max_bolus ? (
        <View style={styles.maxWarn}>
          <Text style={styles.maxWarnTitle}>{language === 'ne' ? 'अधिकतम डोज भन्दा माथि' : 'Above maximum dose'}</Text>
          <Text style={styles.maxWarnText}>
            {language === 'ne'
              ? `यो कुल मात्रा चिकित्सकले तोकेको अधिकतम बोलस (${regimen.max_bolus} U) भन्दा माथि छ। दिनु अघि चिकित्सकसँग सल्लाह गर्नुहोस्।`
              : `This total is above the clinician-set maximum bolus (${regimen.max_bolus} U). Do not give without checking with your clinician.`}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 90, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  glucoseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginTop: 6 },
  glucoseInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 32, fontFamily: FONT.bold, fontWeight: '700', borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  unitToggle: { flexDirection: 'row', gap: 4 },
  unitBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#e8eaed' },
  unitActive: { backgroundColor: '#1a73e8' },
  unitText: { fontSize: 13, fontFamily: FONT.regular, color: '#3c4043' },
  unitTextActive: { color: '#fff' },
  regimenInfo: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 14, marginTop: 14 },
  regimenText: { fontSize: 13, fontFamily: FONT.regular, color: '#1a73e8', paddingVertical: 1 },
  logBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  logBtnText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
  hypoAlert: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 2, borderColor: '#ea4335' },
  hypoTitle: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: '#ea4335', marginBottom: 8 },
  hypoText: { fontSize: 14, fontFamily: FONT.regular, color: '#202124', marginBottom: 8 },
  step: { fontSize: 14, fontFamily: FONT.regular, color: '#202124', paddingVertical: 2 },
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginTop: 20, borderWidth: 1, borderColor: '#e8eaed' },
  resultTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginBottom: 12 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  resultLabel: { fontSize: 15, fontFamily: FONT.regular, color: '#5f6368' },
  resultValue: { fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  resultLabelBold: { fontSize: 17, fontFamily: FONT.bold, fontWeight: '700', color: '#202124' },
  resultValueBold: { fontSize: 17, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8' },
  divider: { height: 1, backgroundColor: '#e8eaed', marginVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { fontSize: 13, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  maxWarn: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 2, borderColor: '#ea4335' },
  maxWarnTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#c5221f', marginBottom: 6 },
  maxWarnText: { fontSize: 13, fontFamily: FONT.regular, color: '#202124', lineHeight: 19 },
  notifyBtn: { backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  notifyBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
});
