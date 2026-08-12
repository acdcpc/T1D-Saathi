import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { GlucoseLog, KetoneLog, SickDayEpisode } from '../types';
import { toBSDateTimeDisplay, toBSDisplay } from '../utils/bsDateDisplay';

export default function ClinicianPatientDetailScreen({ route }: any) {
  const { patientId, patientName } = route.params;
  const { t } = useLanguage();
  const [logs, setLogs] = useState<GlucoseLog[]>([]);
  const [ketones, setKetones] = useState<KetoneLog[]>([]);
  const [sickDays, setSickDays] = useState<SickDayEpisode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [gl, kl, sd] = await Promise.all([
        supabase.from('glucose_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('ketone_logs').select('*').eq('patient_id', patientId).order('timestamp', { ascending: false }).limit(20),
        supabase.from('sick_day_episodes').select('*').eq('patient_id', patientId).order('start_date', { ascending: false }).limit(10),
      ]);
      setLogs(gl.data || []);
      setKetones(kl.data || []);
      setSickDays(sd.data || []);
      setLoading(false);
    })();
  }, [patientId]);

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
      <Text style={styles.section}>🩸 {t('logGlucose')} ({logs.length})</Text>
      {logs.slice(0, 10).map(l => (
        <View key={l.id} style={styles.logItem}>
          <Text style={[styles.logValue, { color: getGlucoseColor(l.value) }]}>{l.value} mg/dL</Text>
          <Text style={styles.logTime}>{toBSDateTimeDisplay(l.timestamp)}</Text>
          <Text style={styles.logContext}>{l.context === 'sick_day' ? '🤒 Sick' : '📋 Routine'}</Text>
        </View>
      ))}
      {logs.length === 0 && <Text style={styles.noData}>No glucose logs</Text>}

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

      <Text style={styles.section}>🤒 {t('sickDay')} ({sickDays.length})</Text>
      {sickDays.slice(0, 10).map(s => (
        <View key={s.id} style={[styles.logItem, s.escalated && styles.escalated]}>
          <Text style={styles.logValue}>{toBSDisplay(s.start_date)}</Text>
          <Text style={styles.logContext}>{s.escalated ? '🚨 Escalated' : '⚡ Active'}</Text>
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
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 90, paddingBottom: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: '#202124', marginBottom: 20 },
  section: { fontSize: 18, fontWeight: '700', color: '#202124', marginTop: 16, marginBottom: 10 },
  logItem: { backgroundColor: '#fff', borderRadius: 10, padding: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginBottom: 6 },
  escalated: { borderColor: '#ea4335', borderWidth: 2, backgroundColor: '#fce8e6' },
  logValue: { fontSize: 15, fontWeight: '600' },
  logTime: { fontSize: 12, color: '#5f6368' },
  logContext: { fontSize: 12, color: '#5f6368' },
  logDetail: { fontSize: 11, color: '#5f6368' },
  noData: { fontSize: 14, color: '#80868b', fontStyle: 'italic', marginBottom: 8 },
});
