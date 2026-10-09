import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import BackBar from '../components/BackBar';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FONT, T } from '../theme';

const CONSENT_VERSION = 'v1-2026-10-05';

export default function ConsentScreen({ navigation, route }: any) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const firstRun = !!route?.params?.firstRun;
  const [guardianName, setGuardianName] = useState('');
  const [guardianOk, setGuardianOk] = useState(false);
  const [assentOk, setAssentOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<{ created_at: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!user) return;
      const { data } = await supabase
        .from('consents')
        .select('created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      setExisting(data?.[0] || null);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    if (!guardianOk || !guardianName.trim()) {
      Alert.alert(isNe ? 'आवश्यक' : 'Required', isNe ? 'अभिभावकको सहमति र नाम आवश्यक छ।' : 'Guardian consent and name are required.');
      return;
    }
    setSaving(true);
    const now = new Date().toISOString();
    const { error } = await supabase.from('consents').insert({
      user_id: user.id,
      consent_version: CONSENT_VERSION,
      guardian_name: guardianName.trim(),
      guardian_consent: true,
      child_assent: assentOk,
      guardian_consent_at: now,
      child_assent_at: assentOk ? now : null,
    });
    setSaving(false);
    if (error) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', error.message);
      return;
    }
    Alert.alert(isNe ? 'धन्यवाद' : 'Thank you', isNe ? 'सहमति रेकर्ड गरियो।' : 'Consent recorded.');
    navigation.goBack();
  };

  const points = isNe ? [
    'यो एपले तपाईंको बच्चाको स्वास्थ्य डाटा (ग्लुकोज, इन्सुलिन, खाना) सुरक्षित रूपमा भण्डारण गर्छ।',
    'डाटा केवल उपचार र हेरचाहका लागि प्रयोग हुन्छ; विज्ञापन वा तेस्रो पक्षलाई बेचिँदैन।',
    'तपाईं कुनै पनि बेला आफ्नो डाटा मेटाउन सक्नुहुन्छ (सेटिङ → तपाईंको डाटा)।',
    'यो एप चिकित्सकीय उपकरण होइन; औषधि सम्बन्धी निर्णय सधैं चिकित्सकसँग मिलेर गर्नुहोस्।',
    'आपतकालमा एक टचमा हेल्पलाइन (डा. अर्चना) उपलब्ध छ।',
  ] : [
    "This app securely stores your child's health data (glucose, insulin, meals).",
    "Data is used only for your child's care; never sold or shared with advertisers.",
    'You can request deletion of your data at any time (Settings → Your data).',
    'This app is not a medical device; dosing decisions must involve your clinician.',
    'The emergency helpline (Dr. Archana) is one tap away.',
  ];

  const assentText = isNe
    ? 'मैले मेरो बच्चालाई सरल भाषामा यो एपबारे बुझाएँ र उनीहरू सहमत छन्।'
    : 'I explained this app to my child in simple words and they agreed to use it.';

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <BackBar navigation={navigation} />
        <Text style={styles.title}>{isNe ? 'सहमति र अनुमति' : 'Consent & Assent'}</Text>
        {firstRun && (
          <Text style={styles.sub}>{isNe ? 'सुरु गर्नु अघि कृपया पढ्नुहोस्।' : 'Please review before you begin.'}</Text>
        )}

        {existing && (
          <View style={styles.existing}>
            <Ionicons name="checkmark-circle" size={18} color="#0D9488" />
            <Text style={styles.existingText}>
              {isNe ? 'अघिल्लो सहमति रेकर्ड छ: ' : 'Previous consent on record: '}
              {existing.created_at.slice(0, 10)}
            </Text>
          </View>
        )}

        <View style={styles.card}>
          {points.map((p, i) => (
            <Text key={i} style={styles.point}>• {p}</Text>
          ))}
        </View>

        <Text style={styles.label}>{isNe ? 'अभिभावक/हेरचाहकर्ताको नाम' : 'Guardian / caregiver name'}</Text>
        <TextInput
          style={styles.input}
          value={guardianName}
          onChangeText={setGuardianName}
          placeholder={isNe ? 'पूरा नाम' : 'Full name'}
        />

        <TouchableOpacity style={styles.checkRow} onPress={() => setGuardianOk(!guardianOk)}>
          <Ionicons name={guardianOk ? 'checkbox' : 'square-outline'} size={22} color={guardianOk ? T.blue : '#5f6368'} />
          <Text style={styles.checkText}>
            {isNe ? 'मैं अभिभावक/हेरचाहकर्ता हुँ र म सहमत छु।' : 'I am the parent/guardian and I consent.'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.checkRow} onPress={() => setAssentOk(!assentOk)}>
          <Ionicons name={assentOk ? 'checkbox' : 'square-outline'} size={22} color={assentOk ? T.blue : '#5f6368'} />
          <Text style={styles.checkText}>{assentText}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.saveBtnText}>{isNe ? 'सहमति रेकर्ड गर्नुहोस्' : 'Record consent'}</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>
          {isNe ? 'यो पाठ कानुनी समीक्षा पछि अन्तिम हुनेछ।' : 'This wording will be finalized after legal review.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 20, paddingTop: 30 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, marginBottom: 6 },
  sub: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginBottom: 14 },
  existing: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E6F4EA', borderRadius: 10, padding: 12, marginBottom: 14 },
  existingText: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#0D652D' },
  card: { backgroundColor: T.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: T.border, marginBottom: 16 },
  point: { fontSize: 13, fontFamily: FONT.regular, color: T.text, lineHeight: 20, marginBottom: 8 },
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, marginBottom: 6 },
  input: { backgroundColor: '#fff', borderRadius: 10, padding: 14, fontSize: 15, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0', marginBottom: 14 },
  checkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  checkText: { flex: 1, fontSize: 14, fontFamily: FONT.regular, color: T.text, lineHeight: 20 },
  saveBtn: { backgroundColor: T.blue, borderRadius: 28, paddingVertical: 15, alignItems: 'center', marginTop: 18 },
  saveBtnText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },
  note: { fontSize: 11, fontFamily: FONT.regular, color: T.muted, textAlign: 'center', marginTop: 12, fontStyle: 'italic' },
});
