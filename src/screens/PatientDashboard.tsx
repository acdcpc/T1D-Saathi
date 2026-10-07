import React, { useState, useEffect, useCallback } from 'react';
import { Alert, View, Text, TouchableOpacity, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { supabase } from '../lib/supabase';
import { HYPO_THRESHOLD } from '../rules/sickDayRules';
import { toBSDateTimeDisplay } from '../utils/bsDateDisplay';
import { computeGlucoseStats, toMgdl } from '../utils/glucoseStats';
import { computeIOB } from '../utils/insulinOnBoard';
import { generateGlucoseReport } from '../utils/pdfReport';
import { exportPatientCsv } from '../utils/csvExport';
import { fetchRecentInsulinDoses } from '../utils/insulinLogs';
import { loadReminderPrefs, getNextReminder } from '../utils/reminders';
import { computeLoggingStreak } from '../utils/streak';
import { isMotivationOptOut } from '../utils/motivation';
import { sendCaregiverAlert } from '../utils/caregiverAlert';
import { glucoseToMgDl } from '../utils/dosingCalc';
import ISPADBadge from '../components/ISPADBadge';
import ChildAvatar from '../components/ChildAvatar';
import { pickPatientPhoto } from '../utils/patientPhoto';
import GlucoseTrendChart from '../components/GlucoseTrendChart';
import TirDonut from '../components/TirDonut';
import AnimatedPressable from '../components/AnimatedPressable';
import { usePreferences } from '../context/PreferencesContext';
import { toDisplayNumber } from '../utils/nepaliNumber';
import GlucoseHero from '../components/GlucoseHero';
import QuickActions from '../components/QuickActions';
import InsightCard, { buildInsight } from '../components/InsightCard';
import { D2, RD, statusForMgdl } from '../design/tokens';
import { useTabBarSpace } from '../design/useTabBarSpace';
import { FONT,  T, card, section, avatar } from '../theme';import type { PatientProfile, GlucoseLog, SickDayEpisode, InsulinLog } from '../types';

/** Centered content column — keeps the layout composed on tablet/desktop widths. */
const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

export default function PatientDashboard({ route, navigation }: any) {
  const patient: PatientProfile = usePatient() || (route.params as any)?.patient;
  const { t, language } = useLanguage();
  const { theme: TH } = usePreferences();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
  const tabSpace = useTabBarSpace();
  const [latestGlucose, setLatestGlucose] = useState<GlucoseLog | null>(null);
  const [history, setHistory] = useState<GlucoseLog[]>([]);
  const [activeSickDay, setActiveSickDay] = useState<SickDayEpisode | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [rangeDays, setRangeDays] = useState<1 | 7 | 30>(30);
  const [insulinLogs, setInsulinLogs] = useState<InsulinLog[]>([]);
  const [nextReminder, setNextReminder] = useState<{ key: 'breakfast' | 'lunch' | 'dinner' | 'bedtime'; hour: number; minute: number } | null>(null);
  const [ageBand, setAgeBand] = useState<string | null>(null);
  const [motivationOptOut, setMotivationOptOut] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(patient?.photo_uri ?? null);

  useEffect(() => { setPhotoUri(patient?.photo_uri ?? null); }, [patient?.id]);

  const fetchData = useCallback(async () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const glucoseFields = 'id,patient_id,user_id,value,unit,context,timestamp,carbs,insulin_given,notes';
    const sickDayFields = 'id,patient_id,user_id,start_date,end_date,symptoms,outcome,escalated';
    const [{ data: latest }, { data: logs }, { data: sickDay }] = await Promise.all([
      supabase.from('glucose_logs').select(glucoseFields).eq('patient_id', patient.id).order('timestamp', { ascending: false }).limit(1),
      supabase.from('glucose_logs').select(glucoseFields).eq('patient_id', patient.id).gte('timestamp', thirtyDaysAgo).order('timestamp', { ascending: true }).limit(500),
      supabase.from('sick_day_episodes').select(sickDayFields).eq('patient_id', patient.id).is('end_date', null).order('start_date', { ascending: false }).limit(1),
    ]);
    setLatestGlucose(latest?.[0] || null);
    setHistory(logs || []);
    setActiveSickDay(sickDay?.[0] || null);
    setInsulinLogs(await fetchRecentInsulinDoses(patient.id, 24 * 30));
  }, [patient.id]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    (async () => {
      const prefs = await loadReminderPrefs();
      setNextReminder(getNextReminder(prefs));
      setMotivationOptOut(await isMotivationOptOut());
      try {
        const { data } = await supabase.from('patients').select('age_band').eq('id', patient.id).maybeSingle();
        setAgeBand((data as { age_band?: string | null } | null)?.age_band ?? null);
      } catch { /* age band is optional */ }
    })();
  }, [patient.id]);
  const onRefresh = async () => { setRefreshing(true); await fetchData(); setRefreshing(false); };

  const handleCsvExport = async () => {
    const res = await exportPatientCsv(patient);
    if (!res.ok && res.message) Alert.alert(isNe ? 'निर्यात' : 'Export', res.message);
  };

  const latestMgDl = latestGlucose
    ? (() => { try { return glucoseToMgDl(latestGlucose.value, latestGlucose.unit); } catch { return null; } })()
    : null;
  const isHypo = latestMgDl !== null && latestMgDl < HYPO_THRESHOLD;
  const rangeMs = rangeDays * 24 * 60 * 60 * 1000;
  const rangedLogs = history.filter((l) => Date.now() - new Date(l.timestamp).getTime() <= rangeMs);
  const stats = computeGlucoseStats(rangedLogs, rangeDays);
  const iob = computeIOB(history, insulinLogs);
  const rangeLabel = rangeDays === 1
    ? (isNe ? 'पछिल्लो २४ घण्टा' : 'Last 24 hours')
    : rangeDays === 7
      ? (isNe ? 'पछिल्लो ७ दिन' : 'Last 7 days')
      : (isNe ? 'पछिल्लो ३० दिन' : 'Last 30 days');
  const reminderLabels: Record<'breakfast' | 'lunch' | 'dinner' | 'bedtime', { en: string; ne: string }> = {
    breakfast: { en: 'Breakfast check', ne: 'बिहानको जाँच' },
    lunch: { en: 'Lunch check', ne: 'दिउँसोको जाँच' },
    dinner: { en: 'Dinner check', ne: 'बेलुकाको जाँच' },
    bedtime: { en: 'Bedtime check', ne: 'रातको जाँच' },
  };

  const streak = computeLoggingStreak(history);
  const isChildMode = ageBand === 'child';
  const changeAgeBand = async (band: 'child' | 'teen') => {
    setAgeBand(band);
    const { error } = await supabase.from('patients').update({ age_band: band }).eq('id', patient.id);
    if (error) Alert.alert(isNe ? 'त्रुटि' : 'Error', error.message);
  };

  const changePhoto = async () => {
    const prev = photoUri;
    const next = await pickPatientPhoto(isNe, !!photoUri);
    if (next === undefined) return;
    setPhotoUri(next);
    try {
      const { error } = await supabase.from('patients').update({ photo_uri: next }).eq('id', patient.id);
      if (error) throw error;
    } catch {
      setPhotoUri(prev);
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'फोटो सुरक्षित गर्न सकिएन — फेरि प्रयास गर्नुहोस्' : 'Could not save the photo. Please try again.');
    }
  };

  const heroStatus = statusForMgdl(latestMgDl);
  const lowCount7d = history.filter((l) => {
    try {
      return toMgdl(l.value, l.unit) < HYPO_THRESHOLD && Date.now() - new Date(l.timestamp).getTime() < 7 * 864e5;
    } catch { return false; }
  }).length;
  const insight = buildInsight(stats, lowCount7d, isNe);
  const actions: { icon: keyof typeof Ionicons.glyphMap; color: string; label: string; route: string; border: string }[] = [
    { icon: 'book-outline', color: D2.teal, label: isNe ? 'शिक्षा' : 'Education', route: 'Learn', border: T.border },
    { icon: 'medkit-outline', color: D2.teal, label: isNe ? 'स्वास्थ्य केन्द्र' : 'Nearby Care', route: 'HealthCenters', border: T.border },
    { icon: 'call-outline', color: T.red, label: isNe ? 'हेल्पलाइन' : 'Helpline', route: 'Helpline', border: T.red },
    { icon: 'chatbubble-ellipses-outline', color: D2.teal, label: isNe ? 'सन्देश' : 'Messages', route: 'Messages', border: T.border },
    { icon: 'warning-outline', color: T.red, label: isNe ? 'आपतकाल' : 'Emergency', route: 'Emergency', border: T.red },
    { icon: 'barcode-outline', color: T.teal, label: isNe ? 'बारकोड' : 'Scan Barcode', route: 'BarcodeScanner', border: T.border },
    { icon: 'people-outline', color: D2.teal, label: isNe ? 'समुदाय' : 'Community', route: 'Community', border: T.border },
    { icon: 'person-add-outline', color: D2.teal, label: isNe ? 'चिकित्सक आमन्त्रण' : 'Invite Clinician', route: 'InviteClinician', border: T.border },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]} edges={['top', 'bottom']}>
      <ScrollView
        contentContainerStyle={[styles.content, contentCol, { paddingBottom: Math.max(tabSpace.contentPaddingBottom, 60 + insets.bottom) + 24 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TH.blue} colors={[TH.blue]} progressBackgroundColor={TH.surface} />}
      >
        {/* Avatar header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isNe ? 'बिरामी सूचीमा फर्कनुहोस्' : 'Back to patients'}
            hitSlop={8}
            style={styles.backCircle}
            onPress={() => {
              const parent = navigation?.getParent?.();
              if (parent?.canGoBack?.()) { parent.goBack(); return; }
              if (navigation?.canGoBack?.()) { navigation.goBack(); return; }
              navigation?.navigate?.('Home');
            }}
          >
            <Ionicons name="chevron-back" size={20} color={D2.tealDeep} />
          </TouchableOpacity>
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isNe ? 'बच्चाको फोटो परिवर्तन गर्नुहोस्' : "Change child's photo"}
            onPress={changePhoto}
            activeOpacity={0.85}
            style={styles.photoWrap}
          >
            <View>
              <ChildAvatar name={patient.name} sex={patient.sex} size={56} photoUri={photoUri} />
              <View style={styles.photoEditBadge}><Ionicons name="camera" size={11} color="#fff" /></View>
            </View>
          </TouchableOpacity>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{patient.name}</Text>
            <Text style={styles.subtitle}>
              {[patient.basal_insulin, patient.bolus_insulin].filter(Boolean).join(' + ') || patient.insulin_type || (isNe ? 'इन्सुलिन' : 'Insulin')} · {patient.sex}
            </Text>
          </View>
        </View>

        {/* Age-band mode (guardian-changeable) */}
        <View style={styles.modeRow}>
          <Text style={styles.modeLabel}>{isNe ? 'मोड:' : 'Mode:'}</Text>
          {([
            { id: 'child' as const, label: isNe ? 'बालबालिका (६–९)' : 'Child (6–9)' },
            { id: 'teen' as const, label: isNe ? 'किशोर (१०–१७)' : 'Teen (10–17)' },
          ]).map((m) => (
            <TouchableOpacity key={m.id} style={[styles.modeChip, ageBand === m.id && styles.modeChipActive]} onPress={() => changeAgeBand(m.id)}>
              <Text style={[styles.modeChipText, ageBand === m.id && styles.modeChipTextActive]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Warm Dawn glucose hero */}
        <GlucoseHero
          valueText={latestGlucose
            ? (latestGlucose.unit === 'mmol' ? String(Math.round(latestGlucose.value * 10) / 10) : String(Math.round(latestGlucose.value)))
            : null}
          unitLabel={latestGlucose?.unit === 'mmol' ? 'mmol/L' : 'mg/dL'}
          status={heroStatus}
          updatedText={latestGlucose ? toBSDateTimeDisplay(latestGlucose.timestamp) : undefined}
          activeInsulinU={iob > 0 ? iob : undefined}
          onPress={() => navigation.navigate('Log', { patientId: patient.id })}
          onLogPress={() => navigation.navigate('Log', { patientId: patient.id })}
        />

        {/* Quick actions */}
        <QuickActions
          actions={[
            { key: 'log', label: 'Log', labelNe: 'लग', icon: 'add', circleBg: D2.tealTint, iconColor: D2.teal, onPress: () => navigation.navigate('Log', { patientId: patient.id }) },
            { key: 'food', label: 'Food', labelNe: 'खाना', icon: 'fast-food', circleBg: D2.coralTint, iconColor: D2.coral, onPress: () => navigation.navigate('Food', { patientId: patient.id }) },
            { key: 'sick', label: 'Sick Day', labelNe: 'बिमारी दिन', icon: 'thermometer', circleBg: D2.marigoldTint, iconColor: D2.marigoldDeep, onPress: () => navigation.navigate('SickDayWizard', { patientId: patient.id }) },
            { key: 'insulin', label: 'Insulin', labelNe: 'इन्सुलिन', icon: 'eyedrop', circleBg: D2.purpleTint, iconColor: D2.purple, onPress: () => navigation.navigate('RegimenSettings', { patientId: patient.id }) },
          ]}
        />

        {/* Hypo alert */}
        {isHypo && (
          <View style={styles.hypoAlert}>
            <Text style={styles.hypoAlertTitle}>{isNe ? 'हाइपोग्लाइसेमिया' : 'Hypoglycemia Alert'}</Text>
            <Text style={styles.hypoStep}>1. {isNe ? '१५ ग्राम चिनी वा ग्लुकोज खानुहोस्' : 'Take 15g fast-acting glucose'}</Text>
            <Text style={styles.hypoStep}>2. {isNe ? '१५ मिनेट पर्खनुहोस्' : 'Wait 15 minutes'}</Text>
            <Text style={styles.hypoStep}>3. {isNe ? 'पुन: जाँच गर्नुहोस्' : 'Recheck glucose'}</Text>
            <Text style={styles.hypoStep}>4. {isNe ? 'आवश्यक परे ९८५१३५०८८३ मा फोन गर्नुहोस्' : 'Call 9851350883 if needed'}</Text>
            <TouchableOpacity
              style={styles.notifyBtn}
              onPress={() => sendCaregiverAlert(
                isNe
                  ? `सानो वीर सूचना: ${patient.name} को ग्लुकोज ${latestGlucose?.value ?? ''} ${latestGlucose?.unit === 'mmol' ? 'mmol/L' : 'mg/dL'} — कम छ। कृपया जाँच गर्नुहोस्।`
                  : `Sano Bir alert: ${patient.name}'s glucose is ${latestGlucose?.value ?? ''} ${latestGlucose?.unit === 'mmol' ? 'mmol/L' : 'mg/dL'} (low). Please check on them.`
              )}
            >
              <Ionicons name="logo-whatsapp" size={16} color="#fff" />
              <Text style={styles.notifyBtnText}>{isNe ? 'WhatsApp मा जानकारी दिनुहोस्' : 'Notify caregiver (WhatsApp)'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Sick day banner */}
        {activeSickDay && (
          <TouchableOpacity style={styles.sickBanner} onPress={() => navigation.navigate('SickDayWizard', { patientId: patient.id })}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="thermometer-outline" size={20} color={T.red} />
              <View>
                <Text style={styles.sickBannerTitle}>{isNe ? 'सक्रिय बिमारी दिन' : 'Active Sick Day'}</Text>
                <Text style={styles.sickBannerSub}>{isNe ? 'निगरानी जारी छ · थिच्नुहोस्' : 'Monitoring in progress · Tap to continue'} ›</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* Next reminder */}
        {nextReminder && (
          <View style={styles.reminderCard}>
            <Ionicons name="alarm-outline" size={18} color={D2.teal} />
            <Text style={styles.reminderText}>
              {isNe ? 'अर्को सम्झना' : 'Next reminder'}: {isNe ? reminderLabels[nextReminder.key].ne : reminderLabels[nextReminder.key].en} · {String(nextReminder.hour).padStart(2, '0')}:{String(nextReminder.minute).padStart(2, '0')}
            </Text>
          </View>
        )}

        {!motivationOptOut && streak >= 2 && (
          <View style={styles.streakCard}>
            <Ionicons name="flame-outline" size={18} color={T.orange} />
            <Text style={styles.streakText}>
              {isNe ? `${streak} दिनको लग शृंखला — शाबास!` : `${streak}-day logging streak — keep it up!`}
            </Text>
          </View>
        )}

        <InsightCard insight={insight} />

        {/* Trends + statistics (range-selectable) */}
        {rangedLogs.length >= 2 && (
          <View style={styles.trendCard}>
            <View style={styles.rangeRow}>
              {([
                { d: 1 as const, en: 'Day', ne: 'दिन' },
                { d: 7 as const, en: 'Week', ne: 'हप्ता' },
                { d: 30 as const, en: 'Month', ne: 'महिना' },
              ]).map((r) => (
                <TouchableOpacity key={r.d} style={[styles.rangeChip, rangeDays === r.d && styles.rangeChipActive]} onPress={() => setRangeDays(r.d)}>
                  <Text style={[styles.rangeChipText, rangeDays === r.d && styles.rangeChipTextActive]}>{isNe ? r.ne : r.en}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.cardLabel}>{rangeLabel}</Text>
            <TirDonut pct={stats.timeInRangePct} gradient={[D2.tealBright, D2.teal, D2.tealDeep]} size={tabSpace.isWide ? 176 : 156} strokeWidth={tabSpace.isWide ? 18 : 14} label={isNe ? 'समय दायरामा (TIR)' : 'Time in Range'} />
            <View style={styles.statRow}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{toDisplayNumber(stats.timeInRangePct, isNe)}%</Text>
                <Text style={styles.statLabel}>{isNe ? 'समय दायरामा (TIR)' : 'Time in Range'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.meanMgdl}</Text>
                <Text style={styles.statLabel}>{isNe ? 'औसत mg/dL' : 'Mean mg/dL'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{stats.eA1c}%</Text>
                <Text style={styles.statLabel}>{isNe ? 'अनुमानित HbA1c' : 'Est. HbA1c'}</Text>
              </View>
            </View>
            {!isChildMode && (<View style={styles.statRow}>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{toDisplayNumber(stats.sdMgdl, isNe)}</Text>
                <Text style={styles.statLabel}>{isNe ? 'मानक विचलन (SD)' : 'SD mg/dL'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{toDisplayNumber(stats.cvPct, isNe)}%</Text>
                <Text style={styles.statLabel}>{isNe ? 'भिन्नता गुणांक (CV)' : 'CV %'}</Text>
              </View>
              <View style={styles.statTile}>
                <Text style={styles.statValue}>{toDisplayNumber(stats.checksPerDay, isNe)}</Text>
                <Text style={styles.statLabel}>{isNe ? 'दैनिक जाँच संख्या' : 'Checks/day'}</Text>
              </View>
            </View>)}
            <GlucoseTrendChart logs={rangedLogs} />
            <Text style={styles.provenance}>
              {isNe ? 'गणना: ISPAD 2022 दिशानिर्देश अनुसार' : 'Calculated per ISPAD 2022 target range (70–180 mg/dL)'}
            </Text>
            {!isChildMode && (
            <Text style={styles.provenance}>
              {isNe ? `जोखिम सूचकांक: LBGI ${stats.lbgi} · HBGI ${stats.hbgi}` : `Risk indices: LBGI ${stats.lbgi} · HBGI ${stats.hbgi}`}
            </Text>
            )}
            <TouchableOpacity style={styles.pdfBtn} onPress={() => generateGlucoseReport(patient, history)} activeOpacity={0.8}>
              <Ionicons name="document-text-outline" size={18} color="#fff" />
              <Text style={styles.pdfBtnText}>{isNe ? 'PDF रिपोर्ट निकाल्नुहोस्' : 'Export PDF Report'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.csvBtn} onPress={handleCsvExport} activeOpacity={0.8}>
              <Ionicons name="download-outline" size={18} color={D2.teal} />
              <Text style={styles.csvBtnText}>{isNe ? 'CSV डाटा निकाल्नुहोस्' : 'Export CSV (records)'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action grid */}
        <Text style={styles.sectionLabel}>{isNe ? 'अन्य' : 'More'}</Text>
        <View style={styles.actionGrid}>
          {actions.map((a, i) => (
            <AnimatedPressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={a.label}
              style={[styles.actionCard, { borderColor: a.border, borderWidth: a.border !== T.border ? 2 : 1 }]}
              onPress={() => navigation.navigate(a.route, { patientId: patient.id })}
              accessibilityState={{ disabled: false }}
            >
              <Ionicons name={a.icon} size={26} color={a.color} style={{ marginBottom: 6 }} />
              <Text style={styles.actionText}>{a.label}</Text>
            </AnimatedPressable>
          ))}
        </View>

        <ISPADBadge />
        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },

  backCircle: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#EDE0D4', alignItems: 'center', justifyContent: 'center' },
  photoWrap: { marginRight: 10 },
  photoEditBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: D2.teal, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  profileHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  profileAv: { ...avatar, width: 56, height: 56, borderRadius: 28, backgroundColor: D2.tealTint },
  profileAvText: { fontSize: 26, fontFamily: FONT.bold, fontWeight: '700', color: D2.teal },
  profileInfo: { flex: 1 },
  name: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  subtitle: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  glucoseCard: { ...card },
  hypoCard: { backgroundColor: T.redLight, borderWidth: 2, borderColor: T.red },
  cardLabel: { ...section, marginTop: 0, marginBottom: 6 },
  glucoseValue: { fontSize: 42, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  unit: { fontSize: 18, fontFamily: FONT.regular, fontWeight: '400', color: T.muted },
  hypoText: { color: T.red },
  timestamp: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 4 },
  iobText: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: T.purple, marginTop: 4 },
  noData: { fontSize: 15, fontFamily: FONT.regular, color: T.muted, fontStyle: 'italic' },

  hypoAlert: { backgroundColor: T.redLight, borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 2, borderColor: T.red },
  hypoAlertTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.redDark, marginBottom: 8 },
  hypoStep: { fontSize: 13, fontFamily: FONT.regular, color: T.text, paddingVertical: 2, paddingLeft: 4, lineHeight: 20 },

  sickBanner: { ...card, borderWidth: 1, borderColor: T.orange },
  sickBannerTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: T.amberDark },
  sickBannerSub: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  trendCard: { ...card },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  statTile: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: T.border },
  statValue: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  statLabel: { fontSize: 10, fontFamily: FONT.semibold, color: T.muted, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  provenance: { fontSize: 10, fontFamily: FONT.regular, color: T.muted, textAlign: 'center', marginTop: 2, fontStyle: 'italic' },
  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: D2.teal, borderRadius: 28, paddingVertical: 12, marginTop: 12,
  },
  pdfBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.bold, fontWeight: '700' },

  sectionLabel: { ...section, paddingHorizontal: 4 },
  actionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  actionCard: {
    width: '31%',
    minHeight: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: T.border,
    shadowColor: T.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 1,
  },
  actionText: { fontSize: 11, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, textAlign: 'center' },
  rangeRow: { flexDirection: 'row', gap: 6, marginBottom: 10, alignSelf: 'flex-start' },
  rangeChip: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: D2.tealTint },
  rangeChipActive: { backgroundColor: D2.teal },
  rangeChipText: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: D2.tealDeep },
  rangeChipTextActive: { color: '#fff' },
  reminderCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
  reminderText: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, flex: 1 },
  csvBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.surface, borderRadius: 28, paddingVertical: 12, marginTop: 10, borderWidth: 1.5, borderColor: D2.teal },
  csvBtnText: { color: D2.tealDeep, fontSize: 15, fontFamily: FONT.bold, fontWeight: '700' },
  modeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' },
  modeLabel: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: T.muted },
  modeChip: { borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  modeChipActive: { backgroundColor: D2.teal, borderColor: D2.teal },
  modeChipText: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  modeChipTextActive: { color: '#fff' },
  streakCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FEF7E0', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#f9ab00', marginBottom: 16 },
  streakText: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#92400E', flex: 1 },
  notifyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#25D366', borderRadius: 10, paddingVertical: 10, marginTop: 10 },
  notifyBtnText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  statusPill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  statusPillText: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700' },
});
