import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Platform,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import BSDatePicker from '../components/BSDatePicker';
import { T, input, section, primBtn } from '../theme';

const COMORBID_OPTIONS = ['celiac', 'thyroid', 'downSyndrome'];
const SEX_OPTIONS = ['male', 'female', 'other'] as const;
const DELIVERY_OPTIONS = ['pen', 'syringe', 'pump'] as const;

export default function AddPatientScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<string>('male');
  const [comorbid, setComorbid] = useState<string[]>([]);
  const [medications, setMedications] = useState('');
  const [insulinType, setInsulinType] = useState('');
  const [insulinDose, setInsulinDose] = useState('');
  const [insulinFreq, setInsulinFreq] = useState('');
  const [delivery, setDelivery] = useState<string>('pen');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [dkaDesc, setDkaDesc] = useState('');
  const [tdd, setTdd] = useState('');
  const [isf, setIsf] = useState('');
  const [carbRatio, setCarbRatio] = useState('');

  const toggleComorbid = (c: string) => {
    setComorbid(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleSave = async () => {
    if (!user) return Alert.alert(t('error'), 'Not logged in');
    if (!name.trim()) return Alert.alert(t('error'), 'Name is required');
    if (!insulinType.trim()) return Alert.alert(t('error'), 'Insulin type is required');

    setLoading(true);
    const patientData = {
      user_id: user.id,
      name: name.trim(),
      date_of_birth: dob || null,
      sex,
      comorbid_conditions: comorbid.length > 0 ? comorbid : null,
      medications: medications.trim() || null,
      insulin_type: insulinType.trim(),
      insulin_dose: parseFloat(insulinDose) || 0,
      insulin_frequency: insulinFreq.trim() || null,
      insulin_delivery: delivery,
      diagnosis_date: diagnosisDate || null,
      dka_history: dkaDesc.trim() ? [{ date: new Date().toISOString(), description: dkaDesc.trim() }] : null,
    };

    const { error } = await supabase.from('patients').insert(patientData);
    setLoading(false);

    if (error) {
      Alert.alert(t('error'), error.message);
    } else {
      // Also create insulin regimen entry
      const { data: newPatient } = await supabase.from('patients')
        .select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).single();
      if (newPatient) {
        await supabase.from('insulin_regimens').insert({
          patient_id: newPatient.id,
          insulin_type: insulinType.trim(),
          dose: parseFloat(insulinDose) || 0,
          frequency: insulinFreq.trim() || 'daily',
          delivery_method: delivery,
          tdd: parseFloat(tdd) || null,
          isf: parseFloat(isf) || null,
          carb_ratio: parseFloat(carbRatio) || null,
          effective_date: new Date().toISOString(),
        });
      }
      Alert.alert(t('success'), 'Patient added', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.section}>{t('profileSetup')}</Text>
      <Text style={styles.label}>{t('childName')} *</Text>
      <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Full name" />

      <BSDatePicker
        label={t('dateOfBirth')}
        value={dob}
        onChange={(ad, bs) => setDob(ad)}
      />

      <Text style={styles.label}>{t('sex')}</Text>
      <View style={styles.chipRow}>
        {SEX_OPTIONS.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, sex === s && styles.chipActive]} onPress={() => setSex(s)}>
            <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{t(s as any)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <BSDatePicker
        label={t('diagnosisDate')}
        value={diagnosisDate}
        onChange={(ad, bs) => setDiagnosisDate(ad)}
      />

      <Text style={styles.section}>{t('insulinRegimen')}</Text>
      <Text style={styles.label}>{t('insulinType')} *</Text>
      <TextInput style={styles.input} value={insulinType} onChangeText={setInsulinType} placeholder="e.g. Rapid-acting + basal" />

      <Text style={styles.label}>{t('insulinType')} {t('dose')}</Text>
      <TextInput style={styles.input} value={insulinDose} onChangeText={setInsulinDose} placeholder="Units" keyboardType="numeric" />

      <Text style={styles.label}>{t('frequency')}</Text>
      <TextInput style={styles.input} value={insulinFreq} onChangeText={setInsulinFreq} placeholder="e.g. Before meals + bedtime" />

      <Text style={styles.label}>{t('deliveryMethod')}</Text>
      <View style={styles.chipRow}>
        {DELIVERY_OPTIONS.map(d => (
          <TouchableOpacity key={d} style={[styles.chip, delivery === d && styles.chipActive]} onPress={() => setDelivery(d)}>
            <Text style={[styles.chipText, delivery === d && styles.chipTextActive]}>{t(d as any)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('tdd')}</Text>
      <TextInput style={styles.input} value={tdd} onChangeText={setTdd} placeholder="Total Daily Dose in units" keyboardType="numeric" />

      <Text style={styles.label}>{t('isf')}</Text>
      <TextInput style={styles.input} value={isf} onChangeText={setIsf} placeholder="e.g. 50 (mg/dL per unit)" keyboardType="numeric" />

      <Text style={styles.label}>{t('carbRatio')}</Text>
      <TextInput style={styles.input} value={carbRatio} onChangeText={setCarbRatio} placeholder="e.g. 10 (g carbs per unit)" keyboardType="numeric" />

      <Text style={styles.section}>{t('comorbidConditions')}</Text>
      <View style={styles.chipRow}>
        {COMORBID_OPTIONS.map(c => (
          <TouchableOpacity key={c} style={[styles.chip, comorbid.includes(c) && styles.chipActiveWarn]} onPress={() => toggleComorbid(c)}>
            <Text style={[styles.chipText, comorbid.includes(c) && styles.chipTextWarn]}>{t(c as any)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('currentMedications')}</Text>
      <TextInput style={styles.input} value={medications} onChangeText={setMedications} placeholder="List all current medications" multiline />

      <Text style={styles.label}>{t('dkaHistory')}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={dkaDesc} onChangeText={setDkaDesc} placeholder="Describe any past DKA or severe illness" multiline numberOfLines={3} />

      <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveText}>{t('save')}</Text>}
      </TouchableOpacity>

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16 },
  section: { ...section, color: T.blue, fontSize: 16, marginTop: 24, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 6, marginTop: 10 },
  input: { ...input },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  chipActive: { backgroundColor: T.blue, borderColor: T.blue },
  chipActiveWarn: { backgroundColor: T.red, borderColor: T.red },
  chipText: { fontSize: 14, color: T.muted },
  chipTextActive: { color: '#fff' },
  chipTextWarn: { color: '#fff' },
  saveBtn: { ...primBtn, marginTop: 30 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
