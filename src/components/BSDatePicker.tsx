import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import NepaliDate from 'nepali-date-converter';
import { Ionicons } from '@expo/vector-icons';
import { FONT } from '../theme';

interface BSDatePickerProps {
  value: string; // AD ISO string for storage
  onChange: (adDate: string, bsDate: string) => void;
  label?: string;
}

// Generate BS year, month, day lists
const currentBS = new NepaliDate();
const YEARS = Array.from({ length: 50 }, (_, i) => currentBS.getYear() - 30 + i);
const MONTHS = [
  { num: 1, name: 'Baishakh', name_ne: 'बैशाख' },
  { num: 2, name: 'Jestha', name_ne: 'जेष्ठ' },
  { num: 3, name: 'Ashadh', name_ne: 'आषाढ' },
  { num: 4, name: 'Shrawan', name_ne: 'श्रावण' },
  { num: 5, name: 'Bhadra', name_ne: 'भदौ' },
  { num: 6, name: 'Ashwin', name_ne: 'आश्विन' },
  { num: 7, name: 'Kartik', name_ne: 'कार्तिक' },
  { num: 8, name: 'Mangsir', name_ne: 'मंसिर' },
  { num: 9, name: 'Poush', name_ne: 'पौष' },
  { num: 10, name: 'Magh', name_ne: 'माघ' },
  { num: 11, name: 'Falgun', name_ne: 'फाल्गुण' },
  { num: 12, name: 'Chaitra', name_ne: 'चैत्र' },
];

const DAYS = Array.from({ length: 32 }, (_, i) => i + 1);

export default function BSDatePicker({ value, onChange, label }: BSDatePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  // Parse existing AD date to BS for display
  let bsYear = currentBS.getYear() - 10;
  let bsMonth = 1;
  let bsDay = 1;
  const hasValue = !!value;

  if (value) {
    try {
      const adDate = new Date(value);
      const bsDate = new NepaliDate(adDate);
      bsYear = bsDate.getYear();
      bsMonth = bsDate.getMonth() + 1;
      bsDay = bsDate.getDate();
    } catch { /* use defaults */ }
  }

  const [selectedYear, setSelectedYear] = useState(bsYear);
  const [selectedMonth, setSelectedMonth] = useState(bsMonth);
  const [selectedDay, setSelectedDay] = useState(bsDay);

  const displayText = hasValue ? formatBSDisplay(bsYear, bsMonth, bsDay) : null;

  const confirm = () => {
    try {
      const bsDate = new NepaliDate(selectedYear, selectedMonth - 1, selectedDay);
      const adDate = bsDate.toJsDate();
      const adIso = adDate.toISOString().split('T')[0];
      onChange(adIso, `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
    } catch {
      // Invalid date combo - try with last day of month
      try {
        const bsDate = new NepaliDate(selectedYear, selectedMonth - 1, Math.min(selectedDay, 30));
        const adDate = bsDate.toJsDate();
        const adIso = adDate.toISOString().split('T')[0];
        onChange(adIso, `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`);
      } catch {}
    }
    setModalVisible(false);
  };

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <TouchableOpacity style={styles.pickerBtn} onPress={() => setModalVisible(true)}>
        <Text style={displayText ? styles.pickerText : styles.pickerPlaceholder}>
          {displayText || 'Select date'}
        </Text>
        <Ionicons name="calendar-outline" size={20} color="#5f6368" />
      </TouchableOpacity>

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Date (Bikram Sambat)</Text>
            <Text style={styles.modalSubtitle}>मिति छान्नुहोस्</Text>

            <View style={styles.pickers}>
              {/* Year */}
              <View style={styles.column}>
                <Text style={styles.colTitle}>Year</Text>
                <ScrollView style={styles.colScroll}>
                  {YEARS.map(y => (
                    <TouchableOpacity key={y} style={[styles.option, selectedYear === y && styles.selected]} onPress={() => setSelectedYear(y)}>
                      <Text style={[styles.optionText, selectedYear === y && styles.selectedText]}>{y}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Month */}
              <View style={styles.column}>
                <Text style={styles.colTitle}>Month</Text>
                <ScrollView style={styles.colScroll}>
                  {MONTHS.map(m => (
                    <TouchableOpacity key={m.num} style={[styles.option, selectedMonth === m.num && styles.selected]} onPress={() => setSelectedMonth(m.num)}>
                      <Text style={[styles.optionText, selectedMonth === m.num && styles.selectedText]}>{m.num} ({m.name_ne})</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Day */}
              <View style={styles.column}>
                <Text style={styles.colTitle}>Day</Text>
                <ScrollView style={styles.colScroll}>
                  {DAYS.map(d => (
                    <TouchableOpacity key={d} style={[styles.option, selectedDay === d && styles.selected]} onPress={() => setSelectedDay(d)}>
                      <Text style={[styles.optionText, selectedDay === d && styles.selectedText]}>{d}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <Text style={styles.preview}>Selected: {formatBSDisplay(selectedYear, selectedMonth, selectedDay)}</Text>

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={confirm}>
                <Text style={styles.confirmText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function formatBSDisplay(year: number, month: number, day: number): string {
  const m = MONTHS[month - 1];
  return `${m ? m.name : ''} ${day}, ${year} BS`;
}

const styles = StyleSheet.create({
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 6, marginTop: 10 },
  pickerBtn: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#dadce0' },
  pickerText: { fontSize: 15, fontFamily: FONT.regular, color: '#202124' },
  pickerPlaceholder: { fontSize: 15, fontFamily: FONT.regular, color: '#9aa0a6' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalTitle: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', textAlign: 'center' },
  modalSubtitle: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', textAlign: 'center', marginBottom: 16 },
  pickers: { flexDirection: 'row', gap: 8 },
  column: { flex: 1 },
  colTitle: { fontSize: 12, fontFamily: FONT.bold, fontWeight: '700', color: '#5f6368', textAlign: 'center', marginBottom: 4 },
  colScroll: { maxHeight: 200 },
  option: { padding: 10, alignItems: 'center', marginVertical: 1, borderRadius: 6 },
  selected: { backgroundColor: '#1a73e8' },
  optionText: { fontSize: 14, fontFamily: FONT.regular, color: '#202124' },
  selectedText: { color: '#fff', fontWeight: '600' },
  preview: { textAlign: 'center', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#1a73e8', paddingVertical: 12 },
  btnRow: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, borderRadius: 10, padding: 14, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e8eaed' },
  confirmBtn: { backgroundColor: '#1a73e8' },
  cancelText: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#3c4043' },
  confirmText: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#fff' },
});
