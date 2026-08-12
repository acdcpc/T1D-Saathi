import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { useLanguage } from '../context/LanguageContext';

const TOPICS = [
  { id: '1', topic: 'Diagnosis & Pathophysiology', icon: '🔬', order: 1 },
  { id: '2', topic: 'Dietary Guidance', icon: '🥗', order: 2 },
  { id: '3', topic: 'Insulin Therapy & Management', icon: '💉', order: 3 },
  { id: '4', topic: 'Psychosocial Aspects (Patient)', icon: '🧒', order: 4, audience: 'patient' },
  { id: '5', topic: 'Psychosocial Aspects (Family)', icon: '👨‍👩‍👧', order: 5, audience: 'family' },
  { id: '6', topic: 'Sick Day Management', icon: '🤒', order: 6 },
];

export default function EducationScreen({ route, navigation }: any) {
  const { patientId } = route.params;
  const { t, language } = useLanguage();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('educationLibrary')}</Text>
      <Text style={styles.subtitle}>Tap a topic to watch the educational video</Text>
      <FlatList
        data={TOPICS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card}>
            <Text style={styles.icon}>{item.icon}</Text>
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>{item.topic}</Text>
              {item.audience && <Text style={styles.audience}>For: {item.audience}</Text>}
            </View>
            <Text style={styles.playBtn}>▶️</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.quizBtn} onPress={() => navigation.navigate('Quiz', { patientId, phase: 'pre' })}>
        <Text style={styles.quizText}>📝 {t('preQuiz')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF', padding: 20, paddingTop: 90 },
  title: { fontSize: 24, fontWeight: '800', color: '#202124', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#5f6368', marginBottom: 20 },
  list: { paddingBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  icon: { fontSize: 32, marginRight: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#202124' },
  audience: { fontSize: 12, color: '#5f6368', marginTop: 2 },
  playBtn: { fontSize: 24 },
  quizBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  quizText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
