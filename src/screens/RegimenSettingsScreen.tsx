import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import Dropdown from '../components/Dropdown';
import type { InsulinRegimen } from '../types';
import { FONT, T } from '../theme';
import BackBar from '../components/BackBar';
import GradientButton from '../components/GradientButton';
import { notifyCliniciansRequest } from '../utils/pushAlerts';
import { computeTddFromDoses } from '../utils/regimenMath';

const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

// Dual-insulin model per ISPAD basal-bolus standard.
const BASAL_INSULIN_OPTIONS = [
  'Glargine (Lantus)', 'Glargine U300 (Toujeo)', 'Detemir (Levemir)', 'Degludec (Tresiba)', 'NPH (Insulatard)', 'None',
];
const BOLUS_INSULIN_OPTIONS = [
  'Aspart (NovoRapid)', 'Lispro (Humalog)', 'Glulisine (Apidra)', 'Faster aspart (Fiasp)',
  'Regular human insulin (Actrapid)', 'Premix 70/30 (Mixtard)', 'None',
];
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Before each meal', 'Before meals + bedtime', 'Sliding scale',
];

// ISPAD dosing rule constants
const ISF_CONSTANT = 1800;
const ICR_CONSTANT = 500;

export default function RegimenSettingsScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [basalInsulin, setBasalInsulin] = useState('');
  const [bolusInsulin, setBolusInsulin] = useState('');
  const [regimenType, setRegimenType] = useState<'mdi' | 'pump' | 'premix'>('mdi');
  const [dose, setDose] = useState('');
  const [bolusDose, setBolusDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [delivery, setDelivery] = useState<string>('pen');
  const [tdd, setTdd] = useState('');
  const [isf, setIsf] = useState('');
  const [carbRatio, setCarbRatio] = useState('');
  const [target, setTarget] = useState('');
  const [maxBolus, setMaxBolus] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [reviewSent, setReviewSent] = useState(false);
  const [lastRequestStatus, setLastRequestStatus] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('insulin_regimens')
        .select('*')
        .eq('patient_id', patientId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .single();
      if (data) {
        setRegimen(data);
        setBasalInsulin(data.basal_insulin || '');
        setBolusInsulin(data.bolus_insulin || '');
        setRegimenType((data.regimen_type as any) || 'mdi');
        setDose(String(data.dose));
        setBolusDose(data.bolus_dose ? String(data.bolus_dose) : '');
        setFrequency(data.frequency || '');
        setDelivery(data.delivery_method);
        setTdd(data.tdd ? String(data.tdd) : '');
        setIsf(data.isf ? String(data.isf) : '');
        setCarbRatio(data.carb_ratio ? String(data.carb_ratio) : '');
        setTarget(data.correction_target ? String(data.correction_target) : '');
        setMaxBolus(data.max_bolus ? String(data.max_bolus) : '');
      }
      try {
        const { data: reqRow } = await supabase
          .from('regimen_requests')
          .select('status,created_at')
          .eq('patient_id', patientId)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        setLastRequestStatus((reqRow as { status?: string } | null)?.status || null);
      } catch { /* best-effort; the table exists after the round-9 migration */ }
      setLoading(false);
    })();
  }, [patientId]);

  // Auto-calculated ISF / I:C from TDD (fallback when manual override is empty)
  const tddNum = parseFloat(tdd);
  const tddValid = !Number.isNaN(tddNum) && tddNum > 0;
  const autoIsf = tddValid ? Math.round((ISF_CONSTANT / tddNum) * 10) / 10 : null;
  const autoIcr = tddValid ? Math.round((ICR_CONSTANT / tddNum) * 10) / 10 : null;

  // Estimated TDD hint from doses + frequency (bolus is entered per dose).
  // Never auto-overwrites the confirmed TDD field.
  const basalNum = parseFloat(dose);
  const bolusNum = parseFloat(bolusDose);
  const estimatedTdd = computeTddFromDoses(
    Number.isFinite(basalNum) ? basalNum : null,
    Number.isFinite(bolusNum) ? bolusNum : null,
    frequency,
  );

  const handleSave = async () => {
    const tddValue = parseFloat(tdd);
    const targetValue = parseFloat(target);
    const hasBasal = !!basalInsulin && basalInsulin !== 'None';
    const hasBolus = !!bolusInsulin && bolusInsulin !== 'None';
    if ((!hasBasal && !hasBolus) || !Number.isFinite(tddValue) || tddValue <= 0 || !Number.isFinite(targetValue) || targetValue <= 0) {
      Alert.alert(t('error'), 'At least one insulin (basal/bolus), total daily dose, and correction target are required.');
      return;
    }
    const entry = {
      patient_id: patientId,
      regimen_type: regimenType || 'mdi',
      insulin_type: [hasBasal ? basalInsulin : null, hasBolus ? bolusInsulin : null].filter(Boolean).join(' + '),
      basal_insulin: hasBasal ? basalInsulin : null,
      basal_dose: parseFloat(dose) || null,
      bolus_dose: parseFloat(bolusDose) || null,
      bolus_insulin: hasBolus ? bolusInsulin : null,
      dose: parseFloat(dose) || 0,
      frequency,
      delivery_method: delivery,
      tdd: tddValue,
      isf: parseFloat(isf) || autoIsf || null,
      carb_ratio: parseFloat(carbRatio) || autoIcr || null,
      correction_target: targetValue,
      max_bolus: parseFloat(maxBolus) || null,
      approved_by_clinician: false,
      approved_at: null,
      approved_by: null,
      effective_date: new Date().toISOString(),
    };
    const { error } = await supabase.from('insulin_regimens').insert(entry);
    if (error) Alert.alert(t('error'), error.message);
    else {
      try {
        await supabase.from('regimen_requests').insert({
          patient_id: patientId,
          requested_by: user?.id || null,
          kind: 'change',
          note: null,
        });
      } catch { /* best effort */ }
      notifyCliniciansRequest(patientId, 'Regimen updated by family — review requested');
      Alert.alert(t('success'), language === 'ne'
        ? 'रेजिमेन अपडेट भयो। समीक्षाको लागि चिकित्सकलाई जानकारी गराइयो।'
        : 'Regimen updated. Your clinician has been notified for review.');
      navigation.goBack();
    }
  };

  const handleRequestReview = async () => {
    try {
      const { error } = await supabase.from('regimen_requests').insert({
        patient_id: patientId,
        requested_by: user?.id || null,
        kind: 'review',
        note: reviewNote.trim() || null,
      });
      if (error) { Alert.alert(t('error'), error.message); return; }
      await notifyCliniciansRequest(patientId, reviewNote.trim() || undefined);
      setReviewSent(true);
      setReviewNote('');
      setLastRequestStatus('pending');
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Could not send request');
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0D9488" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, contentCol, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <BackBar navigation={navigation} />
      <Text style={styles.title}>{t('insulinRegimen')}</Text>
      <Text style={styles.notice}>New regimen settings remain unavailable for dosing until reviewed and approved by a clinician.</Text>
      {lastRequestStatus === 'pending' && (
        <Text style={styles.pendingBanner}>{language === 'ne' ? 'समीक्षा अनुरोध गरिएको — चिकित्सकको प्रतीक्षामा' : 'Review requested — waiting for your clinician'}</Text>
      )}
      {lastRequestStatus === 'resolved' && (
        <Text style={styles.resolvedBanner}>{language === 'ne' ? 'चिकित्सकले समीक्षा गर्नुभयो' : 'Reviewed by clinician'}</Text>
      )}

      <Text style={styles.label}>Regimen type</Text>
      <View style={styles.row}>
        {([['mdi', 'Basal-bolus (MDI)'], ['pump', 'Pump (CSII)'], ['premix', 'Premixed']] as const).map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.chip, regimenType === k && styles.chipActive]} onPress={() => setRegimenType(k)}>
            <Text style={[styles.chipText, regimenType === k && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Dropdown
        label="Long-acting (basal) insulin *"
        options={BASAL_INSULIN_OPTIONS}
        value={basalInsulin}
        onChange={setBasalInsulin}
        placeholder="Select basal insulin"
      />
      <Dropdown
        label="Rapid-acting (bolus) insulin *"
        options={BOLUS_INSULIN_OPTIONS}
        value={bolusInsulin}
        onChange={setBolusInsulin}
        placeholder="Select bolus insulin"
      />

      <Text style={styles.label}>Long-acting (basal) dose (units/day)</Text>
      <TextInput style={styles.input} value={dose} onChangeText={setDose} keyboardType="numeric" />

      <Text style={styles.label}>Rapid-acting (bolus) dose (units per dose)</Text>
      <TextInput style={styles.input} value={bolusDose} onChangeText={setBolusDose} keyboardType="numeric" />
      {estimatedTdd != null ? (
        <Text style={styles.hintSmall}>
          {language === 'ne'
            ? `अनुमानित TDD: बेसल + बोलस × आवृत्ति = ${estimatedTdd} U/दिन। आफ्नो TDD चिकित्सकसँग पुष्टि गर्नुहोस्।`
            : `Estimated TDD: basal + bolus × frequency = ${estimatedTdd} U/day. Confirm your TDD with your clinician.`}
        </Text>
      ) : null}

      <Dropdown
        label={t('frequency')}
        options={FREQUENCY_OPTIONS}
        value={frequency}
        onChange={setFrequency}
        placeholder="Select frequency"
      />

      <Text style={styles.label}>{t('deliveryMethod')}</Text>
      <View style={styles.row}>
        {(['pen', 'syringe', 'pump'] as const).map(d => (
          <TouchableOpacity key={d} style={[styles.chip, delivery === d && styles.chipActive]} onPress={() => setDelivery(d)}>
            <Text style={[styles.chipText, delivery === d && styles.chipTextActive]}>{t(d)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('tdd')} *</Text>
      <TextInput style={styles.input} value={tdd} onChangeText={setTdd} keyboardType="numeric" placeholder="Total Daily Dose in units" />

      {/* Auto-calculated dosing */}
      <View style={styles.autoCard}>
        <Text style={styles.autoCardTitle}>Auto-calculated dosing (from TDD)</Text>
        <View style={styles.autoRow}>
          <View style={styles.autoField}>
            <Text style={styles.autoLabel}>{t('isf')} — sensitivity factor</Text>
            <Text style={styles.autoValue}>{autoIsf != null ? `${autoIsf} mg/dL/unit` : '—'}</Text>
            <Text style={styles.autoFormula}>1800 ÷ TDD</Text>
          </View>
          <View style={styles.autoField}>
            <Text style={styles.autoLabel}>{t('carbRatio')} — carb ratio</Text>
            <Text style={styles.autoValue}>{autoIcr != null ? `1 : ${autoIcr} g` : '—'}</Text>
            <Text style={styles.autoFormula}>500 ÷ TDD</Text>
          </View>
        </View>
        <Text style={styles.autoNote}>Starting estimates — review with your clinician.</Text>
      </View>

      <Text style={styles.label}>{t('isf')} (mg/dL per unit) — optional override</Text>
      <TextInput style={styles.input} value={isf} onChangeText={setIsf} keyboardType="numeric" placeholder="e.g. 50" />

      <Text style={styles.label}>{t('carbRatio')} (I:C ratio) — optional override</Text>
      <TextInput style={styles.input} value={carbRatio} onChangeText={setCarbRatio} keyboardType="numeric" placeholder="e.g. 10" />

      <Text style={styles.label}>{t('correctionTarget')} (mg/dL)</Text>
      <TextInput style={styles.input} value={target} onChangeText={setTarget} keyboardType="numeric" />

      <Text style={styles.label}>Maximum bolus (units) — optional</Text>
      <TextInput style={styles.input} value={maxBolus} onChangeText={setMaxBolus} keyboardType="numeric" placeholder="e.g. 10" />
      <Text style={styles.hintSmall}>Used to warn on unusually large doses. Set this together with your clinician.</Text>

      <View style={styles.reviewCard}>
        <Text style={styles.reviewTitle}>{language === 'ne' ? 'चिकित्सक समीक्षा अनुरोध' : 'Request clinician review'}</Text>
        <Text style={styles.reviewHint}>{language === 'ne' ? 'रेजिमेनबारे चिकित्सकको सल्लाह चाहिए? अनुरोध पठाउनुहोस् — चिकित्सकलाई सूचना जान्छ।' : 'Want your clinician to review your regimen? Send a request — your clinician gets a notification.'}</Text>
        <TextInput
          style={[styles.input, styles.reviewInput]}
          value={reviewNote}
          onChangeText={setReviewNote}
          placeholder={language === 'ne' ? 'वैकल्पिक नोट (जस्तै: बिहानको रिडिङ उच्च छ)' : 'Optional note (e.g. high readings after breakfast)'}
          multiline
        />
        <TouchableOpacity accessibilityRole="button" style={styles.reviewBtn} onPress={handleRequestReview}>
          <Text style={styles.reviewBtnText}>{reviewSent ? (language === 'ne' ? '✓ अनुरोध पठाइयो' : '✓ Request sent') : (language === 'ne' ? 'अनुरोध पठाउनुहोस्' : 'Send review request')}</Text>
        </TouchableOpacity>
        {reviewSent ? (
          <Text style={styles.reviewSentText}>{language === 'ne' ? 'चिकित्सकलाई जानकारी जानेछ — समीक्षा पछि डोज सहायता खुल्छ।' : 'Your clinician will be notified — dose help unlocks after their review.'}</Text>
        ) : null}
      </View>

      <GradientButton label={t('save')} onPress={handleSave} style={{ marginTop: 24 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  notice: { backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 10, padding: 12, fontSize: 13, lineHeight: 19, marginBottom: 4 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#0D9488' },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  autoCard: { backgroundColor: '#E6F7F4', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#B8E6DF' },
  autoCardTitle: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: '#0B5E58', marginBottom: 10 },
  autoRow: { flexDirection: 'row', gap: 12 },
  autoField: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  autoLabel: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 4 },
  autoValue: { fontSize: 17, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124' },
  autoFormula: { fontSize: 11, fontFamily: FONT.regular, color: '#0D9488', marginTop: 3 },
  autoNote: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginTop: 10, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#0D9488', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
  hintSmall: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginTop: 6, fontStyle: 'italic' },
  pendingBanner: { backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 17, marginTop: 8 },
  resolvedBanner: { backgroundColor: '#E6F7F4', color: '#0B5E58', borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 17, marginTop: 8 },
  reviewCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#dadce0', marginTop: 28 },
  reviewTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginBottom: 6 },
  reviewHint: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368', lineHeight: 17, marginBottom: 8 },
  reviewInput: { minHeight: 64, textAlignVertical: 'top' },
  reviewBtn: { backgroundColor: '#0D9488', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  reviewBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  reviewSentText: { fontSize: 12, fontFamily: FONT.regular, color: '#0B5E58', marginTop: 8 },
});
