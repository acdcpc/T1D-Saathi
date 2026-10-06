import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { getQueueLength, getConflictedEntries, retryConflictedEntry, discardConflictedEntry, QueuedEntry } from '../utils/offlineQueue';
import { registerPushToken } from '../utils/pushAlerts';
import { FONT, T } from '../theme';
import Skeleton from '../components/Skeleton';
import ChildAvatar from '../components/ChildAvatar';
import EmptyArt from '../components/EmptyArt';
import GradientButton from '../components/GradientButton';
import { D2 } from '../design/tokens';
import ConflictDialog from '../components/ConflictDialog';
import AnimatedPressable from '../components/AnimatedPressable';
import { usePreferences } from '../context/PreferencesContext';
import { checkAppVersion } from '../utils/versionCheck';
import type { PatientProfile } from '../types';

/** Centered content column — keeps the layout composed on tablet/desktop widths. */
const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

export default function HomeScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { t, language } = useLanguage();
  const { theme: TH, scale } = usePreferences();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
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
      .select('id,user_id,name,date_of_birth,sex,photo_uri,comorbid_conditions,medications,insulin_type,insulin_dose,insulin_frequency,insulin_delivery,diagnosis_date,dka_history,documents,created_at,updated_at,age_band')
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

  // First-run consent gate (never blocks the app on failure)
  useEffect(() => {
    (async () => {
      try {
        if (!user) return;
        const { data } = await supabase.from('consents').select('id').eq('user_id', user.id).limit(1);
        if (!data || data.length === 0) navigation.navigate('Consent', { firstRun: true });
      } catch { /* ignore */ }
    })();
  }, [user, navigation]);

  // Register this device for remote caregiver alerts (silent; only when notifications are already allowed).
  useEffect(() => {
    (async () => {
      try { if (user) await registerPushToken(user.id); } catch { /* ignore */ }
    })();
  }, [user]);

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

  // Sync status pill (single, clear status instead of scattered indicators)
  const syncState = conflictedCount > 0
    ? { icon: 'alert-circle' as const, color: T.red, text: isNe ? `${conflictedCount} समस्या — समीक्षा गर्नुहोस्` : `${conflictedCount} conflict${conflictedCount > 1 ? 's' : ''} — review` }
    : pendingSync > 0
      ? { icon: 'cloud-upload-outline' as const, color: T.orange, text: isNe ? `${pendingSync} पठाउन बाँकी` : `${pendingSync} waiting to sync` }
      : lastSynced
        ? { icon: 'cloud-done-outline' as const, color: T.teal, text: isNe ? `सिंक भयो · ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : `Synced · ${lastSynced.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` }
        : { icon: 'sync-outline' as const, color: T.muted, text: isNe ? 'सिंक हुँदैछ…' : 'Syncing…' };

  const renderPatient = ({ item }: { item: PatientProfile }) => {
    const band = (item as PatientProfile & { age_band?: string | null }).age_band;
    return (
      <AnimatedPressable
        accessibilityRole="button"
        accessibilityLabel={`Open patient ${item.name}`}
        style={styles.patientCard}
        onPress={() => navigation.navigate('PatientTabs', { patient: item })}
      >
          <View style={styles.cardRow}>
        <ChildAvatar name={item.name} sex={item.sex} size={52} />
        <View style={styles.cardInfo}>
          <Text style={styles.patientName}>{item.name}</Text>
          <View style={styles.metaRow}>
            {band ? (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{band === 'teen' ? (isNe ? 'किशोर' : 'Teen') : (isNe ? 'बालबालिका' : 'Child')}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>{item.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')}</Text>
            </View>
          </View>
        </View>
        <View style={styles.chevronCircle}>
          <Ionicons name="chevron-forward" size={16} color={D2.teal} />
        </View>
        </View>
      </AnimatedPressable>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={[styles.headerWrap, contentCol]}>
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.brandRow}>
              <View style={styles.brandDot} />
              <Text style={[styles.headerTitle, { color: TH.text }]}>T1D साथी</Text>
            </View>
            <Text style={styles.headerSubtitle}>{greeting}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isNe ? 'आपतकालीन' : 'Emergency'}
              style={styles.sosBtn}
              onPress={() => navigation.navigate('Emergency')}
              activeOpacity={0.8}
            >
              <Ionicons name="warning" size={15} color={T.red} />
              <Text style={styles.sosText}>{isNe ? 'आपतकाल' : 'SOS'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel={isNe ? 'सेटिङ्स खोल्नुहोस्' : 'Open settings'}
              style={[styles.iconBtn, { width: 40 * scale, height: 40 * scale }]}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.7}
            >
              <Ionicons name="settings-outline" size={19} color={T.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={styles.syncPill}
          onPress={() => (conflictedCount > 0 ? setShowConflict(true) : onRefresh())}
          activeOpacity={0.7}
        >
          <Ionicons name={syncState.icon} size={13} color={syncState.color} />
          <Text style={[styles.syncPillText, { color: syncState.color }]}>{syncState.text}</Text>
        </TouchableOpacity>
      </View>

      {updateRequired && (
        <View style={contentCol}>
          <TouchableOpacity style={styles.updateBanner} onPress={() => navigation.navigate('Settings')}>
            <Ionicons name="cloud-download-outline" size={18} color={T.amberDark} />
            <Text style={styles.updateBannerText}>
              {isNe ? 'एपको नयाँ संस्करण उपलब्ध छ — कृपया अपडेट गर्नुहोस्।' : 'A new version is available — please update.'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={[styles.skeletonWrap, contentCol]}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.skeletonCard}>
              <Skeleton style={{ width: 52, height: 52, borderRadius: 26 }} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton style={{ width: '55%', height: 16 }} />
                <Skeleton style={{ width: '35%', height: 12 }} />
              </View>
            </View>
          ))}
        </View>
      ) : patients.length === 0 ? (
        <FlatList
          data={[]}
          renderItem={null as any}
          contentContainerStyle={[styles.emptyScroll, contentCol]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TH.blue} colors={[TH.blue]} progressBackgroundColor={TH.surface} />}
          ListHeaderComponent={
            <View style={styles.emptyWrap}>
              <View style={{ marginBottom: 22 }}><EmptyArt /></View>

              <Text style={styles.emptyTitle}>{isNe ? 'सुरु गरौं!' : "Let's get started"}</Text>
              <Text style={styles.emptySub}>
                {isNe
                  ? 'आफ्नो बच्चाको प्रोफाइल थप्नुहोस् र ग्लुकोज, खाना तथा इन्सुलिनको ट्र्याकिङ सुरु गर्नुहोस्।'
                  : "Add your child's profile to start tracking glucose, meals and insulin."}
              </Text>

              <GradientButton
                label={isNe ? 'बच्चाको प्रोफाइल थप्नुहोस्' : 'Add your child'}
                icon="add"
                onPress={() => navigation.navigate('AddPatient', {})}
                style={{ alignSelf: 'center', width: '100%', maxWidth: 420, marginTop: 24 }}
              />

              <View style={styles.featureList}>
                {[
                  { icon: 'water-outline', title: isNe ? 'छिटो ग्लुकोज लग' : 'Log glucose in seconds', sub: isNe ? 'mg/dL वा mmol/L — अफलाइन पनि चल्छ' : 'mg/dL or mmol/L — works offline' },
                  { icon: 'camera-outline', title: isNe ? 'फोटोबाट कार्ब गणना' : 'Photo → carb count', sub: isNe ? 'नेपाली खानाको फोटो खिच्नुहोस्' : 'Snap a Nepali meal, get the carbs' },
                  { icon: 'thermometer-outline', title: isNe ? 'बिरामी-दिन सहायक' : 'Sick-day wizard', sub: isNe ? 'ISPAD-आधारित चरणबद्ध मार्गदर्शन' : 'ISPAD-guided steps when your child is unwell' },
                ].map((f, i) => (
                  <View key={i} style={styles.featureRow}>
                    <View style={styles.featureIcon}>
                      <Ionicons name={f.icon as any} size={20} color={D2.teal} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.featureTitle}>{f.title}</Text>
                      <Text style={styles.featureSub}>{f.sub}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          }
        />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id}
          renderItem={renderPatient}
          contentContainerStyle={[styles.list, contentCol, { paddingBottom: 112 + insets.bottom }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TH.blue} colors={[TH.blue]} progressBackgroundColor={TH.surface} />}
          ListHeaderComponent={
            <View style={styles.listHeaderRow}>
              <Text style={styles.sectionLabel}>{isNe ? 'तपाईंका बिरामीहरू' : 'Your patients'}</Text>
              <View style={styles.countPill}>
                <Text style={styles.countPillText}>{patients.length}</Text>
              </View>
            </View>
          }
        />
      )}

      {/* FAB — only once there is a list to extend */}
      {!loading && patients.length > 0 && (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel={isNe ? 'बिरामी थप्नुहोस्' : 'Add patient'}
          style={styles.fab}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('AddPatient', {})}
        >
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
      )}

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

  // ── Header ──
  headerWrap: { paddingHorizontal: 20, paddingTop: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: D2.teal },
  headerTitle: { fontWeight: '800', fontSize: 23, fontFamily: FONT.extrabold },
  headerSubtitle: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 3 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sosBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: '#FDECEA', borderRadius: 999,
    paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: '#F6C7C3',
  },
  sosText: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700', color: T.red, letterSpacing: 0.4 },
  iconBtn: {
    borderRadius: 20, backgroundColor: '#FFFFFF',
    borderWidth: 1, borderColor: T.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center' },

  // ── Sync pill ──
  syncPill: {
    alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#FFFFFF', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: T.border, marginTop: 10,
  },
  syncPillText: { fontSize: 11, fontFamily: FONT.semibold, fontWeight: '600' },

  updateBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.amberLight, borderRadius: 12, marginHorizontal: 16, marginTop: 10, padding: 12, borderWidth: 1, borderColor: T.orange },
  updateBannerText: { flex: 1, fontSize: 13, fontFamily: FONT.semibold, color: T.amberDark, fontWeight: '600' },

  // ── Loading ──
  skeletonWrap: { paddingHorizontal: 16, paddingTop: 18, gap: 10 },
  skeletonCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#FFFFFF', borderRadius: 18, padding: 16,
    borderWidth: 1, borderColor: T.border,
  },

  // ── Empty state ──
  emptyScroll: { flexGrow: 1 },
  emptyWrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28, paddingTop: 28, paddingBottom: 40 },
  heroWrap: { alignItems: 'center', justifyContent: 'center', marginBottom: 22 },
  heroOuter: {
    width: 132, height: 132, borderRadius: 66,
    backgroundColor: '#EAF3FE', alignItems: 'center', justifyContent: 'center',
  },
  heroInner: {
    width: 92, height: 92, borderRadius: 46,
    backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#D7E7FC',
    shadowColor: '#9FB6D4', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  spark: { position: 'absolute', borderRadius: 999 },
  sparkA: { width: 12, height: 12, backgroundColor: '#BEE3F8', top: 6, right: 22 },
  sparkB: { width: 8, height: 8, backgroundColor: '#C8EEE6', bottom: 14, left: 20 },
  sparkC: { width: 7, height: 7, backgroundColor: '#FDE4B8', top: 34, left: 10 },

  emptyTitle: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, textAlign: 'center' },
  emptySub: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, textAlign: 'center', marginTop: 10, lineHeight: 21, maxWidth: 380 },
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D2.teal, borderRadius: 999,
    paddingVertical: 15, paddingHorizontal: 28,
    marginTop: 24,
    shadowColor: D2.teal, shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 5,
  },
  primaryCtaText: { color: '#fff', fontSize: 16, fontFamily: FONT.bold, fontWeight: '700' },

  featureList: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#FFFFFF', borderRadius: 18,
    borderWidth: 1, borderColor: T.border,
    paddingVertical: 6, paddingHorizontal: 16,
    marginTop: 30,
  },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  featureIcon: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: '#EAF3FE', alignItems: 'center', justifyContent: 'center',
  },
  featureTitle: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  featureSub: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 1 },

  // ── Patient list ──
  list: { paddingHorizontal: 16, paddingTop: 4 },
  listHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 6, paddingTop: 12, paddingBottom: 10 },
  sectionLabel: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: T.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  countPill: { backgroundColor: D2.tealTint, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  countPillText: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700', color: D2.tealDeep },

  patientCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 18,
    padding: 16, marginBottom: 10,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#C9B8A6', shadowOpacity: 0.10, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 2,
  },
  cardInfo: { flex: 1, marginLeft: 14 },
  patientName: { fontSize: 17, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  metaRow: { flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' },
  metaChip: { backgroundColor: '#F4EFE8', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 },
  metaChipText: { fontSize: 11, fontFamily: FONT.semibold, fontWeight: '600', color: T.muted },
  chevronCircle: { width: 30, height: 30, borderRadius: 15, backgroundColor: D2.tealTint, alignItems: 'center', justifyContent: 'center' },

  // ── FAB ──
  fab: {
    position: 'absolute', bottom: 28, right: 20,
    width: 58, height: 58, borderRadius: 29,
    backgroundColor: D2.teal,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: D2.teal, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8,
  },

  // ── Clinician bar ──
  clinicianBar: {
    position: 'absolute',
    bottom: 96,
    left: 16,
    right: 16,
    backgroundColor: D2.teal,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  clinicianBarText: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
});
