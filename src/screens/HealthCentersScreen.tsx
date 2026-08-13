import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Linking, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { cacheGet, cacheSet } from '../utils/cache';
import EmptyState from '../components/EmptyState';
import type { Hospital } from '../types';
import { FONT, T } from '../theme';

const CACHE_KEY = '@t1d_hospitals';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export default function HealthCentersScreen({ route }: any) {
  const patientId = route?.params?.patientId;
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
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
        // Serve from 24h cache first, then refresh from network.
        const cached = await cacheGet<Hospital[]>(CACHE_KEY, CACHE_TTL_MS);
        if (cached && cached.length) { setHospitals(cached); setLoading(false); }
        const { data } = await supabase.from('hospitals').select('*').order('region').limit(300);
        if (data && data.length) { setHospitals(data); await cacheSet(CACHE_KEY, data); }
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

  if (loading && hospitals.length === 0) return <View style={styles.centered}><ActivityIndicator size="large" color={T.blue} /></View>;

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>{isNe ? 'नजिकको स्वास्थ्य केन्द्र' : 'Find Care Near Me'}</Text>

      {patientId && (
        <View style={styles.viewToggle}>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'assigned' && styles.toggleActive]} onPress={() => setViewMode('assigned')}>
            <Text style={[styles.toggleText, viewMode === 'assigned' && styles.toggleActiveText]}>{isNe ? 'मेरो अस्पताल' : 'My Hospital'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, viewMode === 'all' && styles.toggleActive]} onPress={() => setViewMode('all')}>
            <Text style={[styles.toggleText, viewMode === 'all' && styles.toggleActiveText]}>{isNe ? 'सबै केन्द्र' : 'All Centers'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {hospitals.length === 0 ? (
        <EmptyState
          icon="leaf"
          title={isNe ? 'कुनै स्वास्थ्य केन्द्र भेटिएन' : 'No health centers found'}
          message={viewMode === 'assigned'
            ? (isNe ? 'यस बिरामीलाई अझै अस्पताल तोकिएको छैन।' : 'No hospital is assigned to this patient yet.')
            : (isNe ? 'डाटाबेसमा कुनै ज्ञात केन्द्र छैन।' : 'No known health centers in the database.')}
        />
      ) : (
        <FlatList
          data={hospitals}
          keyExtractor={(h) => h.id}
          contentContainerStyle={styles.list}
          renderItem={({ item: h }) => (
            <View style={styles.card}>
              {viewMode === 'assigned' && (
                <View style={styles.assignedBadge}>
                  <Ionicons name="location" size={10} color={T.blue} />
                  <Text style={styles.assignedText}>{isNe ? 'तपाईंको अस्पताल' : 'YOUR HOSPITAL'}</Text>
                </View>
              )}
              <Text style={styles.hospitalName}>{h.name}</Text>
              <Text style={styles.detail}>{h.address}</Text>
              <Text style={styles.region}>{h.region}</Text>
              {h.source === 'manually_added' && (
                <Text style={styles.sourceBadge}>
                  <Ionicons name="checkmark-circle" size={12} color="#34a853" /> {isNe ? 'प्रमाणित' : 'Verified'}
                </Text>
              )}
              <View style={styles.actionRow}>
                {h.phone && (
                  <TouchableOpacity style={styles.callBtn} onPress={() => Linking.openURL(`tel:${h.phone}`)}>
                    <Ionicons name="call" size={14} color="#fff" />
                    <Text style={styles.callText}>{isNe ? 'कल' : 'Call'}</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity style={styles.dirBtn} onPress={() => openDirections(h)}>
                  <Ionicons name="navigate" size={14} color="#fff" />
                  <Text style={styles.dirText}>{isNe ? 'दिशा' : 'Directions'}</Text>
                </TouchableOpacity>
              </View>
              {h.latitude && h.longitude && (
                <Text style={styles.coords}>{h.latitude.toFixed(4)}, {h.longitude.toFixed(4)}</Text>
              )}
            </View>
          )}
        />
      )}
      <Text style={styles.smallNote}>{t('disclaimer')}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, padding: 20, paddingTop: 10 },
  viewToggle: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16 },
  toggleBtn: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 8, backgroundColor: T.surface, borderWidth: 1, borderColor: T.border },
  toggleActive: { backgroundColor: T.blue, borderColor: T.blue },
  toggleText: { fontSize: 14, fontFamily: FONT.semibold, color: T.muted, fontWeight: '600' },
  toggleActiveText: { color: '#fff' },
  list: { padding: 20, paddingTop: 0, paddingBottom: 60 },
  empty: { padding: 40, alignItems: 'center' },
  card: { backgroundColor: T.surface, borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: T.border },
  assignedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: T.blueLight, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginBottom: 6 },
  assignedText: { fontSize: 10, fontFamily: FONT.bold, fontWeight: '700', color: T.blue },
  hospitalName: { fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600', color: T.text, marginBottom: 4 },
  detail: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, paddingVertical: 1 },
  region: { fontSize: 12, fontFamily: FONT.regular, color: T.muted, marginBottom: 8 },
  sourceBadge: { fontSize: 11, fontFamily: FONT.semibold, color: '#34a853', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  callBtn: { backgroundColor: T.red, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  callText: { color: '#fff', fontSize: 14, fontFamily: FONT.bold, fontWeight: '700' },
  dirBtn: { backgroundColor: T.blue, borderRadius: 8, paddingVertical: 12, paddingHorizontal: 16, flex: 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dirText: { color: '#fff', fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600' },
  coords: { fontSize: 10, fontFamily: FONT.regular, color: T.muted, marginTop: 6 },
  smallNote: { textAlign: 'center', fontSize: 10, fontFamily: FONT.regular, color: T.muted, padding: 10 },
});
