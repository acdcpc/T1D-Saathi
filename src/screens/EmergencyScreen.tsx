import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Hospital, CareTeam } from '../types';

export default function EmergencyScreen({ route }: any) {
  const { patientId } = route.params;
  const { t } = useLanguage();
  const [hospital, setHospital] = useState<Hospital | null>(null);
  const [careTeam, setCareTeam] = useState<CareTeam | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: ct } = await supabase.from('care_team').select('*, hospitals(*)').eq('patient_id', patientId).limit(1).single();
      if (ct) {
        setCareTeam(ct);
        const { data: h } = await supabase.from('hospitals').select('*').eq('id', ct.hospital_id).single();
        setHospital(h);
      }
      setLoading(false);
    })();
  }, [patientId]);

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#ea4335" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 {t('emergency')}</Text>

      {hospital ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('hospitalContact')}</Text>
          <Text style={styles.name}>{hospital.name}</Text>
          <Text style={styles.detail}>{hospital.address}</Text>
          <Text style={styles.detail}>{hospital.region}</Text>
          {hospital.phone ? (
            <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${hospital.phone}`)}>
              <Text style={styles.callText}>📞 Call {hospital.phone}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.noData}>No hospital assigned. Please set up in patient profile.</Text>
        </View>
      )}

      <View style={styles.dkaWarning}>
        <Text style={styles.dkaTitle}>⚠️ DKA Emergency Signs</Text>
        <Text style={styles.dkaItem}>• Excessive thirst and frequent urination</Text>
        <Text style={styles.dkaItem}>• Nausea, vomiting, abdominal pain</Text>
        <Text style={styles.dkaItem}>• Fruity-smelling breath</Text>
        <Text style={styles.dkaItem}>• Deep, rapid breathing (Kussmaul)</Text>
        <Text style={styles.dkaItem}>• Confusion, drowsiness, or loss of consciousness</Text>
        <Text style={styles.dkaAction}>If these signs appear → Go to emergency NOW</Text>
      </View>

      <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF', padding: 20, paddingTop: 60 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: '800', color: '#ea4335', marginBottom: 20 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 18, marginBottom: 16, borderWidth: 1, borderColor: '#e8eaed' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#202124', marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '600', color: '#1a73e8', marginBottom: 4 },
  detail: { fontSize: 14, color: '#5f6368', paddingVertical: 1 },
  noData: { fontSize: 14, color: '#80868b', fontStyle: 'italic' },
  callBtn: { backgroundColor: '#ea4335', borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  callText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  dkaWarning: { backgroundColor: '#fce8e6', borderRadius: 12, padding: 18, marginBottom: 16, borderWidth: 2, borderColor: '#ea4335' },
  dkaTitle: { fontSize: 18, fontWeight: '700', color: '#ea4335', marginBottom: 8 },
  dkaItem: { fontSize: 14, color: '#202124', paddingVertical: 2 },
  dkaAction: { fontSize: 15, fontWeight: '700', color: '#ea4335', marginTop: 10 },
  disclaimer: { textAlign: 'center', color: '#5f6368', fontSize: 11 },
});
