import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { PatientProfile } from '../types';

export default function ClinicianPatientListScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data: careTeams } = await supabase.from('care_team').select('patient_id').eq('clinician_id', user.id);
    if (careTeams?.length) {
      const ids = careTeams.map(ct => ct.patient_id);
      const { data } = await supabase.from('patients').select('*').in('id', ids).order('name');
      setPatients(data || []);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('patientList')}</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await fetchPatients(); setRefreshing(false); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ClinicianPatientDetail', { patientId: item.id, patientName: item.name })}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text></View>
            <View style={styles.cardText}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.meta}>{item.insulin_type} · {item.sex}</Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={!loading ? <Text style={styles.empty}>{t('noPatients')}</Text> : null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  title: { fontSize: 24, fontWeight: '800', color: '#202124', padding: 20, paddingTop: 60 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#1a73e8' },
  cardText: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: '600', color: '#202124' },
  meta: { fontSize: 13, color: '#5f6368', marginTop: 2 },
  chevron: { fontSize: 22, color: '#dadce0' },
  empty: { textAlign: 'center', color: '#5f6368', fontSize: 14, marginTop: 40 },
});
