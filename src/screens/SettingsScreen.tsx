import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import type { Language } from '../types';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();

  const handleLogout = () => {
    Alert.alert(t('logout'), 'Are you sure?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t('settingsTitle')}</Text>

      <Text style={styles.section}>{t('language')}</Text>
      <View style={styles.row}>
        <TouchableOpacity style={[styles.optBtn, language === 'en' && styles.optActive]} onPress={() => setLanguage('en')}>
          <Text style={[styles.optText, language === 'en' && styles.optActiveText]}>{t('english')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.optBtn, language === 'ne' && styles.optActive]} onPress={() => setLanguage('ne')}>
          <Text style={[styles.optText, language === 'ne' && styles.optActiveText]}>{t('nepali')}</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.section}>{t('units')}</Text>
      <Text style={styles.infoText}>Default unit is mg/dL. Toggle per-measurement on the logging screens.</Text>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>{t('logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>v1.0.0 · T1D Saathi</Text>
      <Text style={styles.credit}>© 2026 · Built with ♥ for Nepali families</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#202124', marginBottom: 24 },
  section: { fontSize: 16, fontWeight: '700', color: '#202124', marginBottom: 10, marginTop: 16 },
  row: { flexDirection: 'row', gap: 12 },
  optBtn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center', backgroundColor: '#e8eaed' },
  optActive: { backgroundColor: '#1a73e8' },
  optText: { fontSize: 16, fontWeight: '600', color: '#3c4043' },
  optActiveText: { color: '#fff' },
  infoText: { fontSize: 14, color: '#5f6368', fontStyle: 'italic' },
  logoutBtn: { backgroundColor: '#ea4335', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 40 },
  logoutText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  version: { textAlign: 'center', color: '#80868b', fontSize: 12, marginTop: 24 },
  credit: { textAlign: 'center', color: '#80868b', fontSize: 12, marginTop: 4 },
});
