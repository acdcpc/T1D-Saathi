import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackBar from '../components/BackBar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FONT, T } from '../theme';
import { D2 } from '../design/tokens';

const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

type StaffAccount = { user_id: string; email: string; full_name: string | null; role: string | null; full_access: boolean };

/** Staff console (early preview): quick overview + links. Full tooling lives in the web portal. */
export default function AdminConsoleScreen({ navigation }: any) {
  const { user, role } = useAuth();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
  const isStaff = role === 'clinician';

  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>([]);
  const [stats, setStats] = useState<{ patients: number | null; logs24h: number | null; careTeam: number | null }>({ patients: null, logs24h: null, careTeam: null });

  const load = useCallback(async () => {
    if (!user?.id) { setIsAdmin(false); setLoading(false); return; }
    // Admin flag first — lets non-clinician admin emails into the console.
    let admin = false;
    try {
      const { data } = await supabase.rpc('is_app_admin', { p_user_id: user.id });
      admin = data === true;
    } catch { /* optional check */ }
    setIsAdmin(admin);
    if (!isStaff && !admin) { setLoading(false); return; }
    try {
      const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
      const [p, g, c] = await Promise.all([
        supabase.from('patients').select('id', { count: 'exact', head: true }),
        supabase.from('glucose_logs').select('id', { count: 'exact', head: true }).gte('timestamp', dayAgo),
        supabase.from('care_team').select('patient_id', { count: 'exact', head: true }),
      ]);
      setStats({ patients: p.count ?? null, logs24h: g.count ?? null, careTeam: c.count ?? null });
    } catch { /* counts best-effort under RLS */ }
    try {
      // Staff directory — admin-gated RPC (SECURITY DEFINER); hidden if blocked or empty.
      const { data, error } = await supabase.rpc('admin_list_staff');
      if (!error && Array.isArray(data)) setStaffAccounts(data as StaffAccount[]);
    } catch { /* optional */ }
    setLoading(false);
  }, [user?.id, isStaff]);

  useEffect(() => { load(); }, [load]);

  const allowed = isStaff || isAdmin === true;

  if (isAdmin === null && !isStaff) {
    // Waiting on the admin check before deciding access.
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.col, contentCol]}>
          <BackBar navigation={navigation} />
          <ActivityIndicator color={D2.teal} style={{ marginTop: 24 }} />
        </View>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 16 }]}>
        <View style={[styles.col, contentCol]}>
          <BackBar navigation={navigation} />
          <View style={styles.deniedCard}>
            <Ionicons name="lock-closed-outline" size={26} color={T.muted} />
            <Text style={styles.deniedTitle}>{isNe ? 'पहुँच सीमित छ' : 'Access restricted'}</Text>
            <Text style={styles.deniedText}>
              {isNe ? 'यो कन्सोल क्लिनिसियन, स्टाफ र एप एडमिन खाताहरूको लागि हो।' : 'This console is for clinician, staff and app-admin accounts only.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const stat = (label: string, value: number | null, icon: keyof typeof Ionicons.glyphMap) => (
    <View style={styles.statTile}>
      <Ionicons name={icon} size={16} color={D2.teal} />
      <Text style={styles.statValue}>{value === null ? '—' : value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.col, contentCol, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 48) + 24 }]}>
      <BackBar navigation={navigation} />
      <View style={styles.titleRow}>
        <Text style={styles.title}>{isNe ? 'एडमिन कन्सोल' : 'Admin console'}</Text>
        {isAdmin === true && (
          <View style={styles.adminTag}><Text style={styles.adminTagText}>{isNe ? 'एप एडमिन' : 'App admin'}</Text></View>
        )}
      </View>
      <Text style={styles.subtitle}>{isNe ? 'स्टाफ अवलोकन — प्रारम्भिक संस्करण' : 'Staff overview — early preview'}</Text>

      {loading ? <ActivityIndicator color={D2.teal} style={{ marginTop: 24 }} /> : (
        <>
          <View style={styles.statsRow}>
            {stat(isNe ? 'बिरामी' : 'Patients', stats.patients, 'people-outline')}
            {stat(isNe ? 'ग्लुकोज लग (२४घ)' : 'Glucose logs (24h)', stats.logs24h, 'water-outline')}
            {stat(isNe ? 'केयर टिम' : 'Care team', stats.careTeam, 'medkit-outline')}
          </View>

          <View style={styles.card}>
            <View style={styles.row}><Text style={styles.rowLabel}>{isNe ? 'लग इन' : 'Signed in as'}</Text><Text style={styles.rowValue} numberOfLines={1}>{user?.email || '—'}</Text></View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{isNe ? 'भूमिका' : 'Role'}</Text>
              <Text style={styles.rowValue}>
                {isAdmin
                  ? (isStaff ? (isNe ? 'क्लिनिसियन + एप एडमिन' : 'Clinician + app admin') : (isNe ? 'एप एडमिन' : 'App admin'))
                  : (isNe ? 'क्लिनिसियन' : 'Clinician')}
              </Text>
            </View>
          </View>

          {staffAccounts.length > 0 && (
            <View style={styles.card}>
              <View style={styles.cardTitleRow}>
                <Text style={styles.cardTitle}>{isNe ? 'स्टाफ खाताहरू' : 'Staff accounts'}</Text>
                <View style={styles.countPill}><Text style={styles.countPillText}>{staffAccounts.length}</Text></View>
              </View>
              {staffAccounts.map((s) => (
                <View key={s.email} style={styles.staffRow}>
                  <Ionicons name="person-circle-outline" size={18} color={D2.teal} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.staffEmail} numberOfLines={1}>{s.email}</Text>
                    <Text style={styles.staffNote} numberOfLines={1}>
                      {[s.full_name || null, s.role === 'clinician' ? (isNe ? 'क्लिनिसियन' : 'Clinician') : s.role || null].filter(Boolean).join(' · ') || (isNe ? 'स्टाफ खाता' : 'Staff account')}
                    </Text>
                  </View>
                  {s.full_access ? (
                    <View style={styles.accessPill}><Text style={styles.accessPillText}>{isNe ? 'पूर्ण पहुँच' : 'Full access'}</Text></View>
                  ) : null}
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity style={styles.actionRow} onPress={() => navigation.navigate('ClinicianPatientList')} accessibilityRole="button">
            <Ionicons name="medkit-outline" size={18} color={D2.tealDeep} />
            <Text style={styles.actionText}>{isNe ? 'क्लिनिसियन क्षेत्र खोल्नुहोस्' : 'Open clinician area'}</Text>
            <Ionicons name="chevron-forward" size={16} color={D2.faint} />
          </TouchableOpacity>

          <View style={styles.noteCard}>
            <Ionicons name="information-circle-outline" size={16} color={T.muted} />
            <Text style={styles.noteText}>
              {isNe
                ? 'पूर्ण एडमिन उपकरणहरू वेब पोर्टलमा छन् (portal/)। रिमोट पहुँचको लागि पोर्टल डिप्लोय गर्न विकासकर्तालाई भन्नुहोस्।'
                : 'Full admin tooling lives in the web portal (portal/). Ask the developer to deploy it for remote access.'}
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F7F1EB' },
  col: { padding: 20 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#221C33' },
  adminTag: { backgroundColor: D2.tealTint, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 },
  adminTagText: { fontSize: 11.5, fontFamily: FONT.bold, fontWeight: '700', color: D2.tealDeep },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: '#7A6E65', marginTop: 2, marginBottom: 14 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statTile: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE0D4', paddingVertical: 12, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: '#221C33' },
  statLabel: { fontSize: 10.5, fontFamily: FONT.semibold, fontWeight: '600', color: '#7A6E65', textAlign: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE0D4', padding: 14, marginBottom: 12 },
  cardTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  cardTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: '#221C33' },
  countPill: { backgroundColor: D2.tealTint, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 2 },
  countPillText: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700', color: D2.tealDeep },
  accessPill: { backgroundColor: D2.tealTint, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  accessPillText: { fontSize: 10.5, fontFamily: FONT.bold, fontWeight: '700', color: D2.tealDeep },
  staffRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  staffEmail: { fontSize: 13.5, fontFamily: FONT.semibold, fontWeight: '600', color: '#221C33' },
  staffNote: { fontSize: 12, fontFamily: FONT.regular, color: '#7A6E65', marginTop: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  rowLabel: { fontSize: 13, fontFamily: FONT.regular, color: '#7A6E65' },
  rowValue: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#221C33', flexShrink: 1 },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE0D4', padding: 14, marginBottom: 12 },
  actionText: { flex: 1, fontSize: 14.5, fontFamily: FONT.semibold, fontWeight: '600', color: D2.tealDeep },
  noteCard: { flexDirection: 'row', gap: 8, backgroundColor: '#F1E8DD', borderRadius: 12, padding: 12, alignItems: 'flex-start' },
  noteText: { flex: 1, fontSize: 12.5, fontFamily: FONT.regular, color: '#5C5348', lineHeight: 18 },
  deniedCard: { backgroundColor: '#FFFFFF', borderRadius: 14, borderWidth: 1, borderColor: '#EDE0D4', padding: 20, alignItems: 'center', gap: 8, marginTop: 16 },
  deniedTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: '#221C33' },
  deniedText: { fontSize: 13, fontFamily: FONT.regular, color: '#7A6E65', textAlign: 'center' },
});
