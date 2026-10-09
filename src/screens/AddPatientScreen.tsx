import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView,
  Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import BSDatePicker from '../components/BSDatePicker';
import { computeTddFromDoses } from '../utils/regimenMath';
import { FONT,  T, input, section, primBtn } from '../theme';
import BackBar from '../components/BackBar';
import ChildAvatar from '../components/ChildAvatar';
import { Ionicons } from '@expo/vector-icons';
import { pickPatientPhoto } from '../utils/patientPhoto';
import GradientButton from '../components/GradientButton';
import { D2 } from '../design/tokens';

const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

const COMORBID_OPTIONS: { key: string; en: string; ne: string }[] = [
  { key: 'celiac', en: 'Celiac Disease', ne: 'सिलियाक रोग' },
  { key: 'thyroid', en: 'Thyroid Disease', ne: 'थाइरोइड रोग' },
  { key: 'downSyndrome', en: 'Down Syndrome', ne: 'डाउन सिन्ड्रोम' },
  { key: 'vitaminD', en: 'Vitamin D deficiency', ne: 'भिटामिन डी कमी' },
  { key: 'asthma', en: 'Asthma', ne: 'दम (अस्थमा)' },
  { key: 'anemia', en: 'Anemia', ne: 'रक्तअल्पता' },
];
const SEX_OPTIONS = ['male', 'female', 'other'] as const;
const DELIVERY_OPTIONS = ['pen', 'syringe', 'pump'] as const;
// Dual-insulin model per ISPAD basal-bolus standard: basal (long-acting) + bolus (rapid-acting).
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
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [dob, setDob] = useState('');
  const [sex, setSex] = useState<string>('male');
  const [comorbid, setComorbid] = useState<string[]>([]);
  const [comorbidHas, setComorbidHas] = useState<'yes' | 'no'>('no');
  const [comorbidOtherOn, setComorbidOtherOn] = useState(false);
  const [comorbidOther, setComorbidOther] = useState('');
  const [medications, setMedications] = useState('');
  const [basalInsulin, setBasalInsulin] = useState('');
  const [bolusInsulin, setBolusInsulin] = useState('');
  const [insulinDose, setInsulinDose] = useState('');
  const [bolusDose, setBolusDose] = useState('');
  const [insulinFreq, setInsulinFreq] = useState('');
  const [delivery, setDelivery] = useState<string>('pen');
  const [diagnosisDate, setDiagnosisDate] = useState('');
  const [dkaDesc, setDkaDesc] = useState('');
  const [tdd, setTdd] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [insulinError, setInsulinError] = useState<string | null>(null);
  const [tddError, setTddError] = useState<string | null>(null);
  const [ageBand, setAgeBand] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [heightCm, setHeightCm] = useState('');
  const [dobMode, setDobMode] = useState<'date' | 'years'>('date');
  const [ageYears, setAgeYears] = useState('');
  const [diagnosisMode, setDiagnosisMode] = useState<'exact' | 'lt_month' | 'lt_year' | 'gt_year' | 'unknown'>('exact');
  const [weightError, setWeightError] = useState<string | null>(null);
  const [dobAgeError, setDobAgeError] = useState<string | null>(null);

  // ── Auto-calculated dosing (ISPAD rules) ──
  const tddNum = parseFloat(tdd);
  const tddValid = !Number.isNaN(tddNum) && tddNum > 0;
  const autoIsf = tddValid ? Math.round((ISF_CONSTANT / tddNum) * 10) / 10 : null;
  const autoIcr = tddValid ? Math.round((ICR_CONSTANT / tddNum) * 10) / 10 : null;

  // TDD auto = basal (U/day) + bolus (U/dose) × frequency (doses/day). Bolus is entered per dose.
  const recalcTdd = (basal: string, bolus: string, freq: string) => {
    const next = computeTddFromDoses(parseFloat(basal), parseFloat(bolus), freq);
    if (next == null) return; // sliding scale / incomplete → keep the manual value
    setTdd(String(next));
    if (tddError) setTddError(null);
  };

  const toggleComorbid = (c: string) => {
    setComorbid(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]);
  };

  const comorbidList = () => {
    if (comorbidHas !== 'yes') return null;
    const list = [...comorbid, ...(comorbidOtherOn && comorbidOther.trim() ? [comorbidOther.trim()] : [])];
    return list.length > 0 ? list : null;
  };

  // Suggest the age band from date of birth OR age-in-years (owner can still override).
  useEffect(() => {
    if (ageBand) return;
    let years: number | null = null;
    if (dobMode === 'years') {
      const n = parseFloat(ageYears);
      if (Number.isFinite(n) && n >= 0) years = n;
    } else if (dob) {
      const d = new Date(dob);
      if (!Number.isNaN(d.getTime())) years = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
    }
    if (years == null) return;
    if (years >= 6 && years <= 9) setAgeBand('Child (6–9)');
    else if (years >= 10 && years <= 17) setAgeBand('Teen (10–17)');
  }, [dob, dobMode, ageYears, ageBand]);

  const pickPhoto = async () => {
    const next = await pickPatientPhoto(language === 'ne', !!photoUri);
    if (next === undefined) return;
    setPhotoUri(next);
  };

  const handleSave = async () => {
    if (!user) return Alert.alert(t('error'), 'Not logged in');
    let ok = true;
    if (!name.trim()) { setNameError('Name is required'); ok = false; } else setNameError(null);
    const hasBasal = !!basalInsulin && basalInsulin !== 'None';
    const hasBolus = !!bolusInsulin && bolusInsulin !== 'None';
    if (!hasBasal && !hasBolus) { setInsulinError('Select at least one insulin (basal and/or bolus)'); ok = false; } else setInsulinError(null);
    if (!tddValid) { setTddError('Enter a valid Total Daily Dose (TDD)'); ok = false; } else setTddError(null);
    const weightNum = parseFloat(weightKg);
    if (!Number.isFinite(weightNum) || weightNum <= 0 || weightNum > 150) {
      setWeightError(language === 'ne' ? 'तौल आवश्यक छ (के.जी.) — महत्त्वपूर्ण' : 'Weight (kg) is required — this is important');
      ok = false;
    } else setWeightError(null);
    if (dobMode === 'years') {
      const y = parseFloat(ageYears);
      if (!Number.isFinite(y) || y <= 0 || y > 25) {
        setDobAgeError(language === 'ne' ? 'उमेर (वर्ष) लेख्नुहोस्' : 'Enter the age in years');
        ok = false;
      } else setDobAgeError(null);
    }
    if (!ok) return;

    setLoading(true);
    const birthDate = dobMode === 'date' ? (dob || null) : (() => {
      const y = Math.floor(parseFloat(ageYears));
      const year = new Date().getFullYear() - y;
      return `${year}-01-01`;
    })();
    const diagnosisDateValue = diagnosisMode === 'exact' ? (diagnosisDate || null) : null;
    const heightNum = parseFloat(heightCm);
    const patientData = {
      user_id: user.id,
      name: name.trim(),
      date_of_birth: birthDate,
      photo_uri: photoUri || null,
      sex,
      comorbid_conditions: comorbidList(),
      medications: medications.trim() || null,
      insulin_type: [hasBasal ? basalInsulin : null, hasBolus ? bolusInsulin : null].filter(Boolean).join(' + '),
      basal_insulin: hasBasal ? basalInsulin : null,
      bolus_insulin: hasBolus ? bolusInsulin : null,
      insulin_dose: parseFloat(insulinDose) || 0,
      bolus_dose: parseFloat(bolusDose) || null,
      insulin_frequency: insulinFreq || null,
      insulin_delivery: delivery,
      diagnosis_date: diagnosisDateValue,
      dka_history: dkaDesc.trim() ? [{ date: new Date().toISOString(), description: dkaDesc.trim() }] : null,
      age_band: ageBand === 'Child (6–9)' ? 'child' : ageBand === 'Teen (10–17)' ? 'teen' : null,
      weight_kg: weightNum,
      height_cm: Number.isFinite(heightNum) && heightNum > 0 ? heightNum : null,
      dob_precision: dobMode === 'date' ? (dob ? 'exact' : null) : 'approx_years',
      diagnosis_precision: diagnosisMode,
    };

    const { error } = await supabase.from('patients').insert(patientData);
    if (error) {
      console.error('[AddPatient] patient insert error:', error.code, error.message);
      setLoading(false);
      return Alert.alert(t('error'), error.message);
    }

    // Fetch the just-created patient id and create the regimen with auto-calculated values
    const { data: newPatient, error: fetchErr } = await supabase.from('patients')
      .select('id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle();

    if (newPatient) {
      const { error: regErr } = await supabase.from('insulin_regimens').insert({
        patient_id: newPatient.id,
        insulin_type: [hasBasal ? basalInsulin : null, hasBolus ? bolusInsulin : null].filter(Boolean).join(' + '),
        basal_insulin: hasBasal ? basalInsulin : null,
        basal_dose: parseFloat(insulinDose) || null,
        bolus_dose: parseFloat(bolusDose) || null,
        bolus_insulin: hasBolus ? bolusInsulin : null,
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
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, contentCol, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
      <BackBar navigation={navigation} />
      <Text style={styles.section}>{t('profileSetup')}</Text>
      <Text style={styles.label}>{t('childName')} *</Text>
      <TextInput style={[styles.input, nameError && styles.inputError]} value={name} onChangeText={(v) => { setName(v); if (nameError) setNameError(null); }} placeholder="Full name" />
      {nameError ? <Text style={styles.errorText}>{nameError}</Text> : null}

      <View style={styles.photoRow}>
        <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8} accessibilityRole="button" accessibilityLabel={language === 'ne' ? 'बच्चाको फोटो थप्नुहोस्' : "Add child's photo"}>
          <View>
            <ChildAvatar name={name || '?'} sex={sex} size={64} photoUri={photoUri} />
            <View style={styles.photoEditBadge}><Ionicons name="camera" size={12} color="#fff" /></View>
          </View>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{language === 'ne' ? 'बच्चाको फोटो' : "Child's photo"}</Text>
          <Text style={styles.photoHint}>{language === 'ne' ? 'अनुहार देखिने फोटो थप्नुहोस् — प्रोफाइलमा देखिन्छ (वैकल्पिक)' : "Add a photo of your child's face — shown on their profile (optional)"}</Text>
          <TouchableOpacity onPress={pickPhoto} accessibilityRole="button">
            <Text style={styles.photoBtnText}>{photoUri ? (language === 'ne' ? 'फोटो परिवर्तन गर्नुहोस्' : 'Change photo') : (language === 'ne' ? 'फोटो थप्नुहोस्' : 'Add photo')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.label}>{t('dateOfBirth')}</Text>
      <View style={styles.chipRow}>
        {(['date', 'years'] as const).map((m) => (
          <TouchableOpacity key={m} style={[styles.chip, dobMode === m && styles.chipActive]} onPress={() => { setDobMode(m); setDobAgeError(null); }}>
            <Text style={[styles.chipText, dobMode === m && styles.chipTextActive]}>{m === 'date' ? (language === 'ne' ? 'जन्म मिति थाहा छ' : 'I know the birth date') : (language === 'ne' ? 'वर्ष मात्र' : 'Years only')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {dobMode === 'date' ? (
        <View style={{ marginTop: 8 }}>
          <BSDatePicker value={dob} onChange={(ad, bs) => setDob(ad)} />
        </View>
      ) : (
        <>
          <TextInput
            style={[styles.input, dobAgeError && styles.inputError, { marginTop: 8 }]}
            value={ageYears}
            onChangeText={(v) => { setAgeYears(v); if (dobAgeError) setDobAgeError(null); }}
            placeholder={language === 'ne' ? 'उमेर (वर्ष) — जस्तै: 8' : 'Age in years — e.g. 8'}
            keyboardType="numeric"
          />
          {dobAgeError ? <Text style={styles.errorText}>{dobAgeError}</Text> : null}
          <Text style={styles.hintSmall}>{language === 'ne' ? 'जन्म मिति थाहा नभए वर्ष मात्र हाल्नुहोस् — नजिकको जन्म मिति अनुमान गरिन्छ।' : "If the exact date isn't known, just enter the age — we'll estimate the birth date."}</Text>
        </>
      )}

      <Text style={styles.label}>{t('sex')}</Text>
      <View style={styles.chipRow}>
        {SEX_OPTIONS.map(s => (
          <TouchableOpacity key={s} style={[styles.chip, sex === s && styles.chipActive]} onPress={() => setSex(s)}>
            <Text style={[styles.chipText, sex === s && styles.chipTextActive]}>{t(s as any)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.doseRow}>
        <View style={styles.doseCol}>
          <Text style={styles.label}>{language === 'ne' ? 'तौल (के.जी.) *' : 'Weight (kg) *'}</Text>
          <TextInput
            style={[styles.input, weightError && styles.inputError]}
            value={weightKg}
            onChangeText={(v) => { setWeightKg(v); if (weightError) setWeightError(null); }}
            placeholder={language === 'ne' ? 'जस्तै: 25' : 'e.g. 25'}
            keyboardType="numeric"
          />
        </View>
        <View style={styles.doseCol}>
          <Text style={styles.label}>{language === 'ne' ? 'उचाई (से.मी.) — वैकल्पिक' : 'Height (cm) — optional'}</Text>
          <TextInput
            style={styles.input}
            value={heightCm}
            onChangeText={setHeightCm}
            placeholder={language === 'ne' ? 'जस्तै: 120' : 'e.g. 120'}
            keyboardType="numeric"
          />
        </View>
      </View>
      {weightError ? <Text style={styles.errorText}>{weightError}</Text> : null}
      <Text style={styles.hintSmall}>{language === 'ne' ? 'तौल महत्त्वपूर्ण छ (डोज निर्णयका लागि); उचाई वैकल्पिक।' : 'Weight is important (used for clinical decisions); height is optional.'}</Text>

      <Text style={styles.label}>{language === 'ne' ? 'उमेर समूह' : 'Age band'}</Text>
      <View style={styles.chipRow}>
        {['Child (6–9)', 'Teen (10–17)'].map((b) => (
          <TouchableOpacity key={b} style={[styles.chip, ageBand === b && styles.chipActive]} onPress={() => setAgeBand(b)}>
            <Text style={[styles.chipText, ageBand === b && styles.chipTextActive]}>{b}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>{t('diagnosisDate')}</Text>
      <View style={styles.chipRow}>
        {([
          ['exact', language === 'ne' ? 'ठ्याक्कै मिति थाहा छ' : 'Exact date known'],
          ['lt_month', language === 'ne' ? '१ महिना भन्दा कम अघि' : 'Less than a month ago'],
          ['lt_year', language === 'ne' ? '१ वर्ष भन्दा कम अघि' : 'Less than a year ago'],
          ['gt_year', language === 'ne' ? '१ वर्ष भन्दा बढी अघि' : 'More than a year ago'],
          ['unknown', language === 'ne' ? 'थाहा छैन' : "Don't know"],
        ] as const).map(([k, label]) => (
          <TouchableOpacity key={k} style={[styles.chip, diagnosisMode === k && styles.chipActive]} onPress={() => setDiagnosisMode(k)}>
            <Text style={[styles.chipText, diagnosisMode === k && styles.chipTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {diagnosisMode === 'exact' ? (
        <View style={{ marginTop: 8 }}>
          <BSDatePicker value={diagnosisDate} onChange={(ad, bs) => setDiagnosisDate(ad)} />
        </View>
      ) : null}

      <Text style={styles.section}>{t('insulinRegimen')}</Text>

      <Text style={styles.hintSmall}>{language === 'ne' ? 'बच्चाले दैनिक बेसल (लामो) र खाना अघि बोलस (छिटो) — दुवै इन्सुलिन प्रयोग गर्न सक्छन्।' : 'Children on multiple daily injections use both: a daily long-acting (basal) + rapid (bolus) insulin before meals.'}</Text>
      <Dropdown
        label={language === 'ne' ? 'लामो समय (बेसल) इन्सुलिन' : 'Long-acting (basal) insulin'}
        options={BASAL_INSULIN_OPTIONS}
        value={basalInsulin}
        onChange={(v) => { setBasalInsulin(v); if (insulinError) setInsulinError(null); }}
        placeholder="Select basal insulin"
      />
      <Dropdown
        label={language === 'ne' ? 'छिटो काम गर्ने (बोलस) इन्सुलिन' : 'Rapid-acting (bolus) insulin'}
        options={BOLUS_INSULIN_OPTIONS}
        value={bolusInsulin}
        onChange={(v) => { setBolusInsulin(v); if (insulinError) setInsulinError(null); }}
        placeholder="Select bolus insulin"
      />
      {insulinError ? <Text style={styles.errorText}>{insulinError}</Text> : null}

      <View style={styles.doseRow}>
        <View style={styles.doseCol}>
          <Text style={styles.label}>{language === 'ne' ? 'लामो (बेसल) इन्सुलिन डोज — युनिट/दिन' : 'Long-acting (basal) dose (units per day)'}</Text>
          <TextInput style={styles.input} value={insulinDose} onChangeText={(v) => { setInsulinDose(v); recalcTdd(v, bolusDose, insulinFreq); }} placeholder={language === 'ne' ? 'जस्तै: १२' : 'e.g. 12'} keyboardType="numeric" />
        </View>
        <View style={styles.doseCol}>
          <Text style={styles.label}>{language === 'ne' ? 'छिटो (बोलस) इन्सुलिन डोज — प्रति डोज युनिट' : 'Rapid-acting (bolus) dose (units per dose)'}</Text>
          <TextInput style={styles.input} value={bolusDose} onChangeText={(v) => { setBolusDose(v); recalcTdd(insulinDose, v, insulinFreq); }} placeholder={language === 'ne' ? 'जस्तै: ४' : 'e.g. 4'} keyboardType="numeric" />
        </View>
      </View>

      <Dropdown
        label={t('frequency')}
        options={FREQUENCY_OPTIONS}
        value={insulinFreq}
        onChange={(v) => { setInsulinFreq(v); recalcTdd(insulinDose, bolusDose, v); }}
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
        style={[styles.input, tddError && styles.inputError]}
        value={tdd}
        onChangeText={(v) => { setTdd(v); if (tddError) setTddError(null); }}
        placeholder="Total Daily Dose in units"
        keyboardType="numeric"
      />
      {tddError ? <Text style={styles.errorText}>{tddError}</Text> : null}
      <Text style={styles.hintSmall}>{language === 'ne' ? 'स्वतः गणना: बेसल + बोलस × आवृत्ति (प्रति दिन)' : 'Auto-calculated: basal + bolus × frequency (per day)'}</Text>

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
      <Text style={styles.label}>{language === 'ne' ? 'बच्चालाई अन्य कुनै स्वास्थ्य समस्या छ?' : 'Does the child have any other health condition?'}</Text>
      <View style={styles.chipRow}>
        {(['no', 'yes'] as const).map(v => (
          <TouchableOpacity
            key={v}
            style={[styles.chip, comorbidHas === v && styles.chipActiveWarn]}
            onPress={() => { setComorbidHas(v); if (v === 'no') { setComorbid([]); setComorbidOtherOn(false); } }}
          >
            <Text style={[styles.chipText, comorbidHas === v && styles.chipTextWarn]}>{v === 'yes' ? (language === 'ne' ? 'छ' : 'Yes') : (language === 'ne' ? 'छैन' : 'No')}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {comorbidHas === 'yes' ? (
        <>
          <Text style={styles.label}>{language === 'ne' ? 'कुन कुन छन्? (एक वा बढी छान्नुहोस्)' : 'Which ones? (select one or more)'}</Text>
          <View style={styles.chipRow}>
            {COMORBID_OPTIONS.map(c => (
              <TouchableOpacity key={c.key} style={[styles.chip, comorbid.includes(c.key) && styles.chipActiveWarn]} onPress={() => toggleComorbid(c.key)}>
                <Text style={[styles.chipText, comorbid.includes(c.key) && styles.chipTextWarn]}>{language === 'ne' ? c.ne : c.en}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={[styles.chip, comorbidOtherOn && styles.chipActiveWarn]} onPress={() => setComorbidOtherOn(v => !v)}>
              <Text style={[styles.chipText, comorbidOtherOn && styles.chipTextWarn]}>{language === 'ne' ? 'अन्य' : 'Other'}</Text>
            </TouchableOpacity>
          </View>
          {comorbidOtherOn ? (
            <TextInput
              style={styles.input}
              value={comorbidOther}
              onChangeText={setComorbidOther}
              placeholder={language === 'ne' ? 'समस्याको नाम लेख्नुहोस्' : 'Type the condition name'}
              maxLength={80}
            />
          ) : null}
        </>
      ) : null}

      <Text style={styles.label}>{t('currentMedications')}</Text>
      <TextInput style={styles.input} value={medications} onChangeText={setMedications} placeholder="List all current medications" multiline />

      <Text style={styles.label}>{t('dkaHistory')}</Text>
      <TextInput style={[styles.input, styles.multiline]} value={dkaDesc} onChangeText={setDkaDesc} placeholder="Describe any past DKA or severe illness" multiline numberOfLines={3} />

      <GradientButton label={t('save')} onPress={handleSave} loading={loading} style={{ marginTop: 30 }} />

      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16 },
  section: { ...section, color: D2.tealDeep, fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', marginTop: 24, marginBottom: 12 },
  label: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, marginBottom: 6, marginTop: 10 },
  doseRow: { flexDirection: 'row', gap: 12 },
  doseCol: { flex: 1 },
  input: { ...input },
  inputError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginTop: 4 },
  hintSmall: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 10, lineHeight: 17 },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 8 },
  photoEditBadge: { position: 'absolute', bottom: -2, right: -2, width: 22, height: 22, borderRadius: 11, backgroundColor: D2.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  photoHint: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, lineHeight: 17 },
  photoBtnText: { color: D2.tealDeep, fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', marginTop: 2 },
  multiline: { minHeight: 70, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  chipActive: { backgroundColor: D2.teal, borderColor: D2.teal },
  chipActiveWarn: { backgroundColor: T.red, borderColor: T.red },
  chipText: { fontSize: 14, fontFamily: FONT.regular, color: T.muted },
  chipTextActive: { color: '#fff' },
  chipTextWarn: { color: '#fff' },

  // Dropdown
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: T.border },
  dropdownText: { fontSize: 15, fontFamily: FONT.regular, color: T.text },
  dropdownPlaceholder: { fontSize: 15, fontFamily: FONT.regular, color: T.muted },
  dropdownIcon: { fontSize: 16, fontFamily: FONT.regular, color: T.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dropdownModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  dropdownTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.text, textAlign: 'center', marginBottom: 12 },
  dropdownOption: { padding: 14, borderRadius: 8, marginVertical: 2 },
  dropdownOptionActive: { backgroundColor: D2.tealTint },
  dropdownOptionText: { fontSize: 15, fontFamily: FONT.regular, color: T.text },
  dropdownOptionActiveText: { color: D2.tealDeep, fontWeight: '700' },

  // Auto-calculated dosing card
  autoCard: { backgroundColor: D2.tealTint, borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#B8E6DF' },
  autoCardTitle: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: D2.tealDeep, marginBottom: 10 },
  autoRow: { flexDirection: 'row', gap: 12 },
  autoField: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10 },
  autoLabel: { fontSize: 11, fontFamily: FONT.regular, color: T.muted, marginBottom: 4 },
  autoValue: { fontSize: 17, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  autoFormula: { fontSize: 11, fontFamily: FONT.regular, color: D2.teal, marginTop: 3 },
  autoNote: { fontSize: 11, fontFamily: FONT.regular, color: T.muted, marginTop: 10, fontStyle: 'italic' },

  saveBtn: { ...primBtn, marginTop: 30 },
  saveText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },
});
