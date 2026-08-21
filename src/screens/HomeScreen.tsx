import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { T, card, section, fab, avatar } from '../theme';
import type { PatientProfile } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('id,user_id,name,date_of_birth,sex,photo_uri,comorbid_conditions,medications,insulin_type,insulin_dose,insulin_frequency,insulin_delivery,diagnosis_date,dka_history,documents,created_at,updated_at')
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
      accessibilityRole="button"
      accessibilityLabel={`Open patient ${item.name}`}
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
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'सेटिङ्स खोल्नुहोस्' : 'Open settings'} style={styles.settingsBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={22} color={T.muted} />
        </TouchableOpacity>
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
          contentContainerStyle={[styles.list, { paddingBottom: 112 + insets.bottom }]}
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
        accessibilityRole="button"
        accessibilityLabel={isNe ? 'बिरामी थप्नुहोस्' : 'Add patient'}
        style={[styles.fab, { bottom: 24 + insets.bottom }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('AddPatient', {})}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Clinician switch */}
      {role === 'clinician' && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isNe ? 'क्लिनिसियन पोर्टल खोल्नुहोस्' : 'Open clinician portal'}
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
  settingsBtn: { padding: 10, minWidth: 44, minHeight: 44, alignItems: 'center' as const, justifyContent: 'center' as const },

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
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 220 },
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
    bottom: 92,
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
