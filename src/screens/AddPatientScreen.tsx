import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import BSDatePicker from '../components/BSDatePicker';
import { T, input, section, primBtn } from '../theme';

const COMORBID_OPTIONS = ['celiac', 'thyroid', 'downSyndrome'];
const SEX_OPTIONS = ['male', 'female', 'other'] as const;
const DELIVERY_OPTIONS = ['pen', 'syringe', 'pump'] as const;
const INSULIN_TYPE_OPTIONS = [
  'Rapid-acting', 'Short-acting', 'Intermediate-acting', 'Long-acting', 'Premixed',
];
const FREQUENCY_OPTIONS = [
  'Once daily', 'Twice daily', 'Three times daily', 'Before each meal', 'Before meals + bedtime', 'Sliding scale',
];

// ISPAD dosing rule constants (rapid-acting insulin)
const ISF_CONSTANT = 1800; // mg/dL per unit — "1800 rule"
const ICR_CONSTANT = 500;  // grams carb per unit — "500 rule"

/** Simple modal dropdown picker (matches the app's existing chip/picker style). */
function Dropdown({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <Text style={styles.dropdownIcon}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownOption, value === item && styles.dropdownOptionActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item && styles.dropdownOptionActiveText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

export default function AddPatientScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
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

  // ── Auto-calculated dosing (ISPAD rules) ──
  const tddNum = parseFloat(tdd);
  const tddValid = !Number.isNaN(tddNum) && tddNum > 0;
  const autoIsf = tddValid ? Math.round((ISF_CONSTANT / tddNum) * 10) / 10 : null;
  const autoIcr = tddValid ? Math.round((ICR_CONSTANT / tddNum) * 10) / 10 : null;

  const toggleComorbid = (c: string) => {
    setComorbid(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const handleSave = async () => {
    if (!user) return Alert.alert(t('error'), 'Not logged in');
    if (!name.trim()) return Alert.alert(t('error'), 'Name is required');
    if (!insulinType.trim()) return Alert.alert(t('error'), 'Insulin type is required');
    if (!tddValid) return Alert.alert(t('error'), 'Please enter a valid Total Daily Dose (TDD)');

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
      insulin_frequency: insulinFreq || null,
      insulin_delivery: delivery,
      diagnosis_date: diagnosisDate || null,
      dka_history: dkaDesc.trim() ? [{ date: new Date().toISOString(), description: dkaDesc.trim() }] : null,
    };

    const { error } = await supabase.from('patients').insert(patientData);
    if (error) {
      setLoading(false);
      return Alert.alert(t('error'), error.message);
    }

    // Fetch the just-created patient id and create the regimen with auto-calculated values
    const { data: newPatient, error: fetchErr } = await supabase.from('patients')
      .select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (newPatient) {
      const { error: regErr } = await supabase.from('insulin_regimens').insert({
        patient_id: newPatient.id,
        insulin_type: insulinType.trim(),
        dose: parseFloat(insulinDose) || 0,
        frequency: insulinFreq || 'daily',
        delivery_method: delivery,
        tdd: tddNum,
        isf: autoIsf,          // auto-calculated: 1800 ÷ TDD
        carb_ratio: autoIcr,   // auto-calculated: 500 ÷ TDD
        effective_date: new Date().toISOString(),
      });
      if (regErr) console.warn('[AddPatient] regimen insert error:', regErr.message);
    } else if (fetchErr) {
      console.warn('[AddPatient] patient fetch error:', fetchErr.message);
    }

    setLoading(false);
    Alert.alert(t('success'), 'Patient added', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
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

      <Dropdown
        label={`${t('insulinType')} *`}
        options={INSULIN_TYPE_OPTIONS}
        value={insulinType}
        onChange={setInsulinType}
        placeholder="Select insulin type"
      />

      <Text style={styles.label}>{t('insulinType')} {t('dose')}</Text>
      <TextInput style={styles.input} value={insulinDose} onChangeText={setInsulinDose} placeholder="Units" keyboardType="numeric" />

      <Dropdown
        label={t('frequency')}
        options={FREQUENCY_OPTIONS}
        value={insulinFreq}
        onChange={setInsulinFreq}
        placeholder="Select frequency"
      />

      <Text style={styles.label}>{t('deliveryMethod')}</Text>
      <View style={styles.chipRow}>
        {DELIVERY_OPTIONS.map(d => (
          <TouchableOpacity key={d} style={[styles.chip, delivery === d && styles.chipActive]} onPress={() => setDelivery(d)}>
            <Text style={[styles.chipText, delivery === d && styles.chipTextActive]}>{t(d as any)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('tdd')} *</Text>
      <TextInput
        style={styles.input}
        value={tdd}
        onChangeText={setTdd}
        placeholder="Total Daily Dose in units"
        keyboardType="numeric"
      />

      {/* Auto-calculated dosing — read-only, derived from TDD */}
      <View style={styles.autoCard}>
        <Text style={styles.autoCardTitle}>Auto-calculated dosing (from TDD)</Text>
        <View style={styles.autoRow}>
          <View style={styles.autoField}>
            <Text style={styles.autoLabel}>{t('isf')} — insulin sensitivity factor</Text>
            <Text style={styles.autoValue}>{autoIsf != null ? `${autoIsf} mg/dL/unit` : '—'}</Text>
            <Text style={styles.autoFormula}>1800 ÷ TDD</Text>
          </View>
          <View style={styles.autoField}>
            <Text style={styles.autoLabel}>{t('carbRatio')} — insulin-to-carb ratio</Text>
            <Text style={styles.autoValue}>{autoIcr != null ? `1 : ${autoIcr} g` : '—'}</Text>
            <Text style={styles.autoFormula}>500 ÷ TDD</Text>
          </View>
        </View>
        <Text style={styles.autoNote}>These are starting estimates. Your clinician should review and approve them.</Text>
      </View>

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

  // Dropdown
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: T.border },
  dropdownText: { fontSize: 15, color: T.text },
  dropdownPlaceholder: { fontSize: 15, color: T.muted },
  dropdownIcon: { fontSize: 16, color: T.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dropdownModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  dropdownTitle: { fontSize: 16, fontWeight: '700', color: T.text, textAlign: 'center', marginBottom: 12 },
  dropdownOption: { padding: 14, borderRadius: 8, marginVertical: 2 },
  dropdownOptionActive: { backgroundColor: T.blueLight },
  dropdownOptionText: { fontSize: 15, color: T.text },
  dropdownOptionActiveText: { color: T.blue, fontWeight: '700' },

  // Auto-calculated dosing card
  autoCard: { backgroundColor: T.blueLight, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#BBD7F0' },
  autoCardTitle: { fontSize: 13, fontWeight: '700', color: T.blueDark, marginBottom: 10 },
  autoRow: { flexDirection: 'row', gap: 12 },
  autoField: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  autoLabel: { fontSize: 11, color: T.muted, marginBottom: 4 },
  autoValue: { fontSize: 17, fontWeight: '800', color: T.text },
  autoFormula: { fontSize: 11, color: T.blue, marginTop: 3 },
  autoNote: { fontSize: 11, color: T.muted, marginTop: 10, fontStyle: 'italic' },

  saveBtn: { ...primBtn, marginTop: 30 },
  saveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
