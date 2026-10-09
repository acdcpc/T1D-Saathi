import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, TextInput } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { GlucoseLog, KetoneLog, SickDayEpisode, InsulinRegimen } from '../types';
import { toBSDateTimeDisplay, toBSDisplay } from '../utils/bsDateDisplay';
import { FONT, T } from '../theme';
import BackBar from '../components/BackBar';
import Dropdown from '../components/Dropdown';

interface InsulinRow { id: string; units: number; insulin_type: string; source: string; timestamp: string; }
interface RegimenRequestRow { id: string; kind: 'review' | 'change'; note?: string | null; status: string; created_at: string; }

// Dual-insulin model per ISPAD basal-bolus standard (mirrors RegimenSettingsScreen).
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

const REGIMEN_SELECT = 'id,patient_id,insulin_type,regimen_type,basal_insulin,basal_dose,bolus_insulin,bolus_dose,tdd,isf,carb_ratio,correction_target,max_bolus,approved_by_clinician,approved_at,effective_date,frequency,delivery_method,dose';

export default function ClinicianPatientDetailScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const isNe = language === 'ne';
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [ketones, setKetones] = useState<KetoneLog[]>([]);
  const [sickDays, setSickDays] = useState<SickDayEpisode[]>([]);
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [insulinRows, setInsulinRows] = useState<InsulinRow[]>([]);
  const [requests, setRequests] = useState<RegimenRequestRow[]>([]);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eType, setEType] = useState<'mdi' | 'pump' | 'premix'>('mdi');
  const [eBasal, setEBasal] = useState('');
  const [eBolus, setEBolus] = useState('');
  const [eBasalDose, setEBasalDose] = useState('');
  const [eBolusDose, setEBolusDose] = useState('');
  const [eFrequency, setEFrequency] = useState('');
  const [eTdd, setETdd] = useState('');
  const [eIsf, setEIsf] = useState('');
  const [eIcr, setEIcr] = useState('');
  const [eTarget, setETarget] = useState('');
  const [eMaxBolus, setEMaxBolus] = useState('');

  useEffect(() => {
    (async () => {
      const [gl, kl, sd] = await Promise.all([
        supabase.from('glucose_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('ketone_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('sick_day_episodes').select('*').eq('patient_id', patientId).order('start_date', { ascending: false }).limit(10),
      ]);

      // Latest regimen (retry without the newest columns when a migration is not applied yet).
      let reg: InsulinRegimen | null = null;
      const full = await supabase
        .from('insulin_regimens')
        .select('id,patient_id,insulin_type,regimen_type,basal_insulin,basal_dose,bolus_insulin,bolus_dose,tdd,isf,carb_ratio,correction_target,max_bolus,approved_by_clinician,approved_at,effective_date')
        .eq('patient_id', patientId)
        .order('effective_date', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (full.error) {
        const basic = await supabase
          .from('insulin_regimens')
          .select('id,patient_id,insulin_type,tdd,isf,carb_ratio,correction_target,approved_by_clinician,approved_at,effective_date')
          .eq('patient_id', patientId)
          .order('effective_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        reg = (basic.data as InsulinRegimen | null);
      } else {
        reg = (full.data as InsulinRegimen | null);
      }

      const ins = await supabase
        .from('insulin_logs')
        .select('id,units,insulin_type,source,timestamp')
        .eq('patient_id', patientId)
        .order('timestamp', { ascending: false })
        .limit(20);

      // Family requests (safe when the regimen_requests migration is not applied yet).
      let reqRows: RegimenRequestRow[] = [];
      try {
        const { data: reqs, error: reqErr } = await supabase
          .from('regimen_requests')
          .select('id,kind,note,status,created_at')
          .eq('patient_id', patientId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(10);
        if (!reqErr && reqs) reqRows = reqs as RegimenRequestRow[];
      } catch { reqRows = []; }

      setLogs(gl.data || []);
      setKetones(kl.data || []);
      setSickDays(sd.data || []);
      setRegimen(reg);
      setInsulinRows(ins.error ? [] : ((ins.data as InsulinRow[]) || []));
      setRequests(reqRows);
      setLoading(false);
    })();
  }, [patientId]);

  const resolvePendingRequests = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from('regimen_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user.id })
        .eq('patient_id', patientId)
        .eq('status', 'pending');
    } catch { /* best effort */ }
    setRequests([]);
  };

  const handleApprove = async () => {
    if (!regimen || !user?.id) return;
    setApproving(true);
    const { error } = await supabase
      .from('insulin_regimens')
      .update({
        approved_by_clinician: true,
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq('id', regimen.id);
    setApproving(false);
    if (error) {
      Alert.alert('Approval failed', error.message);
      return;
    }
    setRegimen({ ...regimen, approved_by_clinician: true });
    await resolvePendingRequests();
    Alert.alert('Regimen approved', 'The regimen is now available to the family for dosing support.');
  };

  const startEdit = () => {
    setEType((regimen?.regimen_type as 'mdi' | 'pump' | 'premix') || 'mdi');
    setEBasal(regimen?.basal_insulin || '');
    setEBolus(regimen?.bolus_insulin || '');
    setEBasalDose(regimen?.basal_dose != null ? String(regimen.basal_dose) : regimen?.dose ? String(regimen.dose) : '');
    setEBolusDose(regimen?.bolus_dose != null ? String(regimen.bolus_dose) : '');
    setEFrequency(regimen?.frequency || '');
    setETdd(regimen?.tdd != null ? String(regimen.tdd) : '');
    setEIsf(regimen?.isf != null ? String(regimen.isf) : '');
    setEIcr(regimen?.carb_ratio != null ? String(regimen.carb_ratio) : '');
    setETarget(regimen?.correction_target != null ? String(regimen.correction_target) : '');
    setEMaxBolus(regimen?.max_bolus != null ? String(regimen.max_bolus) : '');
    setEditing(true);
  };

  const handleSaveRegimen = async () => {
    if (!user?.id) return;
    const hasBasal = !!eBasal && eBasal !== 'None';
    const hasBolus = !!eBolus && eBolus !== 'None';
    const tddValue = parseFloat(eTdd);
    const targetValue = parseFloat(eTarget);
    if ((!hasBasal && !hasBolus) || !Number.isFinite(tddValue) || tddValue <= 0 || !Number.isFinite(targetValue) || targetValue <= 0) {
      Alert.alert(t('error'), isNe ? 'कम्तीमा एक इन्सुलिन, कुल दैनिक डोज र सुधार लक्ष्य आवश्यक छ।' : 'At least one insulin, total daily dose, and correction target are required.');
      return;
    }
    setSaving(true);
    const nowIso = new Date().toISOString();
    const payload = {
      patient_id: patientId,
      regimen_type: eType || 'mdi',
      insulin_type: [hasBasal ? eBasal : null, hasBolus ? eBolus : null].filter(Boolean).join(' + '),
      basal_insulin: hasBasal ? eBasal : null,
      basal_dose: parseFloat(eBasalDose) || null,
      bolus_insulin: hasBolus ? eBolus : null,
      bolus_dose: parseFloat(eBolusDose) || null,
      dose: parseFloat(eBasalDose) || 0,
      frequency: eFrequency || null,
      delivery_method: regimen?.delivery_method || 'pen',
      tdd: tddValue,
      isf: parseFloat(eIsf) || null,
      carb_ratio: parseFloat(eIcr) || null,
      correction_target: targetValue,
      max_bolus: parseFloat(eMaxBolus) || null,
      approved_by_clinician: true,
      approved_at: nowIso,
      approved_by: user.id,
      effective_date: nowIso,
    };
    let saved: InsulinRegimen | null = null;
    if (regimen) {
      const { data, error } = await supabase
        .from('insulin_regimens')
        .update(payload)
        .eq('id', regimen.id)
        .select(REGIMEN_SELECT)
        .single();
      if (error) { setSaving(false); Alert.alert(t('error'), error.message); return; }
      saved = data as InsulinRegimen;
    } else {
      const { data, error } = await supabase
        .from('insulin_regimens')
        .insert(payload)
        .select(REGIMEN_SELECT)
        .single();
      if (error) { setSaving(false); Alert.alert(t('error'), error.message); return; }
      saved = data as InsulinRegimen;
    }
    setSaving(false);
    if (saved) setRegimen(saved);
    await resolvePendingRequests();
    setEditing(false);
    Alert.alert(t('success'), isNe ? 'रेजिमेन अपडेट र अनुमोदित भयो — परिवारले अब डोज सहायता पाउन सक्छ।' : 'Regimen updated & approved — the family can now get dose help.');
  };

  const handleMarkResolved = async (id: string) => {
    try {
      const { error } = await supabase
        .from('regimen_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString(), resolved_by: user?.id })
        .eq('id', id);
      if (error) { Alert.alert(t('error'), error.message); return; }
      setRequests((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      Alert.alert(t('error'), e?.message || 'Could not update request');
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#0D9488" /></View>;

  const getKetoneColor = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '#202124';
    return val >= 3 ? '#ea4335' : '#202124';
  };

  const getGlucoseColor = (val: number) => {
    return val < 70 ? '#ea4335' : '#202124';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <BackBar navigation={navigation} />
      <Text style={styles.title}>{patientName}</Text>

      <View style={styles.guideCard}>
        <Text style={styles.guideTitle}>{isNe ? 'के गर्ने' : 'What to do'}</Text>
        <Text style={styles.guideStep}>{isNe ? '१. तलका पछिल्ला रिडिङहरू हेर्नुहोस्।' : '1. Review the recent readings below.'}</Text>
        <Text style={styles.guideStep}>{isNe ? '२. यो बच्चाको लागि रेजिमेन सम्पादन गरी पुष्टि गर्नुहोस्।' : '2. Edit & confirm the regimen for this child.'}</Text>
        <Text style={styles.guideStep}>{isNe ? '३. सेभ गर्नुहोस् — चिकित्सकको सेभले रेजिमेन अनुमोदित हुन्छ र परिवारको डोज सहायता खुल्छ।' : '3. Save — saving as clinician marks it approved and unlocks the family’s dose help.'}</Text>
        <Text style={styles.guideStep}>{isNe ? '४. परिवारका अनुरोधहरू (भएमा) माथि देखिन्छन्; सेभ गर्दा समाधान हुन्छन्।' : '4. Family requests (if any) appear above; saving resolves them.'}</Text>
      </View>

      {requests.length > 0 && (
        <>
          <Text style={styles.section}>{isNe ? 'परिवारका अनुरोध' : 'Family requests'}</Text>
          {requests.map((r) => (
            <View key={r.id} style={styles.requestCard}>
              <Text style={styles.requestKind}>{r.kind === 'review' ? (isNe ? 'समीक्षा अनुरोध' : 'Review request') : (isNe ? 'रेजिमेन परिवर्तन' : 'Regimen change')}</Text>
              {r.note ? <Text style={styles.requestNote}>{r.note}</Text> : null}
              <Text style={styles.requestTime}>{toBSDateTimeDisplay(r.created_at)}</Text>
              <TouchableOpacity style={styles.resolveBtn} onPress={() => handleMarkResolved(r.id)} accessibilityRole="button">
                <Text style={styles.resolveBtnText}>{isNe ? 'समाधान भयो' : 'Mark resolved'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </>
      )}

      <Text style={styles.section}>Insulin Regimen</Text>
      {editing ? (
        <View style={styles.regimenCard}>
          <Text style={styles.formLabel}>{isNe ? 'रेजिमेन प्रकार' : 'Regimen type'}</Text>
          <View style={styles.chipRow}>
            {([['mdi', 'Basal-bolus (MDI)'], ['pump', 'Pump (CSII)'], ['premix', 'Premixed']] as const).map(([k, label]) => (
              <TouchableOpacity key={k} style={[styles.chip, eType === k && styles.chipActive]} onPress={() => setEType(k)} accessibilityRole="button">
                <Text style={[styles.chipText, eType === k && styles.chipTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Dropdown label={isNe ? 'लामो-कार्य (बेसल) इन्सुलिन' : 'Long-acting (basal) insulin'} options={BASAL_INSULIN_OPTIONS} value={eBasal} onChange={setEBasal} placeholder="Select basal insulin" />
          <Dropdown label={isNe ? 'छिटो-कार्य (बोलस) इन्सुलिन' : 'Rapid-acting (bolus) insulin'} options={BOLUS_INSULIN_OPTIONS} value={eBolus} onChange={setEBolus} placeholder="Select bolus insulin" />
          <Text style={styles.formLabel}>{isNe ? 'बेसल डोज (युनिट/दिन)' : 'Basal dose (units/day)'}</Text>
          <TextInput style={styles.input} value={eBasalDose} onChangeText={setEBasalDose} keyboardType="numeric" />
          <Text style={styles.formLabel}>{isNe ? 'बोलस डोज (युनिट/दिन)' : 'Bolus dose (units/day)'}</Text>
          <TextInput style={styles.input} value={eBolusDose} onChangeText={setEBolusDose} keyboardType="numeric" />
          <Dropdown label={isNe ? 'आवृत्ति' : 'Frequency'} options={FREQUENCY_OPTIONS} value={eFrequency} onChange={setEFrequency} placeholder="Select frequency" />
          <Text style={styles.formLabel}>{isNe ? 'कुल दैनिक डोज (TDD)' : 'Total daily dose (TDD)'}</Text>
          <TextInput style={styles.input} value={eTdd} onChangeText={setETdd} keyboardType="numeric" />
          <Text style={styles.formLabel}>{isNe ? 'ISF अधिलेखन (mg/dL प्रति युनिट) — वैकल्पिक' : 'ISF override (mg/dL per unit) — optional'}</Text>
          <TextInput style={styles.input} value={eIsf} onChangeText={setEIsf} keyboardType="numeric" />
          <Text style={styles.formLabel}>{isNe ? 'I:C अनुपात (g प्रति युनिट) — वैकल्पिक' : 'I:C ratio (g per unit) — optional'}</Text>
          <TextInput style={styles.input} value={eIcr} onChangeText={setEIcr} keyboardType="numeric" />
          <Text style={styles.formLabel}>{isNe ? 'सुधार लक्ष्य (mg/dL)' : 'Correction target (mg/dL)'}</Text>
          <TextInput style={styles.input} value={eTarget} onChangeText={setETarget} keyboardType="numeric" />
          <Text style={styles.formLabel}>{isNe ? 'अधिकतम बोलस (युनिट) — वैकल्पिक' : 'Max bolus (units) — optional'}</Text>
          <TextInput style={styles.input} value={eMaxBolus} onChangeText={setEMaxBolus} keyboardType="numeric" />
          <View style={styles.editBtnRow}>
            <TouchableOpacity style={[styles.saveBtn, saving && styles.saveBtnDisabled]} onPress={handleSaveRegimen} disabled={saving} accessibilityRole="button">
              <Text style={styles.saveBtnText}>{saving ? '…' : (isNe ? 'सेभ गरी अनुमोदन गर्नुहोस्' : 'Save & approve')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditing(false)} disabled={saving} accessibilityRole="button">
              <Text style={styles.cancelBtnText}>{isNe ? 'रद्द' : 'Cancel'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : regimen ? (
        <View style={styles.regimenCard}>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Type</Text><Text style={styles.regimenValue}>{regimen.insulin_type || '—'}</Text></View>
          {regimen.regimen_type ? (<View style={styles.regimenRow}><Text style={styles.regimenLabel}>Regimen</Text><Text style={styles.regimenValue}>{regimen.regimen_type === 'mdi' ? 'Basal-bolus (MDI)' : regimen.regimen_type === 'pump' ? 'Pump (CSII)' : 'Premixed'}</Text></View>) : null}
          {regimen.basal_insulin ? (<View style={styles.regimenRow}><Text style={styles.regimenLabel}>Basal</Text><Text style={styles.regimenValue}>{regimen.basal_insulin}{regimen.basal_dose ? ` · ${regimen.basal_dose} U/day` : ''}</Text></View>) : null}
          {(regimen.bolus_insulin || regimen.bolus_dose) ? (<View style={styles.regimenRow}><Text style={styles.regimenLabel}>Bolus</Text><Text style={styles.regimenValue}>{[regimen.bolus_insulin || null, regimen.bolus_dose ? `${regimen.bolus_dose} U/day` : null].filter(Boolean).join(' · ')}</Text></View>) : null}
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>TDD</Text><Text style={styles.regimenValue}>{regimen.tdd ?? '—'} U</Text></View>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Correction target</Text><Text style={styles.regimenValue}>{regimen.correction_target ?? '—'} mg/dL</Text></View>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Max bolus</Text><Text style={styles.regimenValue}>{regimen.max_bolus ?? '—'} U</Text></View>
          <View style={styles.regimenRow}>
            <Text style={styles.regimenLabel}>Status</Text>
            <Text style={[styles.regimenStatus, regimen.approved_by_clinician ? styles.statusOk : styles.statusPending]}>
              {regimen.approved_by_clinician ? 'Approved' : 'Pending approval'}
            </Text>
          </View>
          <TouchableOpacity style={styles.editToggleBtn} onPress={startEdit} accessibilityRole="button">
            <Text style={styles.editToggleText}>{isNe ? 'रेजिमेन सम्पादन' : 'Edit regimen'}</Text>
          </TouchableOpacity>
          {!regimen.approved_by_clinician && (
            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={approving} accessibilityRole="button">
              <Text style={styles.approveBtnText}>{approving ? '…' : (isNe ? 'डोजका लागि रेजिमेन अनुमोदन गर्नुहोस्' : 'Approve regimen for dosing')}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <>
          <Text style={styles.noData}>No regimen on file</Text>
          <TouchableOpacity style={styles.editToggleBtn} onPress={startEdit} accessibilityRole="button">
            <Text style={styles.editToggleText}>{isNe ? 'रेजिमेन सिर्जना गर्नुहोस्' : 'Create regimen'}</Text>
          </TouchableOpacity>
        </>
      )}

      <Text style={styles.section}>{t('logGlucose')} ({logs.length})</Text>
      {logs.slice(0, 10).map(l => (
        <View key={l.id} style={styles.logItem}>
          <Text style={[styles.logValue, { color: getGlucoseColor(l.value) }]}>{l.value} mg/dL</Text>
          <Text style={styles.logTime}>{toBSDateTimeDisplay(l.timestamp)}</Text>
          <Text style={styles.logContext}>{l.context === 'sick_day' ? 'Sick' : 'Routine'}</Text>
        </View>
      ))}
      {logs.length === 0 && <Text style={styles.noData}>No glucose logs</Text>}

      <Text style={styles.section}>Insulin Doses ({insulinRows.length})</Text>
      {insulinRows.slice(0, 10).map(d => (
        <View key={d.id} style={styles.logItem}>
          <Text style={styles.logValue}>{d.units} U · {d.insulin_type}</Text>
          <Text style={styles.logTime}>{toBSDateTimeDisplay(d.timestamp)}</Text>
          <Text style={styles.logContext}>{d.source === 'food_estimator' ? 'meal' : d.source === 'sick_day' ? 'sick day' : 'manual'}</Text>
        </View>
      ))}
      {insulinRows.length === 0 && <Text style={styles.noData}>No insulin doses logged yet</Text>}

      <Text style={styles.section}>🧪 {t('ketoneCheck')} ({ketones.length})</Text>
      {ketones.slice(0, 10).map(k => (
        <View key={k.id} style={styles.logItem}>
          <Text style={[styles.logValue, { color: getKetoneColor(k.value) }]}>
            {k.value ?? 'N/A'} mmol/L ({k.method})
          </Text>
          <Text style={styles.logTime}>{toBSDateTimeDisplay(k.timestamp)}</Text>
        </View>
      ))}
      {ketones.length === 0 && <Text style={styles.noData}>No ketone logs</Text>}

      <Text style={styles.section}>{t('sickDay')} ({sickDays.length})</Text>
      {sickDays.slice(0, 10).map(s => (
        <View key={s.id} style={[styles.logItem, s.escalated && styles.escalated]}>
          <Text style={styles.logValue}>{toBSDisplay(s.start_date)}</Text>
          <Text style={styles.logContext}>{s.escalated ? 'Escalated' : 'Active'}</Text>
          {s.symptoms && (
            <Text style={styles.logDetail}>
              F:{(s.symptoms as any).fever ? 'Y' : 'N'} V:{(s.symptoms as any).vomiting ? 'Y' : 'N'} D:{(s.symptoms as any).diarrhea ? 'Y' : 'N'}
            </Text>
          )}
        </View>
      ))}
      {sickDays.length === 0 && <Text style={styles.noData}>No sick day episodes</Text>}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingTop: 90, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 20 },
  section: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginTop: 16, marginBottom: 10 },
  guideCard: { backgroundColor: '#E6F7F4', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#B8E6DF', marginBottom: 4 },
  guideTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#0B5E58', marginBottom: 8 },
  guideStep: { fontSize: 13, fontFamily: FONT.regular, color: '#0B5E58', lineHeight: 19, marginBottom: 4 },
  requestCard: { backgroundColor: '#FEF3C7', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#F5D97A', marginBottom: 8 },
  requestKind: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: '#92400E' },
  requestNote: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', marginTop: 4 },
  requestTime: { fontSize: 11, fontFamily: FONT.regular, color: '#80868b', marginTop: 4 },
  resolveBtn: { alignSelf: 'flex-start', marginTop: 8, backgroundColor: '#0D9488', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  resolveBtnText: { color: '#fff', fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600' },
  regimenCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#B8E6DF', marginBottom: 8 },
  regimenRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  regimenLabel: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368' },
  regimenValue: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  regimenStatus: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700' },
  statusOk: { color: '#0D9488' },
  statusPending: { color: '#e37400' },
  approveBtn: { backgroundColor: '#0D9488', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  approveBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  editToggleBtn: { marginTop: 10, borderRadius: 10, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#0D9488' },
  editToggleText: { color: '#0D9488', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  formLabel: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginTop: 12, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  chip: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#e8eaed' },
  chipActive: { backgroundColor: '#0D9488' },
  chipText: { fontSize: 13, fontFamily: FONT.regular, color: '#3c4043' },
  chipTextActive: { color: '#fff' },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14, alignItems: 'center' },
  saveBtn: { flex: 1, backgroundColor: '#0D9488', borderRadius: 10, padding: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  cancelBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: '#dadce0', alignItems: 'center' },
  cancelBtnText: { color: '#5f6368', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  logItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginBottom: 6 },
  escalated: { borderColor: '#ea4335', borderWidth: 2, backgroundColor: '#fce8e6' },
  logValue: { fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
  logTime: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368' },
  logContext: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368' },
  logDetail: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368' },
  noData: { fontSize: 14, fontFamily: FONT.regular, color: '#80868b', fontStyle: 'italic', marginBottom: 8 },
});
