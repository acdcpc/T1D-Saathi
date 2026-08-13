// Barcode scanner for packaged foods → nutrition lookup via OpenFoodFacts (free, no key).
import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { usePatient } from '../context/PatientContext';
import { FONT, T, card } from '../theme';

interface FoodResult {
  name: string;
  brand?: string;
  carbs100g?: number;
  kcal100g?: number;
  barcode: string;
}

export default function BarcodeScannerScreen({ navigation }: any) {
  const patient = usePatient();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FoodResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (barcode: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`);
      const json = await res.json();
      const p = json?.product;
      if (!p) {
        setError(isNe ? 'उत्पादन भेटिएन' : 'Product not found');
        setResult(null);
      } else {
        setResult({
          name: p.product_name || p.generic_name || barcode,
          brand: p.brands,
          carbs100g: p.nutriments?.carbohydrates_100g,
          kcal100g: p.nutriments?.['energy-kcal_100g'],
          barcode,
        });
      }
    } catch (e: any) {
      setError((isNe ? 'लुकअप असफल: ' : 'Lookup failed: ') + (e?.message || 'network'));
    } finally {
      setLoading(false);
    }
  }, [isNe]);

  const onScanned = useCallback(
    ({ data }: { data: string }) => {
      if (!scanning) return;
      setScanning(false);
      lookup(data);
    },
    [scanning, lookup]
  );

  if (!permission) {
    return <View style={styles.centered}><ActivityIndicator size="large" color={T.blue} /></View>;
  }
  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.centered}>
          <Ionicons name="barcode-outline" size={56} color={T.muted} />
          <Text style={styles.title}>{isNe ? 'क्यामेरा अनुमति आवश्यक' : 'Camera permission needed'}</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryText}>{isNe ? 'अनुमति दिनुहोस्' : 'Grant permission'}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={12} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={22} color={T.text} />
        </TouchableOpacity>
        <Text style={styles.title}>{isNe ? 'बारकोड स्क्यान' : 'Scan Barcode'}</Text>
        <View style={{ width: 30 }} />
      </View>

      <View style={styles.cameraWrap}>
        <CameraView
          style={styles.camera}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
          onBarcodeScanned={onScanned}
        />
        <View style={styles.overlay}>
          <View style={styles.frame} />
        </View>
      </View>

      <ScrollView style={styles.results} contentContainerStyle={{ padding: 16 }}>
        {loading ? (
          <ActivityIndicator color={T.blue} style={{ marginTop: 20 }} />
        ) : error ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => { setScanning(true); setError(null); setResult(null); }}
            >
              <Text style={styles.secondaryText}>{isNe ? 'फेरि स्क्यान' : 'Scan again'}</Text>
            </TouchableOpacity>
          </View>
        ) : result ? (
          <View style={styles.card}>
            <Text style={styles.foodName}>{result.name}</Text>
            {result.brand ? <Text style={styles.brand}>{result.brand}</Text> : null}
            <View style={styles.nutRow}>
              <View style={styles.nutTile}>
                <Text style={styles.nutValue}>{result.carbs100g != null ? `${result.carbs100g}g` : '—'}</Text>
                <Text style={styles.nutLabel}>{isNe ? 'कार्ब / १०० ग्राम' : 'Carbs / 100g'}</Text>
              </View>
              <View style={styles.nutTile}>
                <Text style={styles.nutValue}>{result.kcal100g != null ? `${Math.round(result.kcal100g)}` : '—'}</Text>
                <Text style={styles.nutLabel}>{isNe ? 'क्यालोरी / १०० ग्राम' : 'kcal / 100g'}</Text>
              </View>
            </View>
            <Text style={styles.srcNote}>{isNe ? 'स्रोत: OpenFoodFacts (नि:शुल्क)' : 'Source: OpenFoodFacts (free)'}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => { setScanning(true); setResult(null); }}
            >
              <Text style={styles.primaryText}>{isNe ? 'अर्को स्क्यान' : 'Scan another'}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <Text style={styles.hint}>
            {isNe ? 'प्याकेजको बारकोडमा क्यामेरा देखाउनुहोस्।' : 'Point the camera at a packaged food barcode.'}
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 8 },
  title: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  cameraWrap: { height: 260, marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', backgroundColor: '#000' },
  camera: { flex: 1 },
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 220, height: 140, borderWidth: 3, borderColor: '#fff', borderRadius: 12 },
  results: { flex: 1 },
  hint: { textAlign: 'center', color: T.muted, fontSize: 14, fontFamily: FONT.regular, marginTop: 16 },
  card: { ...card },
  foodName: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700', color: T.text },
  brand: { fontSize: 13, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },
  nutRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  nutTile: { flex: 1, backgroundColor: T.blueLight, borderRadius: 12, padding: 14, alignItems: 'center' },
  nutValue: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.blueDark },
  nutLabel: { fontSize: 11, fontFamily: FONT.semibold, color: T.blueDark, marginTop: 2, textAlign: 'center', fontWeight: '600' },
  srcNote: { fontSize: 11, fontFamily: FONT.regular, color: T.muted, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  primaryBtn: { backgroundColor: T.blue, borderRadius: 28, paddingVertical: 13, alignItems: 'center', marginTop: 14 },
  primaryText: { color: '#fff', fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
  secondaryBtn: { borderWidth: 1, borderColor: T.blue, borderRadius: 28, paddingVertical: 12, alignItems: 'center', marginTop: 12 },
  secondaryText: { color: T.blue, fontSize: 15, fontFamily: FONT.semibold, fontWeight: '600' },
  errorCard: { ...card, alignItems: 'center' },
  errorText: { color: T.red, fontSize: 14, fontFamily: FONT.regular, textAlign: 'center' },
});
