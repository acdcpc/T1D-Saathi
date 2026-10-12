import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, TextInput, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useStaffView } from '../context/StaffViewContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import BackBar from '../components/BackBar';
import ChildAvatar from '../components/ChildAvatar';
import { Ionicons } from '@expo/vector-icons';
import { D2 } from '../design/tokens';
import type { PatientProfile } from '../types';
import { FONT, T } from '../theme';

export default function ClinicianPatientListScreen({ navigation }: any) {
  const { user, signOut } = useAuth();
  const { t, language } = useLanguage();
  const { setPersonalView } = useStaffView();
  const isNe = language === 'ne';
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);

  /** Compact clinical meta line for a patient row: age · sex · weight (falls back to insulin info). */
  const metaLine = (item: PatientProfile): string => {
    const parts: string[] = [];
    const dob = item?.date_of_birth;
    if (dob) {
      const d = new Date(dob);
      if (!isNaN(d.getTime())) {
        const now = new Date();
        let years = now.getFullYear() - d.getFullYear();
        if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) years--;
        if (years >= 0) {
          const approx = item?.dob_precision === 'approx_years' ? '~' : '';
          if (years < 2) {
            let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
            if (now.getDate() < d.getDate()) months--;
            parts.push(`${approx}${Math.max(0, months)} ${isNe ? 'महिना' : 'mo'}`);
          } else {
            parts.push(`${approx}${years} ${isNe ? 'वर्ष' : 'yrs'}`);
          }
        }
      }
    }
    const sexLbl = item?.sex === 'male' ? t('male') : item?.sex === 'female' ? t('female') : item?.sex === 'other' ? (isNe ? 'अन्य' : 'Other') : null;
    if (sexLbl) parts.push(sexLbl);
    if (item?.weight_kg != null) parts.push(`${item.weight_kg} kg`);
    if (parts.length) return parts.join(' · ');
    return [item?.basal_insulin, item?.bolus_insulin].filter(Boolean).join(' + ') || item?.insulin_type || '—';
  };

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: adminFlag } = await supabase.rpc('is_app_admin', { p_user_id: user.id });
      if (adminFlag === true) {
        const { data } = await supabase.from('patients').select('*').order('name');
        setPatients(data || []);
        setLoading(false);
        return;
      }
    } catch { /* fall back to assignments */ }
    const { data: careTeams } = await supabase.from('care_team').select('patient_id').eq('clinician_id', user.id);
    if (careTeams?.length) {
      const ids = careTeams.map(ct => ct.patient_id);
      const { data } = await supabase.from('patients').select('*').in('id', ids).order('name');
      setPatients(data || []);
    } else {
      setPatients([]);
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

  const handleLogout = () => {
    Alert.alert(
      isNe ? 'लग आउट' : 'Log out',
      isNe ? 'के तपाई निश्चित हुनुहुन्छ?' : 'Are you sure?',
      [
        { text: isNe ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isNe ? 'लग आउट' : 'Log out', style: 'destructive', onPress: () => { void signOut(); } },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}><BackBar navigation={navigation} /></View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('patientList')}</Text>
        <TouchableOpacity style={styles.adminBtn} onPress={() => navigation.navigate('AdminConsole')} accessibilityRole="button">
          <Ionicons name="shield-checkmark-outline" size={14} color={D2.tealDeep} />
          <Text style={styles.adminBtnText}>{isNe ? 'एडमिन कन्सोल' : 'Admin console'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.userSideBtn}
          onPress={() => setPersonalView(true)}
          accessibilityRole="button"
          accessibilityLabel={isNe ? 'प्रयोगकर्ता पक्ष' : 'User side'}
        >
          <Ionicons name="people-outline" size={14} color={D2.tealDeep} />
          <Text style={styles.userSideBtnText}>{isNe ? 'प्रयोगकर्ता पक्ष' : 'User side'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={handleLogout}
          accessibilityRole="button"
          accessibilityLabel={isNe ? 'लग आउट' : 'Log out'}
        >
          <Ionicons name="log-out-outline" size={14} color={T.red} />
          <Text style={styles.logoutBtnText}>{isNe ? 'लग आउट' : 'Log out'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.redeemCard}>
        <Text style={styles.redeemTitle}>Add patient with invite code</Text>
        <View style={styles.redeemRow}>
          <TextInput
            style={styles.redeemInput}
            value={code}
            onChangeText={setCode}
            placeholder="SB-XXXXXX"
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
            <View style={styles.avatarWrap}>
              <ChildAvatar name={item.name} sex={item.sex} size={44} photoUri={item.photo_uri} />
            </View>
            <View style={styles.cardText}>
              <Text style={styles.patientName}>{item.name}</Text>
              <Text style={styles.meta}>{metaLine(item)}</Text>
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
  container: { flex: 1, backgroundColor: T.bg },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 },
  adminBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#0D9488', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  adminBtnText: { fontSize: 12.5, fontFamily: FONT.semibold, fontWeight: '600', color: '#0B5E58' },
  topBar: { paddingHorizontal: 20, paddingTop: 64 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, paddingTop: 6, paddingBottom: 2 },
  userSideBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#0D9488', backgroundColor: '#EFF9F7', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  userSideBtnText: { fontSize: 12.5, fontFamily: FONT.semibold, fontWeight: '600', color: '#0B5E58' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: '#F3C2BA', backgroundColor: '#FDF3F1', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  logoutBtnText: { fontSize: 12.5, fontFamily: FONT.semibold, fontWeight: '600', color: '#B3261E' },
  list: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  avatarWrap: { marginRight: 14 },
  cardText: { flex: 1 },
  patientName: { fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  meta: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', marginTop: 2 },
  chevron: { fontSize: 22, fontFamily: FONT.regular, color: '#dadce0' },
  empty: { textAlign: 'center', color: '#5f6368', fontSize: 14, fontFamily: FONT.regular, marginTop: 40 },
  redeemCard: { marginHorizontal: 16, marginBottom: 6, backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#B8E6DF' },
  redeemTitle: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 8 },
  redeemRow: { flexDirection: 'row', gap: 8 },
  redeemInput: { flex: 1, backgroundColor: '#EFF9F7', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0' },
  redeemBtn: { backgroundColor: '#0D9488', borderRadius: 10, paddingHorizontal: 20, justifyContent: 'center' },
  redeemBtnText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
});
