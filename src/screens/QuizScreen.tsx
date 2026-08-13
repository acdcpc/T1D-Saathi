import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FONT } from '../theme';

const SAMPLE_QUESTIONS = [
  { id: 'q1', text: 'What is the normal blood glucose range for a person without diabetes?', options: ['70-120 mg/dL', '150-200 mg/dL', '200-300 mg/dL', '50-80 mg/dL'], answer: 0 },
  { id: 'q2', text: 'What should you do when glucose drops below 70 mg/dL?', options: ['Take more insulin', 'Take 15g fast-acting carbs', 'Go to sleep', 'Skip the next meal'], answer: 1 },
  { id: 'q3', text: 'Which of these is a sign of DKA?', options: ['Low blood pressure', 'Fruity breath', 'Weight gain', 'Slow heart rate'], answer: 1 },
  { id: 'q4', text: 'How often should you check ketones during sick days with mild ketosis?', options: ['Once a day', 'Every 2-4 hours', 'Once a week', 'Only when glucose is high'], answer: 1 },
  { id: 'q5', text: 'What is the 15-15 rule for hypoglycemia?', options: ['15 units insulin, wait 15 min', '15g carbs, recheck in 15 min', '15 min exercise, 15 min rest', '15 oz water, 15 min wait'], answer: 1 },
];

export default function QuizScreen({ route, navigation }: any) {
  const { patientId, phase } = route.params;
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (idx: number) => {
    const newAnswers = [...answers, idx];
    if (currentQ < SAMPLE_QUESTIONS.length - 1) {
      setAnswers(newAnswers);
      setCurrentQ(currentQ + 1);
    } else {
      setAnswers(newAnswers);
      setFinished(true);
    }
  };

  if (finished) {
    const correct = answers.filter((a, i) => a === SAMPLE_QUESTIONS[i].answer).length;
    const score = Math.round((correct / SAMPLE_QUESTIONS.length) * 100);

    return (
      <View style={styles.container}>
        <Text style={styles.title}>{phase === 'pre' ? t('preQuiz') : t('postQuiz')}</Text>
        <View style={styles.resultCard}>
          <Text style={styles.scoreLabel}>{t('quizScore')}</Text>
          <Text style={styles.scoreValue}>{score}%</Text>
          <Text style={styles.scoreDetail}>{correct} of {SAMPLE_QUESTIONS.length} correct</Text>
        </View>
        <TouchableOpacity style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const q = SAMPLE_QUESTIONS[currentQ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{phase === 'pre' ? t('preQuiz') : t('postQuiz')}</Text>
      <Text style={styles.progress}>Question {currentQ + 1} of {SAMPLE_QUESTIONS.length}</Text>
      <View style={styles.questionCard}>
        <Text style={styles.questionText}>{q.text}</Text>
        {q.options.map((opt, i) => (
          <TouchableOpacity key={i} style={styles.optionBtn} onPress={() => handleAnswer(i)}>
            <Text style={styles.optionText}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 90, paddingBottom: 60 },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 8 },
  progress: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 20 },
  questionCard: { backgroundColor: '#fff', borderRadius: 12, padding: 18, borderWidth: 1, borderColor: '#e8eaed' },
  questionText: { fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 20, lineHeight: 24 },
  optionBtn: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 16, marginBottom: 10 },
  optionText: { fontSize: 15, fontFamily: FONT.regular, color: '#202124' },
  resultCard: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', borderWidth: 1, borderColor: '#e8eaed', marginTop: 20 },
  scoreLabel: { fontSize: 16, fontFamily: FONT.regular, color: '#5f6368' },
  scoreValue: { fontSize: 56, fontFamily: FONT.extrabold, fontWeight: '800', color: '#1a73e8' },
  scoreDetail: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', marginTop: 4 },
  doneBtn: { backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 20 },
  doneText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
});
