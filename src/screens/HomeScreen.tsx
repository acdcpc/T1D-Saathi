import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { PatientProfile } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('fetch error:', error);
    else setPatients(data || []);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);
  const onRefresh = async () => { setRefreshing(true); await fetchPatients(); setRefreshing(false); };

  const renderPatient = ({ item }: { item: PatientProfile }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('PatientDashboard', { patient: item })}
    >
      <View style={styles.cardLeft}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.cardCenter}>
        <Text style={styles.patientName}>{item.name}</Text>
        <Text style={styles.patientMeta}>
          {item.sex} · {item.insulin_type}
        </Text>
      </View>
      <View style={styles.cardRight}>
        <Text style={styles.chevron}>›</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.centered}><Text style={styles.loading}>{t('loading')}</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <Text style={styles.title}>{t('appName')}</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
      {patients.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyTitle}>{t('noPatientsYet')}</Text>
          <Text style={styles.emptySub}>{t('addYourFirstPatient')}</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('AddPatient', {})}
          >
            <Text style={styles.addButtonText}>+ {t('addChild')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListFooterComponent={
            <TouchableOpacity
              style={styles.addInlineButton}
              onPress={() => navigation.navigate('AddPatient', {})}
            >
              <Text style={styles.addInlineText}>+ {t('addChild')}</Text>
            </TouchableOpacity>
          }
        />
      )}
      {role === 'clinician' && (
        <TouchableOpacity
          style={styles.clinicianSwitch}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ClinicianPatientList' }] })}
        >
          <Text style={styles.clinicianSwitchText}>{t('clinician')} ›</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 16 },
  title: { fontSize: 28, fontWeight: '800', color: '#1a73e8' },
  settingsIcon: { fontSize: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
  loading: { fontSize: 16, color: '#5f6368' },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#202124', marginBottom: 8, textAlign: 'center' },
  emptySub: { fontSize: 14, color: '#5f6368', marginBottom: 24, textAlign: 'center' },
  addButton: { backgroundColor: '#1a73e8', borderRadius: 12, paddingHorizontal: 32, paddingVertical: 14 },
  addButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  list: { padding: 16, paddingBottom: 100 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  cardLeft: { marginRight: 14 },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#1a73e8' },
  cardCenter: { flex: 1 },
  patientName: { fontSize: 17, fontWeight: '600', color: '#202124' },
  patientMeta: { fontSize: 13, color: '#5f6368', marginTop: 2 },
  cardRight: {},
  chevron: { fontSize: 24, color: '#dadce0' },
  addInlineButton: { alignItems: 'center', paddingVertical: 16 },
  addInlineText: { color: '#1a73e8', fontSize: 16, fontWeight: '600' },
  clinicianSwitch: { position: 'absolute', bottom: 20, left: 20, right: 20, backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  clinicianSwitchText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
