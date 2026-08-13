import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getQueueLength, getConflictedEntries, retryConflictedEntry, discardConflictedEntry, QueuedEntry } from '../utils/offlineQueue';
import { FONT, T, card, section, fab, avatar } from '../theme';
import Skeleton from '../components/Skeleton';
import ChildAvatar from '../components/ChildAvatar';
import DhakaDivider from '../components/DhakaDivider';
import ConflictDialog from '../components/ConflictDialog';
import AnimatedPressable from '../components/AnimatedPressable';
import { usePreferences } from '../context/PreferencesContext';
import { checkAppVersion } from '../utils/versionCheck';
import type { PatientProfile } from '../types';

export default function HomeScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const { theme: TH, scale } = usePreferences();
  const isNe = language === 'ne';
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingSync, setPendingSync] = useState(0);
  const [conflictedCount, setConflictedCount] = useState(0);
  const [conflictedEntries, setConflictedEntries] = useState<QueuedEntry[]>([]);
  const [showConflict, setShowConflict] = useState(false);
  const [updateRequired, setUpdateRequired] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);

  const fetchPatients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('patients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) console.error('fetch error:', error);
    else { setPatients(data || []); setLastSynced(new Date()); }
    setLoading(false);
  }, [user]);

  useFocusEffect(useCallback(() => { fetchPatients(); }, [fetchPatients]));

  // App version check (force-update gate)
  useEffect(() => {
    (async () => {
      const status = await checkAppVersion();
      setUpdateRequired(!!status?.updateRequired);
    })();
  }, []);

  // Check offline sync queue on mount and periodically
  useEffect(() => {
    const checkQueue = async () => {
      const len = await getQueueLength();
      const conflicted = await getConflictedEntries();
      setPendingSync(len);
      setConflictedCount(conflicted.length);
      setConflictedEntries(conflicted);
    };
    checkQueue();
    const timer = setInterval(checkQueue, 30000); // check every 30s
    return () => clearInterval(timer);
  }, []);
  const onRefresh = async () => { setRefreshing(true); await fetchPatients(); setRefreshing(false); };

  const handleRetryConflict = async (id: string) => {
    await retryConflictedEntry(id);
    const conflicted = await getConflictedEntries();
    setConflictedEntries(conflicted);
    setConflictedCount(conflicted.length);
  };

  const handleDiscardConflict = async (id: string) => {
    await discardConflictedEntry(id);
    const conflicted = await getConflictedEntries();
    setConflictedEntries(conflicted);
    setConflictedCount(conflicted.length);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12
    ? (isNe ? 'शुभ प्रभात' : 'Good morning')
    : hour < 17
      ? (isNe ? 'शुभ दिन' : 'Good afternoon')
      : (isNe ? 'शुभ साँझ' : 'Good evening');

  const renderPatient = ({ item }: { item: PatientProfile }) => (
    <AnimatedPressable
      style={styles.patientCard}
      onPress={() => navigation.navigate('PatientTabs', { patient: item })}
    >
      <View style={styles.cardContent}>
        <ChildAvatar name={item.name} sex={item.sex} />
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>{item.name}</Text>
          <Text style={styles.patientMeta}>
            {item.sex} · {item.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={T.muted} />
      </View>
    </AnimatedPressable>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]} edges={['top', 'bottom']}>
      {/* Header — Kapoori Ka pattern */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, { color: TH.text }]}>T1D साथी</Text>
          <Text style={styles.headerSubtitle}>
            {greeting} · T1D Saathi
          </Text>
        </View>
        <View style={styles.headerRight}>
          {(pendingSync > 0 || conflictedCount > 0) && (
            <TouchableOpacity style={styles.syncBadge} onPress={() => setShowConflict(true)}>
              <Ionicons name={conflictedCount > 0 ? "warning-outline" : "cloud-upload-outline"} size={16} color={conflictedCount > 0 ? T.red : T.orange} />
              <Text style={[styles.syncBadgeText, { color: conflictedCount > 0 ? T.red : T.orange }]}>
                {conflictedCount > 0 ? `${conflictedCount}⚠` : pendingSync}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.emergencyBtn, { padding: 8 * scale }]} onPress={() => navigation.navigate('Emergency')}>
            <Ionicons name="warning" size={22} color={T.red} />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.settingsBtn, { padding: 8 * scale }]} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="settings-outline" size={22} color={T.muted} />
          </TouchableOpacity>
        </View>
      </View>

      <DhakaDivider />

      {updateRequired && (
        <TouchableOpacity style={styles.updateBanner} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="cloud-download-outline" size={18} color={T.amberDark} />
          <Text style={styles.updateBannerText}>
            {isNe ? 'एपको नयाँ संस्करण उपलब्ध छ — कृपया अपडेट गर्नुहोस्।' : 'A new app version is available — please update.'}
          </Text>
        </TouchableOpacity>
      )}

      <Text style={styles.lastSync}>
        {lastSynced
          ? (isNe ? 'अन्तिम सिंक: ' : 'Last synced: ') + lastSynced.toLocaleTimeString()
          : (isNe ? 'सिंक हुँदै…' : 'Syncing…')}
      </Text>

      {loading ? (
        <View style={styles.skeletonWrap}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton style={{ width: 44, height: 44, borderRadius: 22 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton style={{ width: '60%', height: 16 }} />
                <Skeleton style={{ width: '40%', height: 12 }} />
              </View>
            </View>
          ))}
        </View>
      ) : patients.length === 0 ? (
        <View style={styles.emptyState}>
          <View style={styles.emptyIconCircle}><Ionicons name="water" size={40} color={T.blue} /></View>
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
              { icon: 'water-outline', label: isNe ? 'ग्लुकोज लग' : 'Glucose Log' },
              { icon: 'camera-outline', label: isNe ? 'खाना फोटो' : 'Food Photo' },
              { icon: 'medkit-outline', label: isNe ? 'स्वास्थ्य केन्द्र' : 'Health Centers' },
              { icon: 'book-outline', label: isNe ? 'शिक्षा' : 'Education' },
            ].map((f, i) => (
              <View key={i} style={styles.featureChip}>
                <Ionicons name={f.icon as any} size={24} color={T.blue} style={{ marginBottom: 4 }} />
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TH.blue} colors={[TH.blue]} progressBackgroundColor={TH.surface} />}
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

      <ConflictDialog
        visible={showConflict}
        entries={conflictedEntries}
        isNe={isNe}
        onRetry={handleRetryConflict}
        onDiscard={handleDiscardConflict}
        onClose={() => setShowConflict(false)}
      />
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
  headerTitle: { fontWeight: '800', fontSize: 22, fontFamily: FONT.extrabold, color: T.text },
  headerSubtitle: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  settingsBtn: { padding: 4 },
  emergencyBtn: { padding: 4 },
  syncBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: T.surface, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 4,
    borderWidth: 1, borderColor: T.border,
  },
  syncBadgeText: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700' },
  updateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.amberLight, borderRadius: 12, marginHorizontal: 16, marginTop: 8, padding: 12, borderWidth: 1, borderColor: T.orange },
  updateBannerText: { flex: 1, fontSize: 13, fontFamily: FONT.semibold, color: T.amberDark, fontWeight: '600' },
  lastSync: { fontSize: 11, fontFamily: FONT.regular, color: T.muted, paddingHorizontal: 20, marginTop: 2, fontStyle: 'italic' },

  loader: { flex: 1 },
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  skeletonCard: { ...card, flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 0 },

  // Section label (Kapoori Ka pattern)
  sectionLabel: { ...section, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },

  // Patient list
  list: { paddingHorizontal: 12, paddingBottom: 100 },
  patientCard: { ...card },
  cardContent: { flexDirection: 'row', alignItems: 'center' },
  avBox: { marginRight: 14 },
  av: { ...avatar, backgroundColor: T.blueLight },
  avText: { fontSize: 22, fontFamily: FONT.bold, fontWeight: '700', color: T.blue },
  cardInfo: { flex: 1 },
  patientName: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  patientMeta: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  // Empty state (Kapoori Ka pattern)
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingBottom: 180 },
  emptyIconCircle: { width: 88, height: 88, borderRadius: 44, backgroundColor: T.blueLight, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  emptyTitle: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: T.text, textAlign: 'center' },
  emptyHint: { fontSize: 13, fontFamily: FONT.regular, color: T.blue, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },
  fabPointer: {
    backgroundColor: T.blueLight,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 20,
  },
  fabPointerText: { fontWeight: '700', fontSize: 13, fontFamily: FONT.bold, color: T.blue, textAlign: 'center' },
  fabPointerArrow: { fontSize: 20, fontFamily: FONT.regular, color: T.blue, textAlign: 'center', marginTop: 2 },
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
  featureChipLabel: { fontSize: 11, fontFamily: FONT.semibold, color: T.muted, fontWeight: '600', textAlign: 'center' },

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
  clinicianBarText: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
});
