import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { FONT } from '../theme';
import { toDisplayNumber } from '../utils/nepaliNumber';

const TOPICS: { id: string; topic: string; topic_ne: string; icon: keyof typeof Ionicons.glyphMap; color: string; order: number; audience?: string }[] = [
  { id: '1', topic: 'Diagnosis & Pathophysiology', topic_ne: 'निदान र रोगविज्ञान', icon: 'flask-outline', color: '#1a73e8', order: 1 },
  { id: '2', topic: 'Dietary Guidance', topic_ne: 'आहार मार्गदर्शन', icon: 'nutrition-outline', color: '#0D9488', order: 2 },
  { id: '3', topic: 'Insulin Therapy & Management', topic_ne: 'इन्सुलिन थेरापी', icon: 'medical-outline', color: '#C0392B', order: 3 },
  { id: '4', topic: 'Psychosocial (Patient)', topic_ne: 'मनोसामाजिक (बिरामी)', icon: 'happy-outline', color: '#7C3AED', order: 4, audience: 'patient' },
  { id: '5', topic: 'Psychosocial (Family)', topic_ne: 'मनोसामाजिक (परिवार)', icon: 'people-outline', color: '#F59E0B', order: 5, audience: 'family' },
  { id: '6', topic: 'Sick Day Management', topic_ne: 'बिरामी दिन व्यवस्थापन', icon: 'thermometer-outline', color: '#DB2777', order: 6 },
];

export default function EducationScreen({ route, navigation }: any) {
  const patientId = (route.params as any)?.patientId || usePatient()?.id || '';
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(`t1d_edu_${patientId}`);
      if (saved) setCompleted(JSON.parse(saved));
    })();
  }, [patientId]);

  const toggle = async (id: string) => {
    const next = completed.includes(id)
      ? completed.filter((x) => x !== id)
      : [...completed, id];
    setCompleted(next);
    await AsyncStorage.setItem(`t1d_edu_${patientId}`, JSON.stringify(next));
  };

  const pct = Math.round((completed.length / TOPICS.length) * 100);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('educationLibrary')}</Text>
      <Text style={styles.subtitle}>{isNe ? 'विषय थिच्नुहोस् — पढेपछि चिन्ह लगाउनुहोस्' : 'Tap a topic to mark it as read'}</Text>

      {/* Progress */}
      <View style={styles.progressWrap}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.progressText}>
          {toDisplayNumber(completed.length, isNe)}/{toDisplayNumber(TOPICS.length, isNe)} · {toDisplayNumber(pct, isNe)}%
        </Text>
      </View>

      <FlatList
        data={TOPICS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => {
          const done = completed.includes(item.id);
          return (
            <TouchableOpacity style={[styles.card, done && styles.cardDone]} onPress={() => toggle(item.id)}>
              <View style={[styles.iconTile, { backgroundColor: (done ? '#D1FAE5' : item.color + '1A') }]}><Ionicons name={item.icon} size={24} color={done ? '#0D9488' : item.color} /></View>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{isNe ? item.topic_ne : item.topic}</Text>
                {item.audience && <Text style={styles.audience}>For: {item.audience}</Text>}
              </View>
              <Ionicons name={done ? 'checkmark-circle' : 'ellipse-outline'} size={24} color={done ? '#0D9488' : '#dadce0'} />
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity style={styles.quizBtn} onPress={() => navigation.navigate('Quiz', { patientId, phase: 'pre' })}>
        <Ionicons name="create-outline" size={18} color="#fff" /><Text style={styles.quizText}>{t('preQuiz')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF', padding: 20, paddingTop: 90 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 4 },
  subtitle: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 14 },
  progressWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: '#e8eaed', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#0D9488' },
  progressText: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#5f6368' },
  list: { paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  cardDone: { backgroundColor: '#f0fdf4', borderColor: '#0D9488' },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  audience: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368', marginTop: 2 },
  quizBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10, flexDirection: 'row', justifyContent: 'center', gap: 8 },
  iconTile: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  quizText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
});
