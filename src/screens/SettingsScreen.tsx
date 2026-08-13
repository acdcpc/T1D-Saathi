import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { FONT, T, card, section, primBtn } from '../theme';
import { configureReminders } from '../utils/reminders';
import { isVoiceReadbackEnabled, setVoiceReadbackEnabled } from '../utils/speech';
import type { Language } from '../types';

export default function SettingsScreen({ navigation }: any) {
  const { signOut } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { highContrast, largeButtons, fontScale, theme: TH, setHighContrast, setLargeButtons, setFontScale } = usePreferences();
  const isNe = language === 'ne';
  const [preMeal, setPreMeal] = useState(false);
  const [bedtime, setBedtime] = useState(false);
  const [voice, setVoice] = useState(false);

  useEffect(() => {
    (async () => setVoice(await isVoiceReadbackEnabled()))();
  }, []);

  const handleVoiceToggle = async (val: boolean) => {
    setVoice(val);
    await setVoiceReadbackEnabled(val);
  };

  const handleReminderToggle = async (which: 'preMeal' | 'bedtime', val: boolean) => {
    const next = { preMeal, bedtime, [which]: val };
    if (which === 'preMeal') setPreMeal(val); else setBedtime(val);
    const ok = await configureReminders(next);
    if (!ok) {
      Alert.alert(
        isNe ? 'अनुमति आवश्यक' : 'Permission needed',
        isNe ? 'सूचना अनुमति दिनुहोस्।' : 'Please allow notifications to set reminders.'
      );
      if (which === 'preMeal') setPreMeal(!val); else setBedtime(!val);
    }
  };

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
    <SafeAreaView style={[styles.container, { backgroundColor: TH.bg }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={T.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: TH.text }]}>{isNe ? 'सेटिङ' : 'Settings'}</Text>
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

        {/* Reminders */}
        <Text style={styles.sectionLabel}>{isNe ? 'सम्झाउने' : 'Reminders'}</Text>
        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{isNe ? 'खाना अघिको जाँच' : 'Pre-meal checks'}</Text>
            <Text style={styles.rowSub}>{isNe ? 'बिहान ७, दिउँसो १२, बेलुका ७' : '7 AM · 12 PM · 7 PM'}</Text>
          </View>
          <Switch value={preMeal} onValueChange={(v) => handleReminderToggle('preMeal', v)} trackColor={{ true: T.blue }} />
        </View>
        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{isNe ? 'रातको जाँच' : 'Bedtime check'}</Text>
            <Text style={styles.rowSub}>{isNe ? 'रात ९ बजे' : '9 PM'}</Text>
          </View>
          <Switch value={bedtime} onValueChange={(v) => handleReminderToggle('bedtime', v)} trackColor={{ true: T.blue }} />
        </View>

        {/* Accessibility */}
        <Text style={styles.sectionLabel}>{isNe ? 'पहुँचयोग्यता' : 'Accessibility'}</Text>
        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{isNe ? 'आवाज पढेर सुनाउने' : 'Voice readback'}</Text>
            <Text style={styles.rowSub}>{isNe ? 'ग्लुकोज र डोज ठूलो स्वरमा सुनाउनुहोस्' : 'Speak glucose and dose values aloud'}</Text>
          </View>
          <Switch value={voice} onValueChange={handleVoiceToggle} trackColor={{ true: T.blue }} />
        </View>

        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: TH.text }]}>{isNe ? 'उच्च कन्ट्रास्ट' : 'High contrast'}</Text>
            <Text style={styles.rowSub}>{isNe ? 'सेतो पृष्ठभूमि र गाढा अक्षर' : 'White background, darker text'}</Text>
          </View>
          <Switch value={highContrast} onValueChange={setHighContrast} trackColor={{ true: TH.blue }} />
        </View>
        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: TH.text }]}>{isNe ? 'ठूला बटन' : 'Large buttons'}</Text>
            <Text style={styles.rowSub}>{isNe ? 'ठूला टच लक्ष्य' : 'Bigger touch targets'}</Text>
          </View>
          <Switch value={largeButtons} onValueChange={setLargeButtons} trackColor={{ true: TH.blue }} />
        </View>
        <View style={styles.rowCard}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: TH.text }]}>{isNe ? 'ठूलो अक्षर' : 'Larger text'}</Text>
            <Text style={styles.rowSub}>{isNe ? '१.२ गुणा ठूलो पाठ' : '1.2× text size'}</Text>
          </View>
          <Switch value={fontScale >= 1.2} onValueChange={(v) => setFontScale(v ? 1.2 : 1)} trackColor={{ true: TH.blue }} />
        </View>

        {/* Account */}
        <Text style={styles.sectionLabel}>{isNe ? 'खाता' : 'Account'}</Text>
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>{isNe ? 'लग आउट' : 'Log Out'}</Text>
        </TouchableOpacity>

        <View style={styles.disclaimerCard}>
          <Text style={styles.disclaimerTitle}>{isNe ? 'महत्वपूर्ण' : 'Important'}</Text>
          <Text style={styles.disclaimerText}>
            {isNe
              ? 'T1D साथी चिकित्सकीय उपकरण होइन। सबै डोज सिफारिसहरू परामर्शमात्र हुन् र चिकित्सकले पुष्टि गर्नुपर्छ।'
              : 'T1D Saathi is not a medical device. All dosing recommendations are advisory and require clinician verification.'}
          </Text>
        </View>

        <Text style={styles.version}>v1.0.0 · T1D Saathi</Text>
        <Text style={styles.credit}>© 2026 · {isNe ? 'नेपाली परिवारहरूको लागि ♥ सहित' : 'Built with ♥ for Nepali families'}</Text>
        <Text style={styles.madeIn}>🇳🇵 {isNe ? 'नेपालमा निर्मित' : 'Made in Nepal'}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  backBtn: { padding: 4 },
  title: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },

  sectionLabel: { ...section },

  langRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  langBtn: {
    flex: 1, borderRadius: 10, padding: 14, alignItems: 'center',
    backgroundColor: T.surface, borderWidth: 1, borderColor: T.border,
  },
  langActive: { backgroundColor: T.blue, borderColor: T.blue },
  langText: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  langActiveText: { color: '#fff' },

  infoCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: T.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 8,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: FONT.regular, color: T.muted, lineHeight: 18 },

  rowCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: T.surface, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.border, marginBottom: 8,
  },
  rowTitle: { fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  rowSub: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: T.red, borderRadius: 28, paddingVertical: 14,
  },
  logoutText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  version: { textAlign: 'center', color: T.muted, fontSize: 12, fontFamily: FONT.regular, marginTop: 32 },
  credit: { textAlign: 'center', color: T.muted, fontSize: 12, fontFamily: FONT.regular, marginTop: 4 },
  madeIn: { textAlign: 'center', color: T.muted, fontSize: 12, fontFamily: FONT.semibold, marginTop: 4, fontWeight: '600' },
  disclaimerCard: {
    backgroundColor: T.amberLight, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: T.orange, marginTop: 24,
  },
  disclaimerTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: T.amberDark, marginBottom: 4 },
  disclaimerText: { fontSize: 13, fontFamily: FONT.regular, color: T.text, lineHeight: 18 },
});
