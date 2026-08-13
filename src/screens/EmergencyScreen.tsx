import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import ISPADBadge from '../components/ISPADBadge';
import { useLanguage } from '../context/LanguageContext';
import { FONT,  T, card, section } from '../theme';

const HELPLINE = '9851350883';

export default function EmergencyScreen({ navigation }: any) {
  const { language } = useLanguage();
  const isNe = language === 'ne';

  const callHelpline = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    Linking.openURL(`tel:${HELPLINE}`);
  };

  const protocols = [
    {
      icon: '🔴',
      title: isNe ? 'गम्भीर हाइपो' : 'Severe Hypoglycemia',
      subtitle: isNe ? 'ग्लुकोज ५४ mg/dL भन्दा कम वा बेहोस' : 'Glucose < 54 mg/dL or unconscious',
      steps: [
        isNe ? 'यदि बेहोस छ भने — मुखमा केहि नराख्नुहोस्' : 'If unconscious — do NOT put anything in mouth',
        isNe ? 'ग्लुकागन इन्जेक्सन दिनुहोस् (यदि उपलब्ध छ)' : 'Give glucagon injection (if available)',
        isNe ? 'तुरुन्त ९८५१३५०८८३ मा फोन गर्नुहोस्' : 'Call 9851350883 immediately',
        isNe ? 'रिकभरी पोजिसनमा राख्नुहोस्' : 'Place in recovery position',
      ],
    },
    {
      icon: '🟠',
      title: isNe ? 'गम्भीर हाइपर' : 'Severe Hyperglycemia',
      subtitle: isNe ? 'ग्लुकोज २५० mg/dL भन्दा माथि + केटोन्स सहित' : 'Glucose > 250 mg/dL with ketones',
      steps: [
        isNe ? 'प्रशस्त पानी पिउनुहोस्' : 'Drink plenty of water',
        isNe ? 'केटोन्स जाँच गर्नुहोस्' : 'Check ketones',
        isNe ? 'सुधार डोज दिनुहोस् (चिकित्सकको सल्लाह अनुसार)' : 'Give correction dose (per clinician plan)',
        isNe ? '९८५१३५०८८३ मा फोन गर्नुहोस्' : 'Call 9851350883',
      ],
    },
    {
      icon: '⚫',
      title: 'DKA',
      subtitle: isNe ? 'उच्च केटोन्स + वाकवाकी + पेट दुखाइ' : 'High ketones + nausea + abdominal pain',
      steps: [
        isNe ? 'यो मेडिकल इमर्जेन्सी हो' : 'This is a medical emergency',
        isNe ? 'तुरुन्त अस्पताल जानुहोस्' : 'Go to hospital immediately',
        isNe ? 'बाटोमा पानी पिउन जारी राख्नुहोस्' : 'Continue drinking water en route',
        isNe ? '९८५१३५०८८३ मा फोन गर्नुहोस्' : 'Call 9851350883',
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backArrow}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{isNe ? 'आपतकालीन' : 'Emergency'}</Text>
          <View style={{ width: 30 }} />
        </View>

        <View style={styles.callCard}>
          <Text style={styles.callTitle}>{isNe ? 'तुरुन्त सहायता' : 'Immediate Help'}</Text>
          <TouchableOpacity style={styles.callBtn} onPress={callHelpline} activeOpacity={0.7}>
            <Text style={styles.callIcon}>📞</Text>
            <Text style={styles.callNum}>{HELPLINE}</Text>
          </TouchableOpacity>
          <Text style={styles.callSub}>{isNe ? 'डा. अर्चना — २४/७ हेल्पलाइन' : 'Dr. Archana — 24/7 Helpline'}</Text>
        </View>

        <ISPADBadge />
        <Text style={styles.sectionLabel}>{isNe ? 'आपतकालीन प्रोटोकलहरू' : 'Emergency Protocols'}</Text>

        {protocols.map((p, i) => (
          <View key={i} style={styles.protocolCard}>
            <Text style={styles.protocolIcon}>{p.icon}</Text>
            <Text style={styles.protocolTitle}>{p.title}</Text>
            <Text style={styles.protocolSub}>{p.subtitle}</Text>
            {p.steps.map((s, j) => (
              <View key={j} style={styles.stepRow}>
                <Text style={styles.stepNum}>{j + 1}.</Text>
                <Text style={styles.stepText}>{s}</Text>
              </View>
            ))}
          </View>
        ))}

        <Text style={styles.footer}>
          {isNe
            ? 'यो एप चिकित्सकीय उपकरण होइन। आपतकालमा सधैं चिकित्सकको सल्लाह लिनुहोस्।'
            : 'This app is not a medical device. Always consult a clinician in an emergency.'}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  content: { padding: 16, paddingTop: 10 },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backArrow: { fontSize: 32, fontFamily: FONT.regular, color: T.text, fontWeight: '300' },
  title: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.red },

  callCard: {
    backgroundColor: T.redLight, borderRadius: 16, padding: 20,
    alignItems: 'center', borderWidth: 2, borderColor: T.red, marginBottom: 20,
  },
  callTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: T.redDark, marginBottom: 10 },
  callBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: T.red, borderRadius: 28, paddingHorizontal: 24, paddingVertical: 14,
  },
  callIcon: { fontSize: 20, fontFamily: FONT.regular },
  callNum: { color: '#fff', fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800' },
  callSub: { fontSize: 12, fontFamily: FONT.regular, color: T.redDark, marginTop: 10 },

  sectionLabel: { ...section },

  protocolCard: {
    ...card, borderLeftWidth: 4, borderLeftColor: T.red, marginBottom: 12,
  },
  protocolIcon: { fontSize: 24, fontFamily: FONT.regular, marginBottom: 6 },
  protocolTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: T.text, marginBottom: 2 },
  protocolSub: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginBottom: 10 },

  stepRow: { flexDirection: 'row', marginBottom: 6, gap: 6 },
  stepNum: { fontSize: 13, fontFamily: FONT.bold, fontWeight: '700', color: T.red, width: 18 },
  stepText: { fontSize: 13, fontFamily: FONT.regular, color: T.text, flex: 1, lineHeight: 18 },

  footer: { textAlign: 'center', color: T.muted, fontSize: 11, fontFamily: FONT.regular, marginTop: 20, lineHeight: 16 },
});
