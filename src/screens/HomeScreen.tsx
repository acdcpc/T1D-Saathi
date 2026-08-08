import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getQueueLength, getConflictedEntries } from '../utils/offlineQueue';
import { T, card, section, fab, avatar } from '../theme';
import type { PatientProfile } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [conflictedCount, setConflictedCount] = useState(0);

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

  // Check offline sync queue on mount and periodically
  useEffect(() => {
    const checkQueue = async () => {
      const len = await getQueueLength();
      const conflicted = await getConflictedEntries();
      setPendingSync(len);
      setConflictedCount(conflicted.length);
    };
    checkQueue();
    const timer = setInterval(checkQueue, 30000); // check every 30s
    return () => clearInterval(timer);
  }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchPatients(); setRefreshing(false); };

  const renderPatient = ({ item }: { item: PatientProfile }) => (
    <TouchableOpacity
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientDashboard', { patient: item })}
      activeOpacity={0.7}
    >
      <View style={styles.cardContent}>
        <View style={styles.avBox}>
          <View style={styles.av}>
            <Text style={styles.avText}>{item.name[0]?.toUpperCase()}</Text>
          </View>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>{item.name}</Text>
          <Text style={styles.patientMeta}>
            {item.sex} · {item.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={T.muted} />
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Header — Kapoori Ka pattern */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>T1D साथी</Text>
          <Text style={styles.headerSubtitle}>T1D Saathi</Text>
        </View>
        <View style={styles.headerRight}>
          {(pendingSync > 0 || conflictedCount > 0) && (
            <TouchableOpacity style={styles.syncBadge} onPress={() => {}}>
              <Ionicons name={conflictedCount > 0 ? "warning-outline" : "cloud-upload-outline"} size={16} color={conflictedCount > 0 ? T.red : T.orange} />
              <Text style={[styles.syncBadgeText, { color: conflictedCount > 0 ? T.red : T.orange }]}>
                {conflictedCount > 0 ? `${conflictedCount}⚠` : pendingSync}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={T.muted} />
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={T.blue} style={styles.loader} />
      ) : patients.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>💙</Text>
          <Text style={styles.emptyTitle}>{isNe ? 'कुनै बिरामी छैन' : t('noPatientsYet')}</Text>
          <Text style={styles.emptyHint}>
            {isNe
              ? 'तलको ⊕ बटन थिचेर आफ्नो बच्चाको प्रोफाइल बनाउनुहोस्।'
              : 'Tap the ⊕ button below to add your child\'s profile.'}
          </Text>
          <View style={styles.fabPointer}>
            <Text style={styles.fabPointerText}>{isNe ? 'यहाँ थिच्नुहोस्' : 'Tap here to add'}</Text>
            <Text style={styles.fabPointerArrow}>↓</Text>
          </View>
          <View style={styles.featurePreview}>
            {[
              { icon: '📊', label: isNe ? 'ग्लुकोज लग' : 'Glucose Log' },
              { icon: '📸', label: isNe ? 'खाना फोटो' : 'Food Photo' },
              { icon: '🏥', label: isNe ? 'स्वास्थ्य केन्द्र' : 'Health Centers' },
              { icon: '📚', label: isNe ? 'शिक्षा' : 'Education' },
            ].map((f, i) => (
              <View key={i} style={styles.featureChip}>
                <Text style={styles.featureChipIcon}>{f.icon}</Text>
                <Text style={styles.featureChipLabel}>{f.label}</Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={T.blue} />}
          ListHeaderComponent={
            <Text style={styles.sectionLabel}>
              {isNe ? 'तपाईंको बिरामीहरू' : 'Your Patients'}
            </Text>
          }
        />
      )}

      {/* FAB — Kapoori Ka pattern */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddPatient', {})}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Clinician switch */}
      {role === 'clinician' && (
        <TouchableOpacity
          style={styles.clinicianBar}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'ClinicianPatientList' }] })}
        >
          <Ionicons name="people-outline" size={18} color="#fff" />
          <Text style={styles.clinicianBarText}>{isNe ? 'क्लिनिसियन पोर्टल' : 'Clinician Portal'} ›</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 6,
  },
  headerLeft: { flex: 1 },
  headerTitle: { fontWeight: '800', fontSize: 22, color: T.text },
  headerSubtitle: { fontSize: 13, color: T.muted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsBtn: { padding: 4 },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.surface, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: T.border,
  },
  syncBadgeText: { fontSize: 12, fontWeight: '700' },

  loader: { flex: 1 },

  // Section label (Kapoori Ka pattern)
  sectionLabel: { ...section, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },

  // Patient list
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  patientCard: { ...card },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avBox: { marginRight: 14 },
  av: { ...avatar, backgroundColor: T.blueLight },
  avText: { fontSize: 22, fontWeight: '700', color: T.blue },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 16, fontWeight: '700', color: T.text },
  patientMeta: { fontSize: 13, color: T.muted, marginTop: 2 },

  // Empty state (Kapoori Ka pattern)
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 180 },
  emptyIcon: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: T.text, textAlign: 'center' },
  emptyHint: { fontSize: 13, color: T.blue, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  fabPointer: {
    backgroundColor: T.blueLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  fabPointerText: { fontWeight: '700', fontSize: 13, color: T.blue, textAlign: 'center' },
  fabPointerArrow: { fontSize: 20, color: T.blue, textAlign: 'center', marginTop: 2 },
  featurePreview: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 24, gap: 10 },
  featureChip: {
    alignItems: 'center',
    backgroundColor: T.surface,
    borderRadius: 12,
    padding: 12,
    width: 80,
    borderWidth: 1,
    borderColor: T.border,
  },
  featureChipIcon: { fontSize: 24, marginBottom: 4 },
  featureChipLabel: { fontSize: 11, color: T.muted, fontWeight: '600', textAlign: 'center' },

  // FAB
  fab: { ...fab },

  // Clinician bar
  clinicianBar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    backgroundColor: T.blue,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clinicianBarText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
