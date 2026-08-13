// Offline-sync conflict resolution dialog: shows conflicted entries and lets the
// user retry or discard them (never silently dropped).
import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FONT, T } from '../theme';
import { QueuedEntry } from '../utils/offlineQueue';

interface Props {
  visible: boolean;
  entries: QueuedEntry[];
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
  onClose: () => void;
  isNe?: boolean;
}

function labelFor(table: string, isNe?: boolean): string {
  const map: Record<string, [string, string]> = {
    glucose_logs: ['Glucose log', 'ग्लुकोज लग'],
    ketone_logs: ['Ketone log', 'किटोन लग'],
    meal_logs: ['Meal log', 'खाना लग'],
    sick_day_episodes: ['Sick-day episode', 'बिरामी दिनको रेकर्ड'],
  };
  const [en, ne] = map[table] || [table, table];
  return isNe ? ne : en;
}

export default function ConflictDialog({ visible, entries, onRetry, onDiscard, onClose, isNe }: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Ionicons name="warning-outline" size={26} color={T.red} />
            <Text style={styles.title}>{isNe ? 'पेन्डिङ रेकर्डहरू' : 'Unsynced records'}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={24} color={T.muted} />
            </TouchableOpacity>
          </View>
          <Text style={styles.sub}>
            {isNe
              ? 'यी रेकर्डहरू सर्भरमा पठाउन सकिएन। फेरि प्रयास गर्नुहोस् वा हटाउनुहोस्।'
              : 'These records could not be synced. Retry or remove them — nothing is lost silently.'}
          </Text>
          <ScrollView style={styles.list} contentContainerStyle={{ gap: 8 }}>
            {entries.map((e) => (
              <View key={e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{labelFor(e.table, isNe)}</Text>
                  <Text style={styles.rowSub} numberOfLines={2}>
                    {e.conflict_reason || (isNe ? 'सिंक असफल' : 'Sync failed')}
                  </Text>
                </View>
                <TouchableOpacity style={styles.retryBtn} onPress={() => onRetry(e.id)}>
                  <Text style={styles.retryText}>{isNe ? 'फेरि' : 'Retry'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.discardBtn} onPress={() => onDiscard(e.id)}>
                  <Text style={styles.discardText}>{isNe ? 'हटाउनुहोस्' : 'Discard'}</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 },
  card: { backgroundColor: T.surface, borderRadius: 16, padding: 18, maxHeight: '80%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  title: { flex: 1, fontSize: 17, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  sub: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginBottom: 12, lineHeight: 18 },
  list: { flexGrow: 0 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: T.redLight, borderRadius: 10, padding: 10 },
  rowTitle: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: T.text },
  rowSub: { fontSize: 12, fontFamily: FONT.regular, color: T.redDark, marginTop: 2 },
  retryBtn: { backgroundColor: T.blue, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  retryText: { color: '#fff', fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
  discardBtn: { borderWidth: 1, borderColor: T.red, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  discardText: { color: T.red, fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600' },
});
