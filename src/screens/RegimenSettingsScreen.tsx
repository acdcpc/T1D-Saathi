import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import Dropdown from '../components/Dropdown';
import type { InsulinRegimen } from '../types';
import { FONT } from '../theme';

const INSULIN_TYPE_OPTIONS = [
  'Rapid-acting', 'Short-acting', 'Intermediate-acting', 'Long-acting', 'Premixed',
];
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Before each meal', 'Before meals + bedtime', 'Sliding scale',
];

// ISPAD dosing rule constants
const ISF_CONSTANT = 1800;
const ICR_CONSTANT = 500;

export default function RegimenSettingsScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();

  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [insulinType, setInsulinType] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [delivery, setDelivery] = useState<string>('pen');
  const [tdd, setTdd] = useState('');
  const [target, setTarget] = useState('120');

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
        setInsulinType(data.insulin_type);
        setDose(String(data.dose));
        setFrequency(data.frequency || '');
        setDelivery(data.delivery_method);
        setTdd(data.tdd ? String(data.tdd) : '');
        setTarget(data.correction_target ? String(data.correction_target) : '120');
      }
      setLoading(false);
    })();
  }, [patientId]);

  // Auto-calculated ISF / I:C from TDD
  const tddNum = parseFloat(tdd);
  const tddValid = !Number.isNaN(tddNum) && tddNum > 0;
  const autoIsf = tddValid ? Math.round((ISF_CONSTANT / tddNum) * 10) / 10 : null;
  const autoIcr = tddValid ? Math.round((ICR_CONSTANT / tddNum) * 10) / 10 : null;

  const handleSave = async () => {
    if (!insulinType.trim()) return Alert.alert(t('error'), 'Insulin type is required');
    if (!tddValid) return Alert.alert(t('error'), 'Enter a valid Total Daily Dose');
    const entry = {
      patient_id: patientId,
      insulin_type: insulinType.trim(),
      dose: parseFloat(dose) || 0,
      frequency,
      delivery_method: delivery,
      tdd: tddNum,
      isf: autoIsf,        // auto-calculated
      carb_ratio: autoIcr, // auto-calculated
      correction_target: parseFloat(target) || 120,
      effective_date: new Date().toISOString(),
    };
    const { error } = await supabase.from('insulin_regimens').insert(entry);
    if (error) Alert.alert(t('error'), error.message);
    else {
      Alert.alert(t('success'), 'Regimen updated');
      navigation.goBack();
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}
    >
      <Text style={styles.title}>{t('insulinRegimen')}</Text>

      <Dropdown
        label={`${t('insulinType')} *`}
        options={INSULIN_TYPE_OPTIONS}
        value={insulinType}
        onChange={setInsulinType}
        placeholder="Select insulin type"
      />

      <Text style={styles.label}>Dose (units)</Text>
      <TextInput style={styles.input} value={dose} onChangeText={setDose} keyboardType="numeric" />

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

      <Text style={styles.label}>{t('correctionTarget')} (mg/dL)</Text>
      <TextInput style={styles.input} value={target} onChangeText={setTarget} keyboardType="numeric" />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>{t('save')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 14 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 16, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  autoCard: { backgroundColor: '#e8f0fe', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#d2e3fc' },
  autoCardTitle: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8', marginBottom: 10 },
  autoRow: { flexDirection: 'row', gap: 12 },
  autoField: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  autoLabel: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 4 },
  autoValue: { fontSize: 17, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124' },
  autoFormula: { fontSize: 11, fontFamily: FONT.regular, color: '#1a73e8', marginTop: 3 },
  autoNote: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginTop: 10, fontStyle: 'italic' },
  saveBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
});
