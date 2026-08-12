import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, FlatList } from 'react-native';
import { T } from '../theme';

/** Reusable modal dropdown picker (matches the app's chip/picker style). */
export default function Dropdown({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.dropdown} onPress={() => setOpen(true)}>
        <Text style={value ? styles.dropdownText : styles.dropdownPlaceholder}>
          {value || placeholder || 'Select…'}
        </Text>
        <Text style={styles.dropdownIcon}>▾</Text>
      </TouchableOpacity>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <View style={styles.dropdownModal}>
            <Text style={styles.dropdownTitle}>{label}</Text>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[styles.dropdownOption, value === item && styles.dropdownOptionActive]}
                  onPress={() => { onChange(item); setOpen(false); }}
                >
                  <Text style={[styles.dropdownOptionText, value === item && styles.dropdownOptionActiveText]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: T.text, marginBottom: 6, marginTop: 10 },
  dropdown: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: T.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: T.border },
  dropdownText: { fontSize: 15, color: T.text },
  dropdownPlaceholder: { fontSize: 15, color: T.muted },
  dropdownIcon: { fontSize: 16, color: T.muted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  dropdownModal: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '70%' },
  dropdownTitle: { fontSize: 16, fontWeight: '700', color: T.text, textAlign: 'center', marginBottom: 12 },
  dropdownOption: { padding: 14, borderRadius: 8, marginVertical: 2 },
  dropdownOptionActive: { backgroundColor: T.blueLight },
  dropdownOptionText: { fontSize: 15, color: T.text },
  dropdownOptionActiveText: { color: T.blue, fontWeight: '700' },
});
