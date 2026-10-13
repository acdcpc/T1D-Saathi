import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import ISPADBadge from '../components/ISPADBadge';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { speak } from '../utils/speech';
import { supabase } from '../lib/supabase';
import { saveGlucoseEntry } from '../utils/glucoseEntries';
import { saveInsulinDose } from '../utils/insulinLogs';
import { sendCaregiverAlert } from '../utils/caregiverAlert';
import { sendPushAlertToCaregivers, notifyCliniciansRequest } from '../utils/pushAlerts';
import { HYPO_THRESHOLD, HYPO_RECHECK_MINUTES, convertGlucose } from '../rules/sickDayRules';
import { calculateDosing, DosingValidationError } from '../utils/dosingCalc';
import type { InsulinRegimen, UnitSystem } from '../types';
import { FONT, T } from '../theme';
import { usePreferences } from '../context/PreferencesContext';
import { useTabBarSpace } from '../design/useTabBarSpace';

const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

export default function LogGlucoseScreen({ route, navigation }: any) {
  const patientId = (route.params as any)?.patientId || usePatient()?.id || '';
  const tabSpace = useTabBarSpace();
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { theme: TH, fontScale } = usePreferences();
  const isNe = language === 'ne';

  const [glucose, setGlucose] = useState('');
  const [carbs, setCarbs] = useState('');
  const [insulinGiven, setInsulinGiven] = useState('');
  const [unit, setUnit] = useState<UnitSystem>('mgdl');
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<{ correction: number; carb: number; total: number; exceedsMaxBolus?: boolean; maxBolus?: number } | null>(null);
  const [isHypo, setIsHypo] = useState(false);
  const [glucoseError, setGlucoseError] = useState<string | null>(null);
  const [mood, setMood] = useState('');
  const [activityType, setActivityType] = useState('');
  const [activityMinutes, setActivityMinutes] = useState('');
  const [longActing, setLongActing] = useState('');
  const [doseNotice, setDoseNotice] = useState<{ reason: 'not_approved' | 'no_regimen' | 'check_inputs'; detail: string } | null>(null);
  const [reviewRequested, setReviewRequested] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const handleRequestReview = async () => {
    try {
      const { error } = await supabase.from('regimen_requests').insert({
        patient_id: patientId,
        requested_by: user?.id || null,
        kind: 'review',
        note: null,
      });
      if (error) { Alert.alert(t('error'), error.message); return; }
      await notifyCliniciansRequest(patientId);
      setReviewRequested(true);
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Could not send request');
    }
  };

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('insulin_regimens')
        .select('*')
        .eq('patient_id', patientId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
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
      setDoseNotice(null);
      void sendPushAlertToCaregivers(patientId, `${gVal} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}`);
      scheduleHypoReminder();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      speak(language === 'ne' ? 'ग्लुकोज कम छ। तुरुन्त उपचार गर्नुहोस्।' : 'Low glucose. Treat hypoglycemia immediately.', language);
    } else {
      setIsHypo(false);
      try {
        const tddNum = Number(regimen?.tdd);
        const storedIsf = Number(regimen?.isf);
        const storedIcr = Number(regimen?.carb_ratio);
        // Clinician overrides (Settings → Insulin regimen) win over the standard
        // 1800/500 rules when set — pass them as effective constants (constant ÷ TDD).
        const effIsf = Number.isFinite(storedIsf) && storedIsf > 0 && Number.isFinite(tddNum) && tddNum > 0 ? storedIsf * tddNum : undefined;
        const effIcr = Number.isFinite(storedIcr) && storedIcr > 0 && Number.isFinite(tddNum) && tddNum > 0 ? storedIcr * tddNum : undefined;
        const dose = calculateDosing(glucoseMgdl, parseFloat(carbs) || 0, {
          tdd: tddNum,
          icr_constant: effIcr,
          isf_constant: effIsf,
          target_glucose: Number(regimen?.correction_target),
          approved_by_clinician: !!regimen?.approved_by_clinician,
          max_bolus: typeof regimen?.max_bolus === 'number' ? (regimen.max_bolus as number) : undefined,
          regimen_id: (regimen as any)?.id,
          glucose_timestamp: new Date().toISOString(),
        });
        setDoseNotice(null);
        setResult({
          correction: dose.correctionDose,
          carb: dose.mealBolus,
          total: dose.totalDose,
          exceedsMaxBolus: !!dose.exceedsMaxBolus,
          maxBolus: dose.maxBolus,
        });
      } catch (e) {
        setResult(null);
        const detail = e instanceof Error ? e.message : String(e);
        const reason: 'not_approved' | 'no_regimen' | 'check_inputs' = !regimen
          ? 'no_regimen'
          : !regimen.approved_by_clinician
            ? 'not_approved'
            : 'check_inputs';
        if (e instanceof DosingValidationError) {
          setDoseNotice({ reason, detail });
        } else {
          setDoseNotice({ reason, detail });
        }
      }
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
    }

    const syncMsg = online ? '' : ' (saved offline)'; Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); Alert.alert(t('success'), `Glucose logged: ${gVal} ${unit === 'mgdl' ? 'mg/dL' : 'mmol/L'}${syncMsg}`);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0D9488" /></View>;

  const basalDose = Number(regimen?.basal_dose ?? (regimen as any)?.dose) || 0;
  const bolusDose = Number(regimen?.bolus_dose) || 0;
  const regimenDoseLine = [
    basalDose > 0 ? `${isNe ? 'बेसल' : 'Basal'} ${basalDose} U/day` : '',
    bolusDose > 0 ? `${isNe ? 'बोलस' : 'Bolus'} ${bolusDose} U/day` : '',
  ].filter(Boolean).join(' · ');

  return (
    <ScrollView ref={scrollRef} style={[styles.container, { backgroundColor: TH.bg }]} contentContainerStyle={[styles.content, contentCol, { paddingBottom: tabSpace.contentPaddingBottom }]}>
      <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'पछाडि' : 'Back'} style={styles.backRow} onPress={() => navigation?.navigate?.('Dashboard')} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={20} color={T.text} />
        <Text style={styles.backText}>{isNe ? 'पछाडि' : 'Back'}</Text>
      </TouchableOpacity>
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
      <Text style={styles.glucoseHint}>{language === 'ne' ? 'रक्त ग्लुकोज मान — ७०–१८० mg/dL दायरा हो।' : 'Blood glucose reading — 70–180 mg/dL is the in-range band.'}</Text>

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
          <Text style={styles.regimenText}>{t('insulinType')}: {[regimen.basal_insulin, regimen.bolus_insulin].filter(Boolean).join(' + ') || regimen.insulin_type}</Text>
          {regimenDoseLine ? <Text style={styles.regimenText}>{regimenDoseLine}</Text> : null}
          <Text style={styles.regimenText}>{t('tdd')}: {regimen.tdd || 'N/A'} U</Text>
          <Text style={styles.regimenText}>{t('isf')}: {regimen.isf || 'N/A'} mg/dL per U</Text>
          <Text style={styles.regimenText}>{regimen.approved_by_clinician ? (isNe ? 'चिकित्सक-अनुमोदित रेजिमेन' : 'Clinician-approved regimen') : (isNe ? 'चिकित्सक अनुमोदन बाँकी — अनुमोदनपछि डोज सहायता खुल्छ' : 'Pending clinician approval — dose help unlocks after review')}</Text>
        </View>
      )}

      <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('calculate')} style={styles.logBtn} onPress={handleLog}>
        <Text style={styles.logBtnText}>{t('calculate')}</Text>
      </TouchableOpacity>

      {doseNotice && (
        <View style={styles.noticeCard}>
          <Text style={styles.noticeTitle}>{isNe ? 'डोज सहायता' : 'Dose support'}</Text>
          <Text style={styles.noticeText}>
            {doseNotice.reason === 'not_approved'
              ? (isNe ? 'डोज सहायता तपाईंको चिकित्सकले रेजिमेन समीक्षा गरेपछि खुल्छ। चिकित्सकलाई अनुमोदन गर्न भन्नुहोस् — चिकित्सकको एपमा: बच्चा खोल्नुहोस् → "Approve regimen for dosing"।' : 'Dose help unlocks after your clinician reviews your regimen. Ask your clinician to approve it — in their app: open your child → "Approve regimen for dosing".')
              : doseNotice.reason === 'no_regimen'
                ? (isNe ? 'पहिले आफ्नो इन्सुलिन रेजिमेन थप्नुहोस् — सेटिङ → इन्सुलिन रेजिमेन।' : 'Add your insulin regimen first — Settings → Insulin regimen.')
                : (isNe ? 'यी मानहरूबाट डोज गणना गर्न सकिएन। ग्लुकोज रिडिङ र रेजिमेन सेटिङ (लक्ष्य / TDD) जाँचेर फेरि प्रयास गर्नुहोस्।' : 'Dose cannot be calculated from these values. Check the glucose reading and your regimen settings (target / TDD), then try again.')}
          </Text>
          <Text style={styles.noticeDetail}>{doseNotice.detail}</Text>
          {doseNotice.reason === 'not_approved' && (reviewRequested ? (
            <Text style={styles.requestSentText}>{isNe ? '✓ अनुरोध पठाइयो — चिकित्सकलाई जानकारी गयो' : '✓ Request sent — clinician notified'}</Text>
          ) : (
            <TouchableOpacity style={styles.requestReviewBtn} onPress={handleRequestReview} accessibilityRole="button">
              <Text style={styles.requestReviewBtnText}>{isNe ? 'चिकित्सक समीक्षा अनुरोध' : 'Request clinician review'}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

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
              ? `सानो वीर सूचना: कम ग्लुकोज (${glucose} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}) रेकर्ड भयो। कृपया जाँच गर्नुहोस्।`
              : `Sano Bir alert: low glucose (${glucose} ${unit === 'mmol' ? 'mmol/L' : 'mg/dL'}) was logged. Please check on the child.`)}
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
          <Text style={styles.resultNote}>{language === 'ne' ? 'यो छिटो-कार्य (बोलस) इन्सुलिनको अनुमान हो — तपाईंको चिकित्सक-अनुमोदित अनुपातबाट। सुरुवाती बिन्दु मानी आफ्नो योजना अनुसार पुष्टि गर्नुहोस्।' : 'This is an estimated rapid-acting (bolus) dose from your clinician-approved ratios — a starting point; confirm per your care plan.'}</Text>
        </View>
      )}

      {result !== null && result.exceedsMaxBolus ? (
        <View style={styles.maxWarn}>
          <Text style={styles.maxWarnTitle}>{language === 'ne' ? 'अधिकतम डोज भन्दा माथि' : 'Above maximum dose'}</Text>
          <Text style={styles.maxWarnText}>
            {language === 'ne'
              ? `यो कुल मात्रा चिकित्सकले तोकेको अधिकतम बोलस (${result.maxBolus} U) भन्दा माथि छ। दिनु अघि चिकित्सकसँग सल्लाह गर्नुहोस्।`
              : `This total is above the clinician-set maximum bolus (${result.maxBolus} U). Do not give without checking with your clinician.`}
          </Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#EFF9F7' },
  content: { padding: 20, paddingTop: 90, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  glucoseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  inputError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginTop: 6 },
  glucoseInput: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 32, fontFamily: FONT.bold, fontWeight: '700', borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  glucoseHint: { fontSize: 12, fontFamily: FONT.medium, color: '#7A6E65', marginTop: 6 },
  resultNote: { fontSize: 12, fontFamily: FONT.medium, color: '#5C5348', marginTop: 10, lineHeight: 17 },
  unitToggle: { flexDirection: 'row', gap: 4 },
  unitBtn: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: '#e8eaed' },
  unitActive: { backgroundColor: '#0D9488' },
  unitText: { fontSize: 13, fontFamily: FONT.regular, color: '#3c4043' },
  unitTextActive: { color: '#fff' },
  regimenInfo: { backgroundColor: '#E5F4F1', borderRadius: 10, padding: 14, marginTop: 14 },
  regimenText: { fontSize: 13, fontFamily: FONT.regular, color: '#0D9488', paddingVertical: 1 },
  logBtn: { backgroundColor: '#0D9488', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
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
  resultValueBold: { fontSize: 17, fontFamily: FONT.bold, fontWeight: '700', color: '#0D9488' },
  divider: { height: 1, backgroundColor: '#e8eaed', marginVertical: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#0D9488' },
  chipText: { fontSize: 13, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  maxWarn: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 2, borderColor: '#ea4335' },
  maxWarnTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#c5221f', marginBottom: 6 },
  maxWarnText: { fontSize: 13, fontFamily: FONT.regular, color: '#202124', lineHeight: 19 },
  notifyBtn: { backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 10 },
  notifyBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
  backRow: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingVertical: 8, paddingRight: 14, marginBottom: 2 },
  backText: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  noticeCard: { backgroundColor: '#FFF7E6', borderRadius: 12, padding: 16, marginTop: 16, borderWidth: 1.5, borderColor: '#E9B44C' },
  noticeTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#7A5B22', marginBottom: 6 },
  noticeText: { fontSize: 14, fontFamily: FONT.regular, color: '#4A3A16', lineHeight: 20 },
  noticeDetail: { fontSize: 12, fontFamily: FONT.regular, color: '#8A7A56', marginTop: 8 },
  requestReviewBtn: { backgroundColor: '#0D9488', borderRadius: 10, padding: 10, alignItems: 'center', marginTop: 10 },
  requestReviewBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
  requestSentText: { fontSize: 13, fontFamily: FONT.regular, color: '#0B5E58', marginTop: 10 },
});
