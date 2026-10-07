import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Share, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FONT, T } from '../theme';
import BackBar from '../components/BackBar';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function makeCode(): string {
  let s = 'SB-';
  for (let i = 0; i < 6; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return s;
}

interface Invite { id: string; code: string; created_at: string; expires_at: string; used_at?: string | null; }

const contentCol = { width: '100%' as const, maxWidth: 640, alignSelf: 'center' as const };

export default function InviteClinicianScreen({ route, navigation }: any) {
  const { patientId, patientName } = route.params;
  const { user } = useAuth();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('care_team_invites')
      .select('id,code,created_at,expires_at,used_at')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(10);
    setInvites((data as Invite[]) || []);
    setLoading(false);
  }, [patientId]);

  useEffect(() => { load(); }, [load]);

  const createInvite = async () => {
    if (!user) return;
    setCreating(true);
    const code = makeCode();
    const expires = new Date(Date.now() + 14 * 24 * 3600 * 1000).toISOString();
    const { error } = await supabase.from('care_team_invites').insert({
      patient_id: patientId,
      code,
      created_by: user.id,
      expires_at: expires,
    });
    setCreating(false);
    if (error) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', error.message);
      return;
    }
    load();
  };

  const shareInvite = async (invite: Invite) => {
    try {
      await Share.share({
        message: isNe
          ? `सानो वीर: मेरो बच्चा ${patientName} को उपचार टोलीमा जोडिनुहोस्। आमन्त्रण कोड: ${invite.code} (${invite.expires_at.slice(0, 10)} सम्म मान्य)`
          : `Sano Bir: please join my child ${patientName}'s care team. Invite code: ${invite.code} (valid until ${invite.expires_at.slice(0, 10)})`,
      });
    } catch { /* ignored */ }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <BackBar navigation={navigation} />
      <ScrollView contentContainerStyle={[styles.content, contentCol]}>
        <Text style={styles.title}>{isNe ? 'चिकित्सकलाई आमन्त्रण' : 'Invite a clinician'}</Text>
        <Text style={styles.hint}>
          {isNe
            ? `एक-पटक प्रयोग हुने कोड बनाउनुहोस् र आफ्नो चिकित्सकलाई पठाउनुहोस्। उनीहरूले एपमा कोड हाल्दा ${patientName} को रेकर्डमा जोडिनुहुनेछ।`
            : `Create a single-use code and send it to your clinician. When they enter it in their app, they are linked to ${patientName}'s records.`}
        </Text>

        <TouchableOpacity style={styles.createBtn} onPress={createInvite} disabled={creating}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.createBtnText}>{creating ? '…' : (isNe ? 'नयाँ कोड बनाउनुहोस्' : 'Create new code')}</Text>
        </TouchableOpacity>

        {loading ? (
          <ActivityIndicator style={{ marginTop: 20 }} />
        ) : (
          invites.map((inv) => (
            <View key={inv.id} style={styles.inviteCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{inv.code}</Text>
                <Text style={styles.meta}>
                  {inv.used_at
                    ? (isNe ? 'प्रयोग भयो' : 'Used')
                    : (isNe ? `मान्य: ${inv.expires_at.slice(0, 10)} सम्म` : `Valid until ${inv.expires_at.slice(0, 10)}`)}
                </Text>
              </View>
              {!inv.used_at && (
                <TouchableOpacity style={styles.shareBtn} onPress={() => shareInvite(inv)}>
                  <Ionicons name="share-outline" size={16} color={T.blue} />
                  <Text style={styles.shareText}>{isNe ? 'पठाउनुहोस्' : 'Share'}</Text>
                </TouchableOpacity>
              )}
            </View>
          ))
        )}
        {!loading && invites.length === 0 && (
          <Text style={styles.empty}>{isNe ? 'अहिलेसम्म कुनै कोड छैन।' : 'No invite codes yet.'}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingTop: 30 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, marginBottom: 10 },
  hint: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, lineHeight: 19, marginBottom: 16 },
  createBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: T.blue, borderRadius: 28, paddingVertical: 14, marginBottom: 18 },
  createBtnText: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
  inviteCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#e8eaed', marginBottom: 10 },
  code: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, letterSpacing: 1 },
  meta: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 3 },
  shareBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderColor: T.blue, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  shareText: { color: T.blue, fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
  empty: { textAlign: 'center', color: T.muted, fontSize: 13, fontFamily: FONT.regular, marginTop: 24 },
});
