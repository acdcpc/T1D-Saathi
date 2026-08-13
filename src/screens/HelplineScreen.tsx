import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FONT } from '../theme';

interface Helpline {
  id: string;
  name: string;
  role_en: string;
  role_ne: string;
  phone: string;
  priority: number;
}

export default function HelplineScreen() {
  const { t, language } = useLanguage();
  const [helplines, setHelplines] = useState<Helpline[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('helplines').select('*').eq('is_active', true).order('priority', { ascending: false });
      setHelplines(data || []);
      setLoading(false);
    })();
  }, []);

  const callNumber = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#ea4335" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{language === 'ne' ? 'सहयोग लाइन' : 'Helpline'}</Text>
      <Text style={styles.subtitle}>
        {language === 'ne'
          ? 'तुरुन्त चिकित्सकीय सल्लाहको लागि कल गर्नुहोस्'
          : 'Call now for immediate clinical phone advice'}
      </Text>

      {helplines.map(hl => (
        <View key={hl.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.name}>{hl.name}</Text>
            {hl.priority === 1 && <View style={styles.primaryBadge}><Text style={styles.primaryText}>PRIMARY</Text></View>}
          </View>
          <Text style={styles.role}>{language === 'ne' && hl.role_ne ? hl.role_ne : hl.role_en}</Text>
          <TouchableOpacity style={styles.callButton} onPress={() => callNumber(hl.phone)}>
            <Ionicons name="call" size={28} color="#fff" />
            <Text style={styles.callNumber}>{hl.phone}</Text>
            <Text style={styles.tapHint}>{language === 'ne' ? 'कल गर्न थिच्नुहोस्' : 'Tap to Call'}</Text>
          </TouchableOpacity>
        </View>
      ))}

      {helplines.length === 0 && (
        <View style={styles.noHelpline}>
          <Text style={styles.noHelplineText}>No helpline numbers available. Please contact your assigned clinician.</Text>
        </View>
      )}

      <View style={styles.noteBox}>
        <Text style={styles.noteTitle}>ⓘ Note</Text>
        <Text style={styles.noteText}>
          {language === 'ne'
            ? 'यो हेल्पलाइन स्थानीय आपतकालीन सेवाको विकल्प होइन। वास्तविक आपतकालीन अवस्थामा, कृपया नजिकको अस्पताल जानुहोस् वा एम्बुलेन्सलाई कल गर्नुहोस्।'
            : 'This helpline does not replace local emergency services. In a true emergency, go to the nearest hospital or call an ambulance.'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF5F5', padding: 20, paddingTop: 90 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 28, fontFamily: FONT.extrabold, fontWeight: '800', color: '#ea4335', marginBottom: 4 },
  subtitle: { fontSize: 15, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 2, borderColor: '#ea4335', shadowColor: '#ea4335', shadowOpacity: 0.1, shadowRadius: 8, elevation: 3 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4, gap: 8 },
  name: { fontSize: 22, fontFamily: FONT.bold, fontWeight: '700', color: '#202124' },
  primaryBadge: { backgroundColor: '#ea4335', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  primaryText: { fontSize: 10, fontFamily: FONT.bold, fontWeight: '700', color: '#fff' },
  role: { fontSize: 15, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 16 },
  callButton: { backgroundColor: '#ea4335', borderRadius: 12, padding: 18, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
  callIcon: { fontSize: 24, fontFamily: FONT.regular },
  callNumber: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#fff' },
  tapHint: { fontSize: 12, fontFamily: FONT.regular, color: 'rgba(255,255,255,0.8)', position: 'absolute', bottom: 6, right: 14 },
  noHelpline: { padding: 20, alignItems: 'center' },
  noHelplineText: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', textAlign: 'center' },
  noteBox: { backgroundColor: '#fce8e6', borderRadius: 10, padding: 14, marginTop: 10, borderWidth: 1, borderColor: '#f5c6c0' },
  noteTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: '#ea4335', marginBottom: 4 },
  noteText: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368', lineHeight: 17 },
});
