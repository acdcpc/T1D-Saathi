import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator,
} from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { InsulinRegimen } from '../types';

export default function RegimenSettingsScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { t } = useLanguage();
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [loading, setLoading] = useState(true);
  const [insulinType, setInsulinType] = useState('');
  const [dose, setDose] = useState('');
  const [frequency, setFrequency] = useState('');
  const [delivery, setDelivery] = useState<string>('pen');
  const [tdd, setTdd] = useState('');
  const [isf, setIsf] = useState('');
  const [carbRatio, setCarbRatio] = useState('');
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
        setIsf(data.isf ? String(data.isf) : '');
        setCarbRatio(data.carb_ratio ? String(data.carb_ratio) : '');
        setTarget(data.correction_target ? String(data.correction_target) : '120');
      }
      setLoading(false);
    })();
  }, [patientId]);

  const handleSave = async () => {
    const entry = {
      patient_id: patientId,
      insulin_type: insulinType,
      dose: parseFloat(dose) || 0,
      frequency,
      delivery_method: delivery,
      tdd: parseFloat(tdd) || null,
      isf: parseFloat(isf) || null,
      carb_ratio: parseFloat(carbRatio) || null,
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
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('insulinRegimen')}</Text>
      <Text style={styles.label}>{t('insulinType')}</Text>
      <TextInput style={styles.input} value={insulinType} onChangeText={setInsulinType} />
      <Text style={styles.label}>Dose (units)</Text>
      <TextInput style={styles.input} value={dose} onChangeText={setDose} keyboardType="numeric" />
      <Text style={styles.label}>{t('frequency')}</Text>
      <TextInput style={styles.input} value={frequency} onChangeText={setFrequency} />
      <Text style={styles.label}>{t('deliveryMethod')}</Text>
      <View style={styles.row}>
        {(['pen', 'syringe', 'pump'] as const).map(d => (
          <TouchableOpacity key={d} style={[styles.chip, delivery === d && styles.chipActive]} onPress={() => setDelivery(d)}>
            <Text style={[styles.chipText, delivery === d && styles.chipTextActive]}>{t(d)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={styles.label}>{t('tdd')}</Text>
      <TextInput style={styles.input} value={tdd} onChangeText={setTdd} keyboardType="numeric" />
      <Text style={styles.label}>{t('isf')} (mg/dL per unit)</Text>
      <TextInput style={styles.input} value={isf} onChangeText={setIsf} keyboardType="numeric" placeholder="e.g. 50" />
      <Text style={styles.label}>{t('carbRatio')} (I:C ratio)</Text>
      <TextInput style={styles.input} value={carbRatio} onChangeText={setCarbRatio} keyboardType="numeric" placeholder="e.g. 10" />
      <Text style={styles.label}>{t('correctionTarget')}</Text>
      <TextInput style={styles.input} value={target} onChangeText={setTarget} keyboardType="numeric" />
      <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
        <Text style={styles.saveText}>{t('save')}</Text>
      </TouchableOpacity>
      <View style={{ height: 40 }} />
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
  row: { flexDirection: 'row', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#1a73e8' },
  chipText: { fontSize: 14, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  saveBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 24 },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
