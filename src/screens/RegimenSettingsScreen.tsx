import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import Dropdown from '../components/Dropdown';
import type { InsulinRegimen } from '../types';
import { FONT, T } from '../theme';
import BackBar from '../components/BackBar';
import GradientButton from '../components/GradientButton';

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
      setLoading(false);
    })();
  }, [patientId]);

  // Auto-calculated ISF / I:C from TDD (fallback when manual override is empty)
  const tddNum = parseFloat(tdd);
  const tddValid = !Number.isNaN(tddNum) && tddNum > 0;
  const autoIsf = tddValid ? Math.round((ISF_CONSTANT / tddNum) * 10) / 10 : null;
  const autoIcr = tddValid ? Math.round((ICR_CONSTANT / tddNum) * 10) / 10 : null;

  // Basal + bolus sum, shown as a hint only when both fields are filled in.
  // Never auto-overwrites the clinician-confirmed TDD.
  const basalNum = parseFloat(dose);
  const bolusNum = parseFloat(bolusDose);
  const showTddHint = Number.isFinite(basalNum) && basalNum > 0 && Number.isFinite(bolusNum) && bolusNum > 0;
  const combinedDose = showTddHint ? Math.round((basalNum + bolusNum) * 10) / 10 : null;

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
      Alert.alert(t('success'), 'Regimen updated');
      navigation.goBack();
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

      <Text style={styles.label}>Rapid-acting (bolus) dose (units/day)</Text>
      <TextInput style={styles.input} value={bolusDose} onChangeText={setBolusDose} keyboardType="numeric" />
      {showTddHint ? (
        <Text style={styles.hintSmall}>
          {language === 'ne'
            ? `बेसल + बोलस = ${combinedDose} U/दिन — धेरै चिकित्सकहरू यो जोडलाई कुल दैनिक डोज (TDD) मान्छन्। आफ्नो TDD चिकित्सकसँग पुष्टि गर्नुहोस्।`
            : `Basal + bolus = ${combinedDose} U/day — many clinicians use this sum as the total daily dose (TDD). Confirm your TDD with your clinician.`}
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
});
