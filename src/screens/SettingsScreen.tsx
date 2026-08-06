import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { T, card, section, primBtn } from '../theme';
import type { Language } from '../types';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const isNe = language === 'ne';

  const handleLogout = () => {
    Alert.alert(
      isNe ? 'लग आउट' : 'Logout',
      isNe ? 'के तपाई निश्चित हुनुहुन्छ?' : 'Are you sure?',
      [
        { text: isNe ? 'रद्द' : 'Cancel', style: 'cancel' },
        { text: isNe ? 'लग आउट' : 'Logout', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={styles.title}>{isNe ? 'सेटिङ' : 'Settings'}</Text>
          <View style={{ width: 22 }} />
        </View>

        {/* Language */}
        <Text style={styles.sectionLabel}>{isNe ? 'भाषा' : 'Language'}</Text>
        <View style={styles.langRow}>
          <TouchableOpacity
            style={[styles.langBtn, language === 'en' && styles.langActive]}
            onPress={() => setLanguage('en')}
          >
            <Text style={[styles.langText, language === 'en' && styles.langActiveText]}>English</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.langBtn, language === 'ne' && styles.langActive]}
            onPress={() => setLanguage('ne')}
          >
            <Text style={[styles.langText, language === 'ne' && styles.langActiveText]}>नेपाली</Text>
          </TouchableOpacity>
        </View>

        {/* Units */}
        <Text style={styles.sectionLabel}>{isNe ? 'एकाइ' : 'Units'}</Text>
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={18} color={T.muted} />
          <Text style={styles.infoText}>
            {isNe
              ? 'पूर्वनिर्धारित mg/dL हो। mmol/L मा स्विच गर्न ग्लुकोज लग स्क्रिनमा जानुहोस्।'
              : 'Default unit is mg/dL. Toggle to mmol/L on the glucose logging screen.'}
          </Text>
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>{isNe ? 'खाता' : 'Account'}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>{isNe ? 'लग आउट' : 'Log Out'}</Text>
        </TouchableOpacity>

        <Text style={styles.version}>v1.0.0 · T1D Saathi</Text>
        <Text style={styles.credit}>© 2026 · {isNe ? 'नेपाली परिवारहरूको लागि ♥ सहित' : 'Built with ♥ for Nepali families'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontWeight: '800', color: T.text },

  sectionLabel: { ...section },

  langRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  langBtn: {
    flex: 1, borderRadius: 10, padding: 14, alignItems: 'center',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  langActive: { backgroundColor: T.blue, borderColor: T.blue },
  langText: { fontSize: 16, fontWeight: '600', color: T.text },
  langActiveText: { color: '#fff' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 13, color: T.muted, lineHeight: 18 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.red, borderRadius: 28, paddingVertical: 14,
  },
  logoutText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  version: { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 32 },
  credit: { textAlign: 'center', color: T.muted, fontSize: 12, marginTop: 4 },
});
