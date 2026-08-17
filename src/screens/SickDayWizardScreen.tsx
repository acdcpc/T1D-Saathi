import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import ISPADBadge from '../components/ISPADBadge';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { safeInsert } from '../utils/offlineQueue';
import { findSickDayRule, HYDRATION_THRESHOLD, HYPO_THRESHOLD, GLUCAGON_DOSE_TABLE } from '../rules/sickDayRules';
import type { SickDayRule, SickDayEpisode, InsulinRegimen, PatientProfile } from '../types';
import { FONT } from '../theme';

type WizardStep = 'symptoms' | 'ketone' | 'results';

export default function SickDayWizardScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<WizardStep>('symptoms');
  const [glucose, setGlucose] = useState('');
  const [fever, setFever] = useState(false);
  const [vomiting, setVomiting] = useState(false);
  const [diarrhea, setDiarrhea] = useState(false);
  const [ketoneValue, setKetoneValue] = useState('');
  const [ketoneMethod, setKetoneMethod] = useState<'blood' | 'urine' | 'unknown'>('blood');
  const [matchedRule, setMatchedRule] = useState<SickDayRule | null>(null);
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [patient, setPatient] = useState<PatientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const [{ data: reg }, { data: pat }] = await Promise.all([
        supabase.from('insulin_regimens').select('*').eq('patient_id', patientId).order('effective_date', { ascending: false }).limit(1).single(),
        supabase.from('patients').select('*').eq('id', patientId).single(),
      ]);
      setRegimen(reg);
      setPatient(pat);
      setLoading(false);
    })();
  }, [patientId]);

  // Check red-flag escalation triggers
  const checkRedFlags = (): string[] => {
    const flags: string[] = [];
    if (parseFloat(ketoneValue) >= 3.0) flags.push(t('ketonesHigh'));
    if (vomiting) flags.push(t('persistentVomiting'));
    if (fever) flags.push(t('feverPersists'));
    const dob = patient?.date_of_birth;
    if (dob) {
      const age = (new Date().getTime() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000);
      if (age < 5) flags.push(t('childUnder5'));
    }
    if (parseFloat(glucose) < HYPO_THRESHOLD) flags.push(t('glucoseBelow70'));
    if (patient?.comorbid_conditions?.length) flags.push(t('comorbidCondition'));
    return flags;
  };

  const handleStep1 = () => {
    if (!glucose.trim()) return Alert.alert(t('error'), 'Enter glucose value');
    setStep('ketone');
  };

  const handleStep2 = async () => {
    setLoading(true);
    const kv = parseFloat(ketoneValue);
    const rule = findSickDayRule(isNaN(kv) ? undefined : kv, ketoneMethod === 'urine' ? ketoneValue.trim() : undefined);
    setMatchedRule(rule);
    setStep('results');

    // Save episode
    setSaving(true);
    const episode: Partial<SickDayEpisode> = {
      patient_id: patientId,
      user_id: user?.id,
      start_date: new Date().toISOString(),
      symptoms: {
        glucose: parseFloat(glucose),
        fever,
        vomiting,
        diarrhea,
        ketone_value: isNaN(kv) ? undefined : kv,
        ketone_method: ketoneMethod,
      },
      escalated: rule?.escalate || false,
    };
    await safeInsert('sick_day_episodes', episode);

    // Save glucose
    await safeInsert('glucose_logs', {
      patient_id: patientId, user_id: user?.id,
      value: parseFloat(glucose), unit: 'mgdl' as const,
      context: 'sick_day' as const,
      timestamp: new Date().toISOString(),
    });

    // Save ketone if available
    if (!isNaN(kv)) {
      await safeInsert('ketone_logs', {
        patient_id: patientId, user_id: user?.id,
        value: kv, method: ketoneMethod,
        timestamp: new Date().toISOString(),
      });
    }
    // Schedule ISPAD-cadence monitoring reminders
    scheduleISPADReminders(matchedRule);
    setSaving(false);
    setLoading(false);
  };

  // Schedule ISPAD monitoring reminders from the matched rule
  const scheduleISPADReminders = async (rule: SickDayRule | null) => {
    if (!rule) return;
    if (Platform.OS === 'web') return; // local notifications unsupported in browser
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;

    // Glucose recheck reminder
    await Notifications.scheduleNotificationAsync({
      content: {
        title: `Check Glucose`,
        body: `Recheck glucose in ${rule.monitoring_glucose_minutes} min as per ISPAD sick day protocol.`,
      },
      trigger: { seconds: rule.monitoring_glucose_minutes * 60, repeats: false } as any,
    });

    // Ketone recheck reminder (at ISPAD cadence)
    if (rule.monitoring_ketone_minutes) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Check Ketones',
          body: `Recheck ketones in ${rule.monitoring_ketone_minutes} min as per ISPAD protocol.`,
        },
        trigger: { seconds: rule.monitoring_ketone_minutes * 60, repeats: false } as any,
      });
    }

    // Immediate 5-min ketone-entry prompt if no value was provided
    if (ketoneMethod === 'unknown') {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🧪 Ketone Entry Needed',
          body: '5 minutes have passed. Please attempt to check ketones and enter the value.',
        },
        trigger: { seconds: 5 * 60, repeats: false } as any,
      });
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  const redFlags = step === 'results' ? checkRedFlags() : [];

  // Step 1: Symptoms
  if (step === 'symptoms') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.stepIndicator}>
          <View style={styles.stepActive}><Text style={styles.stepNum}>1</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}><Text style={styles.stepNumInactive}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}><Text style={styles.stepNumInactive}>3</Text></View>
        </View>
        <Text style={styles.title}>{t('symptomCheck')}</Text>
        <ISPADBadge />

        {vomiting && (
          <View style={styles.nauseaWarning}>
            <Text style={styles.nauseaText}>{t('nauseaWarning')}</Text>
          </View>
        )}

        <Text style={styles.label}>{t('currentGlucose')}</Text>
        <TextInput style={styles.glucoseInput} value={glucose} onChangeText={setGlucose} keyboardType="numeric" placeholder="mg/dL" />

        <Text style={styles.label}>{t('fever')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, fever && styles.toggleActive]} onPress={() => setFever(true)}><Text style={[styles.toggleText, fever && styles.toggleActiveText]}>Yes</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !fever && styles.toggleActive]} onPress={() => setFever(false)}><Text style={[styles.toggleText, !fever && styles.toggleActiveText]}>No</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('vomiting')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, vomiting && styles.toggleActive]} onPress={() => setVomiting(true)}><Text style={[styles.toggleText, vomiting && styles.toggleActiveText]}>Yes</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !vomiting && styles.toggleActive]} onPress={() => setVomiting(false)}><Text style={[styles.toggleText, !vomiting && styles.toggleActiveText]}>No</Text></TouchableOpacity>
        </View>

        <Text style={styles.label}>{t('diarrhea')}</Text>
        <View style={styles.toggleRow}>
          <TouchableOpacity style={[styles.toggleBtn, diarrhea && styles.toggleActive]} onPress={() => setDiarrhea(true)}><Text style={[styles.toggleText, diarrhea && styles.toggleActiveText]}>Yes</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, !diarrhea && styles.toggleActive]} onPress={() => setDiarrhea(false)}><Text style={[styles.toggleText, !diarrhea && styles.toggleActiveText]}>No</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleStep1}>
          <Text style={styles.nextBtnText}>{t('next')}: {t('ketoneCheck')} ›</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 2: Ketone Check
  if (step === 'ketone') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <View style={styles.stepIndicator}>
          <View style={styles.stepDone}><Text style={styles.stepNum}>✓</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepActive}><Text style={styles.stepNum}>2</Text></View>
          <View style={styles.stepLine} />
          <View style={styles.stepInactive}><Text style={styles.stepNumInactive}>3</Text></View>
        </View>
        <Text style={styles.title}>{t('ketoneAssessment')}</Text>

        <Text style={styles.label}>{t('ketoneMethod')}</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, ketoneMethod === 'blood' && styles.chipActive]} onPress={() => setKetoneMethod('blood')}><Text style={[styles.chipText, ketoneMethod === 'blood' && styles.chipTextActive]}>{t('blood')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.chip, ketoneMethod === 'urine' && styles.chipActive]} onPress={() => setKetoneMethod('urine')}><Text style={[styles.chipText, ketoneMethod === 'urine' && styles.chipTextActive]}>{t('urine')}</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.chip, ketoneMethod === 'unknown' && styles.chipActive]} onPress={() => setKetoneMethod('unknown')}><Text style={[styles.chipText, ketoneMethod === 'unknown' && styles.chipTextActive]}>{t('unknown')}</Text></TouchableOpacity>
        </View>

        <View style={styles.ketonePromptBox}>
        <Text style={styles.ketonePromptTitle}>⏰ Quick Ketone Entry Prompt</Text>
        <Text style={styles.ketonePromptText}>
          During the initial check-in, enter blood or urine ketone values now. The app will prompt you every 5 minutes until a value is provided — this helps ensure timely ketone data during the sick day assessment.
        </Text>
      </View>
      {ketoneMethod !== 'unknown' && (
          <>
            <Text style={styles.label}>{t('ketoneValue')}</Text>
            <TextInput style={styles.glucoseInput} value={ketoneValue} onChangeText={setKetoneValue} keyboardType="numeric" placeholder={ketoneMethod === 'blood' ? 'mmol/L' : 'negative/trace/small/moderate/large'} />
          </>
        )}
        {ketoneMethod === 'unknown' && (
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>Cannot test ketones — proceeding with limited guidance. Seek care if symptoms worsen.</Text>
          </View>
        )}

        <TouchableOpacity style={styles.nextBtn} onPress={handleStep2}>
          <Text style={styles.nextBtnText}>{saving ? t('loading') : `${t('next')}: ${t('resultsAndGuidance')} ›`}</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // Step 3: Results & Guidance
  const glucoseVal = parseFloat(glucose);
  const isEmergency = matchedRule?.escalate || redFlags.length > 0;
  const suppDose = matchedRule?.supplemental_insulin_percent && regimen?.approved_by_clinician && regimen.tdd
    ? (regimen.tdd * Math.abs(matchedRule.supplemental_insulin_percent) / 100)
    : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
      <View style={styles.stepIndicator}>
        <View style={styles.stepDone}><Text style={styles.stepNum}>✓</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepDone}><Text style={styles.stepNum}>✓</Text></View>
        <View style={styles.stepLine} />
        <View style={styles.stepActive}><Text style={styles.stepNum}>3</Text></View>
      </View>

      {/* Emergency Override */}
      {isEmergency && (
        <View style={styles.emergencyBox}>
          <Text style={styles.emergencyTitle}>{t('emergencyNow')}</Text>
          <Text style={styles.emergencyText}>{t('goToHospital')}</Text>
          <Text style={styles.emergencyText}>{t('callClinician')}</Text>
          {redFlags.map((f, i) => <Text key={i} style={styles.redFlagItem}>• {f}</Text>)}
        </View>
      )}

      {/* Guidance */}
      {matchedRule && (
        <View style={styles.guidanceCard}>
          <Text style={styles.guidanceTitle}>{t('guidance')}</Text>

          {/* Insulin Guidance — hypoglycemia always overrides any insulin increase */}
          <View style={styles.guidanceSection}>
            <Text style={styles.guidanceLabel}>{t('supplementalInsulin')}</Text>
            {glucoseVal < HYPO_THRESHOLD ? (
              <View style={styles.hypoBox}>
                <Text style={styles.hypoBoxTitle}>{t('hypoWarning')}</Text>
                <Text style={styles.guidanceText}>{t('doNotIncreaseInsulin')}</Text>
                <Text style={styles.guidanceText}>{t('treatHypoFirst')}</Text>
              </View>
            ) : matchedRule.supplemental_insulin_percent ? (
              suppDose !== null ? (
                <>
                  <Text style={styles.guidanceText}>{matchedRule.supplemental_insulin_percent > 0 ? 'Increase' : 'Reduce'} TDD by {Math.abs(matchedRule.supplemental_insulin_percent)}%</Text>
                  <Text style={styles.doseText}>
                    {matchedRule.supplemental_insulin_percent > 0 ? '+' : ''}{suppDose.toFixed(1)} units from the clinician-approved TDD
                  </Text>
                </>
              ) : (
                <Text style={styles.guidanceText}>Supplemental insulin guidance is unavailable because the regimen is not clinician-approved. Contact the care team.</Text>
              )
            ) : (
              <Text style={styles.guidanceText}>{t('noExtraInsulin')}</Text>
            )}
          </View>

          {/* Monitoring */}
          <View style={styles.guidanceSection}>
            <Text style={styles.guidanceLabel}>⏱️ {t('monitoring')}</Text>
            <Text style={styles.guidanceText}>{t('checkGlucoseEvery', { minutes: matchedRule.monitoring_glucose_minutes })}</Text>
            <Text style={styles.guidanceText}>{t('checkKetoneEvery', { minutes: matchedRule.monitoring_ketone_minutes })}</Text>
          </View>

          {/* Hydration */}
          <View style={styles.guidanceSection}>
            <Text style={styles.guidanceLabel}>💧 {t('hydrationGuidance')}</Text>
            <Text style={styles.guidanceText}>{t('sipFluids')}</Text>
            <Text style={styles.guidanceText}>
              {glucoseVal < HYDRATION_THRESHOLD ? t('carbFluids') : t('noCarbFluids')}
            </Text>
            <Text style={styles.guidanceText}>{t('foodSuggestions')}</Text>
          </View>
        </View>
      )}

      {/* Red Flags */}
      {!isEmergency && (
        <View style={styles.redFlagBox}>
          <Text style={styles.redFlagTitle}>{t('redFlags')}</Text>
          <Text style={styles.redFlagText}>• Ketones ≥ 3.0 mmol/L (blood) or large (urine)</Text>
          <Text style={styles.redFlagText}>• Persistent vomiting / cannot keep fluids down</Text>
          <Text style={styles.redFlagText}>• Fever that persists</Text>
          <Text style={styles.redFlagText}>• Child under 5 years old</Text>
          <Text style={styles.redFlagText}>• Cannot keep glucose above 70 mg/dL</Text>
          <Text style={styles.redFlagText}>• Condition is deteriorating</Text>
          {patient?.comorbid_conditions?.length ? <Text style={styles.redFlagText}>• Known comorbid condition</Text> : null}
        </View>
      )}

      {/* Mini-dose Glucagon */}
      <View style={styles.glucagonCard}>
        <Text style={styles.guidanceLabel}>{t('miniDoseGlucagon')}</Text>
        <Text style={styles.disclaimerSmall}>{t('forClinicianUse')}</Text>
        {GLUCAGON_DOSE_TABLE.map((row, i) => (
          <View key={i} style={styles.glucagonRow}>
            <Text style={styles.glucagonAge}>{row.ageMin < 2 ? t('underTwo') : row.ageMin >= 15 ? '> 15 years' : `${row.ageMin}-${row.ageMax} years`}</Text>
            <Text style={styles.glucagonDose}>{row.doseMg} mg ({row.doseUnits !== undefined ? `${row.doseUnits} units` : `${row.doseUnitsPerYear} unit/yr`})</Text>
          </View>
        ))}
      </View>

      <Text style={styles.smallDisclaimer}>{t('disclaimer')}</Text>

      <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.doneBtnText}>Done</Text>
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stepIndicator: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  stepActive: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center' },
  stepDone: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#34a853', justifyContent: 'center', alignItems: 'center' },
  stepInactive: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#dadce0', justifyContent: 'center', alignItems: 'center' },
  stepLine: { width: 30, height: 2, backgroundColor: '#dadce0' },
  stepNum: { color: '#fff', fontWeight: '700', fontSize: 16, fontFamily: FONT.bold },
  stepNumInactive: { color: '#5f6368', fontWeight: '700', fontSize: 16, fontFamily: FONT.bold },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  nauseaWarning: { backgroundColor: '#fce8e6', borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: '#ea4335' },
  nauseaText: { fontSize: 13, fontFamily: FONT.semibold, color: '#ea4335', fontWeight: '600' },
  glucoseInput: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 28, fontFamily: FONT.bold, fontWeight: '700', borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  toggleRow: { flexDirection: 'row', gap: 12 },
  toggleBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', backgroundColor: '#e8eaed' },
  toggleActive: { backgroundColor: '#1a73e8' },
  toggleText: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#3c4043' },
  toggleActiveText: { color: '#fff' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  warningBox: { backgroundColor: '#fef7e0', borderRadius: 8, padding: 12, marginTop: 14, borderWidth: 1, borderColor: '#f9ab00' },
  warningText: { fontSize: 13, fontFamily: FONT.regular, color: '#e37400' },
  nextBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  nextBtnText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
  emergencyBox: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 18, marginBottom: 16, borderWidth: 2, borderColor: '#ea4335' },
  emergencyTitle: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: '#ea4335', marginBottom: 8 },
  emergencyText: { fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 4 },
  redFlagItem: { fontSize: 14, fontFamily: FONT.semibold, color: '#ea4335', fontWeight: '600', paddingVertical: 2 },
  guidanceCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 14, borderWidth: 1, borderColor: '#e8eaed' },
  guidanceTitle: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginBottom: 14 },
  guidanceSection: { marginBottom: 16 },
  guidanceLabel: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginBottom: 6 },
  guidanceText: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', paddingVertical: 2 },
  doseText: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8', marginTop: 4 },
  redFlagBox: { backgroundColor: '#fef7e0', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#f9ab00' },
  redFlagTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#e37400', marginBottom: 6 },
  redFlagText: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', paddingVertical: 1 },
  hypoBox: { backgroundColor: '#FEE2E2', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#C0392B' },
  hypoBoxTitle: { fontSize: 15, fontFamily: FONT.extrabold, fontWeight: '800', color: '#C0392B', marginBottom: 4 },
  glucagonCard: { backgroundColor: '#fff', borderRadius: 10, padding: 14, marginBottom: 14, borderWidth: 1, borderColor: '#c6a9ff' },
  glucagonRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e8eaed' },
  glucagonAge: { fontSize: 14, fontFamily: FONT.regular, color: '#202124' },
  glucagonDose: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  disclaimerSmall: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 8, fontStyle: 'italic' },
  smallDisclaimer: { textAlign: 'center', color: '#5f6368', fontSize: 11, fontFamily: FONT.regular, marginTop: 10, paddingHorizontal: 12 },
  doneBtn: { backgroundColor: '#34a853', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  doneBtnText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
  ketonePromptBox: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 14, marginTop: 14, marginBottom: 14, borderWidth: 1, borderColor: '#1a73e8' },
  ketonePromptTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8', marginBottom: 6 },
  ketonePromptText: { fontSize: 13, fontFamily: FONT.regular, color: '#1a73e8', lineHeight: 18 },
});
