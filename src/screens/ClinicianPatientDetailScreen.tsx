import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import type { GlucoseLog, KetoneLog, SickDayEpisode, InsulinRegimen } from '../types';
import { toBSDateTimeDisplay, toBSDisplay } from '../utils/bsDateDisplay';
import { FONT, T } from '../theme';

interface InsulinRow { id: string; units: number; insulin_type: string; source: string; timestamp: string; }

export default function ClinicianPatientDetailScreen({ route }: any) {
  const { patientId, patientName } = route.params;
  const { t } = useLanguage();
  const { user } = useAuth();
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [ketones, setKetones] = useState<KetoneLog[]>([]);
  const [sickDays, setSickDays] = useState<SickDayEpisode[]>([]);
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [insulinRows, setInsulinRows] = useState<InsulinRow[]>([]);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [gl, kl, sd] = await Promise.all([
        supabase.from('glucose_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('ketone_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('sick_day_episodes').select('*').eq('patient_id', patientId).order('start_date', { ascending: false }).limit(10),
      ]);

      // Latest regimen (retry without max_bolus when the latest migration is not applied yet).
      let reg: InsulinRegimen | null = null;
      const full = await supabase
        .from('insulin_regimens')
        .select('id,patient_id,insulin_type,tdd,isf,carb_ratio,correction_target,max_bolus,approved_by_clinician,approved_at,effective_date')
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

      setLogs(gl.data || []);
      setKetones(kl.data || []);
      setSickDays(sd.data || []);
      setRegimen(reg);
      setInsulinRows(ins.error ? [] : ((ins.data as InsulinRow[]) || []));
      setLoading(false);
    })();
  }, [patientId]);

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
    Alert.alert('Regimen approved', 'The regimen is now available to the family for dosing support.');
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  const getKetoneColor = (val: number | undefined | null) => {
    if (val === undefined || val === null) return '#202124';
    return val >= 3 ? '#ea4335' : '#202124';
  };

  const getGlucoseColor = (val: number) => {
    return val < 70 ? '#ea4335' : '#202124';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{patientName}</Text>

      <Text style={styles.section}>Insulin Regimen</Text>
      {regimen ? (
        <View style={styles.regimenCard}>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Type</Text><Text style={styles.regimenValue}>{regimen.insulin_type || '—'}</Text></View>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>TDD</Text><Text style={styles.regimenValue}>{regimen.tdd ?? '—'} U</Text></View>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Correction target</Text><Text style={styles.regimenValue}>{regimen.correction_target ?? '—'} mg/dL</Text></View>
          <View style={styles.regimenRow}><Text style={styles.regimenLabel}>Max bolus</Text><Text style={styles.regimenValue}>{regimen.max_bolus ?? '—'} U</Text></View>
          <View style={styles.regimenRow}>
            <Text style={styles.regimenLabel}>Status</Text>
            <Text style={[styles.regimenStatus, regimen.approved_by_clinician ? styles.statusOk : styles.statusPending]}>
              {regimen.approved_by_clinician ? 'Approved' : 'Pending approval'}
            </Text>
          </View>
          {!regimen.approved_by_clinician && (
            <TouchableOpacity style={styles.approveBtn} onPress={handleApprove} disabled={approving}>
              <Text style={styles.approveBtnText}>{approving ? '…' : 'Approve regimen for dosing'}</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <Text style={styles.noData}>No regimen on file</Text>
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
  regimenCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d2e3fc', marginBottom: 8 },
  regimenRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  regimenLabel: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368' },
  regimenValue: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  regimenStatus: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700' },
  statusOk: { color: '#0D9488' },
  statusPending: { color: '#e37400' },
  approveBtn: { backgroundColor: '#1a73e8', borderRadius: 10, padding: 12, alignItems: 'center', marginTop: 10 },
  approveBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  logItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginBottom: 6 },
  escalated: { borderColor: '#ea4335', borderWidth: 2, backgroundColor: '#fce8e6' },
  logValue: { fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
  logTime: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368' },
  logContext: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368' },
  logDetail: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368' },
  noData: { fontSize: 14, fontFamily: FONT.regular, color: '#80868b', fontStyle: 'italic', marginBottom: 8 },
});
