import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking, ActivityIndicator, Alert } from 'react-native';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import type { Hospital } from '../types';
import { FONT } from '../theme';

export default function HealthCentersScreen({ route }: any) {
  const patientId = route?.params?.patientId;
  const { t } = useLanguage();
  const [hospitals, setHospitals] = useState<Hospital[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'assigned'>('assigned');

  useEffect(() => {
    (async () => {
      setLoading(true);
      if (patientId && viewMode === 'assigned') {
        const { data: ct } = await supabase.from('care_team').select('hospital_id').eq('patient_id', patientId).limit(1).single();
        if (ct?.hospital_id) {
          const { data: h } = await supabase.from('hospitals').select('*').eq('id', ct.hospital_id);
          setHospitals(h || []);
        } else {
          setHospitals([]);
        }
      } else {
        const { data } = await supabase.from('hospitals').select('*').order('region');
        setHospitals(data || []);
      }
      setLoading(false);
    })();
  }, [patientId, viewMode]);

  const openDirections = (h: Hospital) => {
    if (h.latitude && h.longitude) {
      Linking.openURL(`https://maps.google.com/?q=${h.latitude},${h.longitude}(${encodeURIComponent(h.name)})`);
    } else {
      Linking.openURL(`https://maps.google.com/?q=${encodeURIComponent(h.name + ' ' + h.address)}`);
    }
  };

  if (loading) return <View style={styles.centered}><ActivityIndicator size="large" color="#1a73e8" /></View>;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🏥 Find Care Near Me</Text>

      {patientId && (
        <View style={styles.viewToggle}>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'assigned' && styles.toggleActive]} onPress={() => setViewMode('assigned')}>
            <Text style={[styles.toggleText, viewMode === 'assigned' && styles.toggleActiveText]}>My Hospital</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'all' && styles.toggleActive]} onPress={() => setViewMode('all')}>
            <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleActiveText]}>All Centers</Text>
          </TouchableOpacity>
        </View>
      )}

      {hospitals.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>No health centers found</Text>
          <Text style={styles.emptyText}>
            {viewMode === 'assigned' ? 'No hospital is assigned to this patient yet.' : 'No known health centers in the database.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: h }) => (
            <View style={styles.card}>
              {viewMode === 'assigned' && <View style={styles.assignedBadge}><Text style={styles.assignedText}>📍 YOUR HOSPITAL</Text></View>}
              <Text style={styles.hospitalName}>{h.name}</Text>
              <Text style={styles.detail}>{h.address}</Text>
              <Text style={styles.region}>{h.region}</Text>
              {h.source === 'manually_added' && <Text style={styles.sourceBadge}>✓ Verified</Text>}
              <View style={styles.actionRow}>
                {h.phone && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${h.phone}`)}>
                    <Text style={styles.callText}>📞 Call</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dirBtn} onPress={() => openDirections(h)}>
                  <Text style={styles.dirText}>🗺️ Directions</Text>
                </TouchableOpacity>
              </View>
              {h.latitude && h.longitude && (
                <Text style={styles.coords}>📍 {h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</Text>
              )}
            </View>
          )}
        />
      )}
      <Text style={styles.smallNote}>{t('disclaimer')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', padding: 20, paddingTop: 90 },
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16 },
  toggleBtn: { flex: 1, padding: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#e8eaed' },
  toggleActive: { backgroundColor: '#1a73e8' },
  toggleText: { fontSize: 14, fontFamily: FONT.semibold, color: '#3c4043', fontWeight: '600' },
  toggleActiveText: { color: '#fff' },
  list: { padding: 20, paddingTop: 0 },
  empty: { padding: 40, alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  emptyText: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', textAlign: 'center', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#e8eaed' },
  assignedBadge: { backgroundColor: '#e8f0fe', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  assignedText: { fontSize: 10, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8' },
  hospitalName: { fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 4 },
  detail: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', paddingVertical: 1 },
  region: { fontSize: 12, fontFamily: FONT.regular, color: '#80868b', marginBottom: 8 },
  sourceBadge: { fontSize: 11, fontFamily: FONT.semibold, color: '#34a853', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  callBtn: { backgroundColor: '#ea4335', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  callText: { color: '#fff', fontSize: 14, fontFamily: FONT.bold, fontWeight: '700' },
  dirBtn: { backgroundColor: '#1a73e8', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 16, flex: 1, alignItems: 'center' },
  dirText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  coords: { fontSize: 10, fontFamily: FONT.regular, color: '#80868b', marginTop: 6 },
  smallNote: { textAlign: 'center', fontSize: 10, fontFamily: FONT.regular, color: '#5f6368', padding: 10 },
});
