import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { PatientProfile } from '../types';
import { FONT } from '../theme';

export default function ClinicianPatientListScreen({ navigation }: any) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

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

  const redeemInvite = async () => {
    if (!code.trim() || redeeming) return;
    setRedeeming(true);
    const { error } = await supabase.rpc('redeem_care_team_invite', { p_code: code.trim() });
    setRedeeming(false);
    if (error) {
      Alert.alert('Could not add patient', error.message);
      return;
    }
    setCode('');
    Alert.alert('Patient linked', 'The patient is now in your list.');
    fetchPatients();
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('patientList')}</Text>
      <View style={styles.redeemCard}>
        <Text style={styles.redeemTitle}>Add patient with invite code</Text>
        <View style={styles.redeemRow}>
          <TextInput
            style={styles.redeemInput}
            value={code}
            onChangeText={setCode}
            placeholder="T1D-XXXXXX"
            autoCapitalize="characters"
          />
          <TouchableOpacity style={styles.redeemBtn} onPress={redeemInvite} disabled={redeeming}>
            <Text style={styles.redeemBtnText}>{redeeming ? '…' : 'Add'}</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', padding: 20, paddingTop: 90 },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#e8f0fe', justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  avatarText: { fontSize: 20, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8' },
  cardText: { flex: 1 },
  patientName: { fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  meta: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', marginTop: 2 },
  chevron: { fontSize: 22, fontFamily: FONT.regular, color: '#dadce0' },
  empty: { textAlign: 'center', color: '#5f6368', fontSize: 14, fontFamily: FONT.regular, marginTop: 40 },
  redeemCard: { marginHorizontal: 16, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#d2e3fc' },
  redeemTitle: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 8 },
  redeemRow: { flexDirection: 'row', gap: 8 },
  redeemInput: { flex: 1, backgroundColor: '#F0F7FF', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  redeemBtn: { backgroundColor: '#1a73e8', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  redeemBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
});
