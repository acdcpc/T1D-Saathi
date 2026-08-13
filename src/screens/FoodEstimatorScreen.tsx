import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import ISPADBadge from '../components/ISPADBadge';
import { useAuth } from '../context/AuthContext';
import { usePatient } from '../context/PatientContext';
import { speak } from '../utils/speech';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { safeInsert } from '../utils/offlineQueue';
import { searchNepaliFoods, NEPALI_FOODS } from '../data/nepaliFoods';
import { classifyFoodPhoto, type ModelSuggestion, type ModelResult } from '../utils/foodModelClassifier';
import { calculateDosing, checkMealCoverage } from '../utils/dosingCalc';
import {
  adjustItemPortion, recalculateTotals,
  validateCalories, type FoodItem, type MealEstimateResult,
} from '../utils/visionEstimator';
import type { InsulinRegimen } from '../types';
import { FONT } from '../theme';

type Step = 'photo' | 'identify' | 'dosing';

const PORTIONS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];
const PORTION_LABELS: Record<number, string> = {
  0.25: '¼', 0.5: '½', 0.75: '¾', 1: '1', 1.25: '1¼', 1.5: '1½', 2: '2',
};

export default function FoodEstimatorScreen({ route }: any) {
  const patientId = (route.params as any)?.patientId || usePatient()?.id || '';
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('photo');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [regimen, setRegimen] = useState<InsulinRegimen | null>(null);
  const [dosingSettings, setDosingSettings] = useState<any>(null);
  const [notApproved, setNotApproved] = useState(false);
  const [currentGlucose, setCurrentGlucose] = useState('');
  const [plannedInsulin, setPlannedInsulin] = useState('');

  // Estimate state
  const [estimate, setEstimate] = useState<MealEstimateResult | null>(null);
  const [items, setItems] = useState<FoodItem[]>([]);
  const [totals, setTotals] = useState({ total_carbs_g: 0, total_protein_g: 0, total_fat_g: 0, total_calories: 0 });

  // Manual search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  // Dosing state
  const [dosingResult, setDosingResult] = useState<any>(null);
  const [coverageCheck, setCoverageCheck] = useState<any>(null);
  const [modelSuggestions, setModelSuggestions] = useState<ModelSuggestion[]>([]);
  const [modelLoading, setModelLoading] = useState(false);
  const [modelError, setModelError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [{ data: reg }, { data: ds }] = await Promise.all([
        supabase
          .from('insulin_regimens').select('*')
          .eq('patient_id', patientId).order('effective_date', { ascending: false }).limit(1).single(),
        supabase
          .from('dosing_settings').select('*')
          .eq('patient_id', patientId).maybeSingle(),
      ]);
      setRegimen(reg);
      setDosingSettings(ds);
    })();
  }, [patientId]);

  // ─── Photo capture ───
  // Compress + resize before ML inference and any upload (max 1024px, JPEG q0.7).
  const compressImage = async (uri: string): Promise<string> => {
    try {
      const res = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );
      return res.uri;
    } catch {
      return uri; // fall back to original on any failure
    }
  };

  const pickImage = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setImageUri(await compressImage(r.assets[0].uri)); }
  };

  const takePhoto = async () => {
    const p = await ImagePicker.requestCameraPermissionsAsync();
    if (!p.granted) return Alert.alert('Permission needed', 'Camera access required');
    const r = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 0.8 });
    if (!r.canceled && r.assets[0]) { setImageUri(await compressImage(r.assets[0].uri)); }
  };

  // ─── Vision pipeline ───
  const goToIdentify = async () => {
    if (!imageUri) return;
    setItems([]);
    setTotals({ total_carbs_g: 0, total_protein_g: 0, total_fat_g: 0, total_calories: 0 });
    setModelSuggestions([]);
    setModelError(null);
    setStep('identify');

    // Run on-device TFLite food classifier
    setModelLoading(true);
    try {
      const result = await classifyFoodPhoto(imageUri);
      setModelSuggestions(result.suggestions);
      if (result.suggestions.length === 0 && result.topLabels.length === 0) {
        setModelError('No food recognized — try searching below');
      }
    } catch (err) {
      setModelError('Classifier unavailable — use search below');
    }
    setModelLoading(false);
  };

  const skipPhoto = () => {
    setImageUri(null);
    setItems([]);
    setTotals({ total_carbs_g: 0, total_protein_g: 0, total_fat_g: 0, total_calories: 0 });
    setStep('identify');
  };

  // ─── Item editing ───
  const updateItemPortion = (index: number, portionMult: number) => {
    const newItems = [...items];
    const item = newItems[index];
    if (!item) return;
    const baseGrams = item.matched_local_item?.typical_portion_g || item.portion_grams;
    const newGrams = Math.round(baseGrams * portionMult);
    newItems[index] = adjustItemPortion(item, newGrams);
    setItems(newItems);
    setTotals(recalculateTotals(newItems));
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
    if (newItems.length === 0) {
      setTotals({ total_carbs_g: 0, total_protein_g: 0, total_fat_g: 0, total_calories: 0 });
    } else {
      setTotals(recalculateTotals(newItems));
    }
  };

  // ─── Manual food search ───
  const searchFoods = (q: string) => {
    setSearchQuery(q);
    setSearchResults(q.length >= 2 ? searchNepaliFoods(q) : []);
  };

  const addManualFood = (food: any) => {
    const newItem: FoodItem = {
      food_name: food.name,
      matched_local_item: food,
      portion_desc: `${food.typical_portion_g}g`,
      portion_grams: food.typical_portion_g,
      carbs_g: food.carbs_g,
      protein_g: food.protein_g,
      fat_g: food.fat_g,
      calories: food.calories,
      confidence: 'high',
      source: 'manual',
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setTotals(recalculateTotals(newItems));
    setSearchQuery('');
    setSearchResults([]);
  };

  // ─── Add a model suggestion as a real food item ───
  const addModelSuggestion = (suggestion: ModelSuggestion) => {
    const food = suggestion.item;
    const newItem: FoodItem = {
      food_name: food.name,
      matched_local_item: food,
      portion_desc: `${food.typical_portion_g}g`,
      portion_grams: food.typical_portion_g,
      carbs_g: food.carbs_g,
      protein_g: food.protein_g,
      fat_g: food.fat_g,
      calories: food.calories,
      confidence: suggestion.confidence > 0.7 ? 'high' : suggestion.confidence > 0.4 ? 'medium' : 'low',
      source: 'on_device',
    };
    const newItems = [...items, newItem];
    setItems(newItems);
    setTotals(recalculateTotals(newItems));
  };

  // ─── Confirm & dose ───
  const runCalculation = async (approved: boolean) => {
    const gVal = parseFloat(currentGlucose);
    const tddVal = regimen?.tdd || 40;
    const target = regimen?.correction_target || 120;

    const dosing = calculateDosing(isNaN(gVal) ? target : gVal, totals.total_carbs_g, {
      tdd: tddVal,
      icr_constant: 500,
      isf_constant: 1800,
      target_glucose: target,
    });

    const planned = parseFloat(plannedInsulin) || 0;
    const coverage = checkMealCoverage(totals.total_carbs_g, totals.total_calories, planned || dosing.mealBolus, dosing.icr);

    setDosingResult(dosing);
    setCoverageCheck(coverage);

    // Save meal log with confirmed data (corrected from estimate if edited)
    const confirmedData = {
      patient_id: patientId,
      user_id: user?.id,
      carbs_g: totals.total_carbs_g,
      protein_g: totals.total_protein_g,
      fat_g: totals.total_fat_g,
      calories: totals.total_calories,
      confidence: estimate?.overall_confidence || 'medium',
      confirmed_by_user: true,
      items: items.map(i => ({
        food_name: i.food_name,
        portion_desc: i.portion_desc,
        portion_grams: i.portion_grams,
        carbs_g: i.carbs_g,
        protein_g: i.protein_g,
        fat_g: i.fat_g,
        calories: i.calories,
        confidence: i.confidence,
        source: i.source,
      })),
      original_estimate: estimate ? {
        total_carbs_g: estimate.total_carbs_g,
        total_protein_g: estimate.total_protein_g,
        total_fat_g: estimate.total_fat_g,
        total_calories: estimate.total_calories,
        items: estimate.items,
      } : null,
      corrected_estimate: totals.total_carbs_g !== (estimate?.total_carbs_g ?? 0)
        ? { total_carbs_g: totals.total_carbs_g, total_protein_g: totals.total_protein_g, total_fat_g: totals.total_fat_g, total_calories: totals.total_calories }
        : null,
      timestamp: new Date().toISOString(),
    };

    const { online, error } = await safeInsert('meal_logs', confirmedData);
    if (error) console.error('save error:', error);

    setNotApproved(!approved);
    setStep('dosing');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    speak(language === 'ne' ? `कुल सुझाव गरिएको डोज ${dosing.totalDose} युनिट` : `Total suggested dose ${dosing.totalDose} units`, language);
  };

  const confirmAndCalculate = () => {
    const approved = dosingSettings?.approved_by_clinician === true;
    if (!approved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Starting dose — not clinician-approved',
        'These doses are auto-calculated from Total Daily Dose using standard ISPAD rules (500/1800). They have not been reviewed by a clinician.\n\nContinue with the estimated dose?',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Continue', onPress: () => runCalculation(false) },
        ]
      );
      return;
    }
    runCalculation(true);
  };

  // ═══ RENDER: Step 1 — Photo ═══
  if (step === 'photo') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <Text style={s.title}>🍽️ Food Photo Estimator</Text>
        <Text style={s.hint}>Take a clear photo of the meal. For best results, center the plate and include the plate edge.</Text>

        {imageUri && <Image source={{ uri: imageUri }} style={s.preview} />}

        <View style={s.row}>
          <TouchableOpacity style={s.primaryBtn} onPress={takePhoto}>
            <Text style={s.primaryText}>Take Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.primaryBtn, s.secondaryBtn]} onPress={pickImage}>
            <Text style={s.secondaryText}>🖼️ Gallery</Text>
          </TouchableOpacity>
        </View>

        {imageUri && (
          <TouchableOpacity style={[s.primaryBtn, s.identifyBtn]} onPress={goToIdentify} disabled={loading}>
            <Text style={s.primaryText}>📝 Identify Foods</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={s.skipBtn} onPress={skipPhoto}>
          <Text style={s.skipText}>Skip photo — enter food manually</Text>
        </TouchableOpacity>
        <Text style={s.disclaimer}>Photo estimates are approximate. Always review before using for insulin math.</Text>
      </ScrollView>
    );
  }



  // ═══ RENDER: Step 2 — Identify foods from photo ═══
  if (step === 'identify') {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <Text style={s.title}>🍽️ What foods are on this plate?</Text>
        <ISPADBadge />

        {modelLoading && (
          <View style={s.modelLoadingRow}>
            <ActivityIndicator size="small" color="#1a73e8" />
            <Text style={s.modelLoadingText}>Analyzing photo…</Text>
          </View>
        )}
        {modelError && (
          <View style={s.modelErrorRow}><Text style={s.modelErrorText}>{modelError}</Text></View>
        )}
        {modelSuggestions.length > 0 && (
          <View style={s.modelSuggestionsCard}>
            <Text style={s.modelSuggestionsTitle}>Suggested foods from your photo</Text>
            <Text style={s.modelSuggestionsSubtitle}>Tap a food to add it to the meal. Estimates are approximate — adjust the portion below.</Text>
            <View style={s.modelChips}>
              {modelSuggestions.map((sug, i) => (
                <TouchableOpacity
                  key={i}
                  style={[s.modelChip, sug.confidence > 0.6 ? s.modelChipHigh : s.modelChipMed]}
                  onPress={() => addModelSuggestion(sug)}
                >
                  <Text style={s.modelChipText}>{sug.foodName}</Text>
                  <Text style={s.modelChipMeta}>{Math.round(sug.confidence * 100)}%</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Per-item cards */}
        {items.map((item, idx) => (
          <View key={idx} style={[s.itemCard, item.confidence === 'low' && s.lowConfCard]}>
            <View style={s.itemHeader}>
              <Text style={s.itemName}>{item.food_name}</Text>
              <View style={[s.confBadge, item.confidence === 'high' ? s.confHigh : item.confidence === 'low' ? s.confLow : s.confMed]}>
                <Text style={s.confText}>{item.confidence.toUpperCase()}</Text>
              </View>
              <TouchableOpacity onPress={() => removeItem(idx)}>
                <Text style={s.removeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={s.itemSource}>{item.source === 'local_db' ? '📍 Matched to Nepali foods' : item.source === 'manual' ? '✏️ Manual entry' : '🔍 Vision estimate'}</Text>
            {item.confidence === 'low' && (
              <View style={s.lowConfNote}><Text style={s.lowConfText}>Low confidence — please verify portion & food type</Text></View>
            )}

            {/* Portion stepper */}
            <Text style={s.portionLabel}>Portion: {item.portion_grams}g</Text>
            <Text style={s.portionHint}>¼ = quarter serving · 1 = full serving · 2 = double</Text>
            <View style={s.portionRow}>
              {PORTIONS.map(p => {
                const baseGrams = item.matched_local_item?.typical_portion_g || item.portion_grams;
                const currentMult = baseGrams > 0 ? item.portion_grams / baseGrams : 1;
                const active = Math.abs(currentMult - p) < 0.05;
                return (
                  <TouchableOpacity
                    key={p}
                    style={[s.portionChip, active ? s.portionActive : null]}
                    onPress={() => updateItemPortion(idx, p)}
                  >
                    <Text style={[s.portionChipText, active ? s.portionChipActiveText : null]}>
                      {PORTION_LABELS[p]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Item macros */}
            <View style={s.itemMacros}>
              <Text style={s.macroSmall}>{item.carbs_g}g carbs</Text>
              <Text style={s.macroSmall}>{item.protein_g}g protein</Text>
              <Text style={s.macroSmall}>{item.fat_g}g fat</Text>
              <Text style={s.macroSmall}>{item.calories} kcal</Text>
            </View>

            {/* Calorie validation warning */}
            {(() => {
              const check = validateCalories(item);
              if (!check.valid) {
                return <Text style={s.calWarning}>Calorie mismatch: {item.calories} vs calculated {check.calculated}</Text>;
              }
              return null;
            })()}
          </View>
        ))}

        {/* Meal totals */}
        <View style={s.totalsCard}>
          <Text style={s.totalsTitle}>Meal Total</Text>
          <View style={s.macroGrid}>
            <View style={s.macroBox}><Text style={s.macroValue}>{totals.total_carbs_g}g</Text><Text style={s.macroLabel}>Carbs</Text></View>
            <View style={s.macroBox}><Text style={s.macroValue}>{totals.total_protein_g}g</Text><Text style={s.macroLabel}>Protein</Text></View>
            <View style={s.macroBox}><Text style={s.macroValue}>{totals.total_fat_g}g</Text><Text style={s.macroLabel}>Fat</Text></View>
            <View style={s.macroBox}><Text style={s.macroValue}>{totals.total_calories}</Text><Text style={s.macroLabel}>Calories</Text></View>
          </View>
        </View>

        {/* Manual search */}
        <Text style={s.sectionTitle}>Add more food items:</Text>
        <TextInput style={s.searchInput} value={searchQuery} onChangeText={searchFoods} placeholder="Search Nepali foods (dal bhat, momo, roti...)" />
        {searchResults.map((f, i) => (
          <TouchableOpacity key={i} style={s.searchItem} onPress={() => addManualFood(f)}>
            <View style={{ flex: 1 }}><Text style={s.searchName}>{f.name}</Text><Text style={s.searchMeta}>{f.name_ne} · {f.category}</Text></View>
            <Text style={s.searchCarbs}>{f.carbs_g}g <Text style={s.plus}>+</Text></Text>
          </TouchableOpacity>
        ))}

        {/* Dosing inputs */}
        <Text style={s.label}>{t('currentGlucose')} (mg/dL)</Text>
        <TextInput style={s.glucoseInput} value={currentGlucose} onChangeText={setCurrentGlucose} keyboardType="numeric" placeholder="120" />
        <Text style={s.label}>Planned insulin dose (optional)</Text>
        <TextInput style={s.insulinInput} value={plannedInsulin} onChangeText={setPlannedInsulin} keyboardType="numeric" placeholder="Leave empty for suggestion" />

        <TouchableOpacity style={[s.primaryBtn, s.confirmBtn]} onPress={confirmAndCalculate}>
          <Text style={s.primaryText}>✅ Confirm & Calculate Dose</Text>
        </TouchableOpacity>
        <Text style={s.smallNote}>{t('disclaimer')}</Text>
      </ScrollView>
    );
  }

  // ═══ RENDER: Step 3 — Dosing Results ═══
  if (step === 'dosing' && dosingResult) {
    return (
      <ScrollView style={s.container} contentContainerStyle={[s.content, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40 }]}>
        <Text style={s.title}>Dosing Results</Text>
        <ISPADBadge />

        <View style={s.resultCard}>
          <Text style={s.resultSection}>Your Settings</Text>
          <View style={s.resultRow}><Text style={s.rLabel}>ICR (Carb Ratio)</Text><Text style={s.rValue}>1 unit : {dosingResult.icr}g carbs</Text></View>
          <View style={s.resultRow}><Text style={s.rLabel}>ISF (Correction Factor)</Text><Text style={s.rValue}>1 unit ↓ {dosingResult.isf} mg/dL</Text></View>
        </View>

        <View style={[s.resultCard, s.doseCard]}>
          <Text style={s.resultSection}>Suggested Dose</Text>
          <Text style={s.doseMeal}>Meal: {totals.total_carbs_g}g carbs · {totals.total_calories} kcal</Text>
          <View style={s.resultRow}><Text style={s.rLabel}>Meal Bolus</Text><Text style={s.rValueBold}>{dosingResult.mealBolus} U</Text></View>
          <View style={s.resultRow}><Text style={s.rLabel}>Correction</Text><Text style={s.rValue}>{dosingResult.correctionDose > 0 ? `+ ${dosingResult.correctionDose} U` : '0 U'}</Text></View>
          <View style={s.divider} />
          <View style={s.resultRow}><Text style={s.rLabelBold}>Total Suggested</Text><Text style={s.rTotal}>{dosingResult.totalDose} units</Text></View>
        </View>

        {notApproved && (
          <View style={s.warningCard}>
            <Text style={s.warningTitle}>Not clinician-approved</Text>
            <Text style={s.warningText}>This dose is an auto-calculated starting estimate from TDD. Confirm with your clinician before relying on it.</Text>
          </View>
        )}

        {coverageCheck?.message && (
          <View style={s.warningCard}>
            <Text style={s.warningTitle}>Coverage Warning</Text>
            <Text style={s.warningText}>{coverageCheck.message}</Text>
          </View>
        )}

        {coverageCheck?.highCalorieNote && (
          <View style={s.noteCard}><Text style={s.noteText}>{coverageCheck.highCalorieNote}</Text></View>
        )}

        <View style={s.noteCard}>
          <Text style={s.noteTitle}>📝 Confirmed Meal ({totals.total_carbs_g}g carbs)</Text>
          <Text style={s.noteText}>
            {items.map((i, idx) => `${i.food_name} (${i.carbs_g}g)`).join(', ')}
          </Text>
          <Text style={[s.noteText, { fontSize: 11, fontFamily: FONT.regular, marginTop: 4, fontStyle: 'italic' }]}>
            Dosing is based on user-confirmed, corrected macros — not the raw photo estimate. Estimates are starting suggestions; ratios should be clinician-approved.
          </Text>
        </View>

        <TouchableOpacity style={s.doneBtn} onPress={() => { setImageUri(null); setStep('photo'); setItems([]); setEstimate(null); }}>
          <Text style={s.doneBtnText}>✅ Done — Log Another Meal</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  return null;
}

// ─── Styles ───
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  content: { padding: 20, paddingTop: 60 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 24, fontFamily: FONT.extrabold, fontWeight: '800', color: '#202124', marginBottom: 8 },
  hint: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 20, lineHeight: 20 },
  preview: { width: '100%', height: 250, borderRadius: 12, marginBottom: 16, backgroundColor: '#e8eaed' },
  row: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  primaryBtn: { flex: 1, backgroundColor: '#1a73e8', borderRadius: 12, padding: 16, alignItems: 'center' },
  primaryText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },
  secondaryBtn: { backgroundColor: '#e8eaed' },
  secondaryText: { color: '#3c4043', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },
  skipBtn: { paddingVertical: 14, alignItems: 'center' },
  skipText: { color: '#1a73e8', fontSize: 14, fontFamily: FONT.regular },
  disclaimer: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', textAlign: 'center', marginTop: 10 },

  // Review step
  itemCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#e8eaed' },
  lowConfCard: { borderColor: '#f9ab00', borderWidth: 2, backgroundColor: '#fef7e0' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  itemName: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', flex: 1 },
  confBadge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2, backgroundColor: '#e8eaed' },
  confHigh: { backgroundColor: '#e6f4ea' },
  confMed: { backgroundColor: '#e8eaed' },
  confLow: { backgroundColor: '#fde7d0' },
  confText: { fontSize: 9, fontFamily: FONT.bold, fontWeight: '700', color: '#5f6368' },
  removeBtn: { fontSize: 18, fontFamily: FONT.regular, color: '#ea4335', paddingHorizontal: 4 },
  itemSource: { fontSize: 11, fontFamily: FONT.regular, color: '#80868b', marginBottom: 8 },
  lowConfNote: { backgroundColor: '#fef7e0', borderRadius: 4, padding: 4, marginBottom: 6 },
  lowConfText: { fontSize: 10, fontFamily: FONT.semibold, color: '#e37400', fontWeight: '600' },
  portionLabel: { fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginBottom: 2 },
  portionHint: { fontSize: 10, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 6, fontStyle: 'italic' },
  portionRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  portionChip: { backgroundColor: '#e8eaed', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  portionActive: { backgroundColor: '#1a73e8' },
  portionChipText: { fontSize: 12, fontFamily: FONT.semibold, color: '#3c4043', fontWeight: '600' },
  portionChipActiveText: { color: '#fff' },
  itemMacros: { flexDirection: 'row', gap: 12 },
  macroSmall: { fontSize: 12, fontFamily: FONT.regular, color: '#5f6368' },
  calWarning: { fontSize: 11, fontFamily: FONT.regular, color: '#ea4335', marginTop: 4, fontStyle: 'italic' },

  // Totals
  totalsCard: { backgroundColor: '#e8f0fe', borderRadius: 12, padding: 16, marginVertical: 14, borderWidth: 1, borderColor: '#d2e3fc' },
  totalsTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8', marginBottom: 8 },
  macroGrid: { flexDirection: 'row', gap: 10 },
  macroBox: { flex: 1, backgroundColor: '#fff', borderRadius: 8, padding: 10, alignItems: 'center' },
  macroValue: { fontSize: 20, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8' },
  macroLabel: { fontSize: 10, fontFamily: FONT.regular, color: '#5f6368', marginTop: 2 },

  // Search
  sectionTitle: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginTop: 20, marginBottom: 8 },
  searchInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 15, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0', marginBottom: 8 },
  searchItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 8, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#e8eaed' },
  searchName: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  searchMeta: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368' },
  searchCarbs: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#1a73e8' },
  plus: { color: '#80868b', fontSize: 14, fontFamily: FONT.regular },

  // Dosing inputs
  label: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124', marginTop: 16, marginBottom: 6 },
  glucoseInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 22, fontFamily: FONT.bold, fontWeight: '700', borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  insulinInput: { backgroundColor: '#fff', borderRadius: 10, padding: 12, fontSize: 16, fontFamily: FONT.regular, borderWidth: 1, borderColor: '#dadce0', textAlign: 'center' },
  confirmBtn: { backgroundColor: '#1a73e8', marginTop: 24, marginBottom: 8 },
  smallNote: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', textAlign: 'center', marginTop: 8 },

  // Results
  resultCard: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#e8eaed' },
  doseCard: { borderColor: '#1a73e8', borderWidth: 2 },
  resultSection: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '700', color: '#202124', marginBottom: 10 },
  resultRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rLabel: { fontSize: 14, fontFamily: FONT.regular, color: '#5f6368' },
  rLabelBold: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: '#202124' },
  rValue: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  rValueBold: { fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600', color: '#1a73e8' },
  rTotal: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: '#1a73e8' },
  doseMeal: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 8 },
  divider: { height: 1, backgroundColor: '#e8eaed', marginVertical: 8 },
  warningCard: { backgroundColor: '#fef7e0', borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: '#f9ab00' },
  warningTitle: { fontSize: 16, fontFamily: FONT.bold, fontWeight: '700', color: '#e37400', marginBottom: 8 },
  warningText: { fontSize: 13, fontFamily: FONT.regular, color: '#202124', lineHeight: 18 },
  noteCard: { backgroundColor: '#e8f0fe', borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#d2e3fc' },
  noteTitle: { fontSize: 14, fontFamily: FONT.semibold, fontWeight: '600', color: '#1a73e8', marginBottom: 4 },
  noteText: { fontSize: 12, fontFamily: FONT.regular, color: '#3c4043', lineHeight: 16 },
  doneBtn: { backgroundColor: '#34a853', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 10 },
  doneBtnText: { color: '#fff', fontSize: 17, fontFamily: FONT.semibold, fontWeight: '600' },
  identifyBtn: { backgroundColor: '#1a73e8', marginBottom: 12 },
  modelLoadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, marginBottom: 8 },
  modelLoadingText: { fontSize: 13, fontFamily: FONT.regular, color: '#5f6368', fontStyle: 'italic' },
  modelErrorRow: { backgroundColor: '#fef7e0', borderRadius: 8, padding: 10, marginBottom: 10, borderWidth: 1, borderColor: '#f9ab00' },
  modelErrorText: { fontSize: 12, fontFamily: FONT.regular, color: '#e37400' },
  modelSuggestionsCard: { backgroundColor: '#f0f7ff', borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#d2e3fc' },
  modelSuggestionsTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: '#1a73e8', marginBottom: 2 },
  modelSuggestionsSubtitle: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368', marginBottom: 10, fontStyle: 'italic', lineHeight: 15 },
  modelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  modelChip: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  modelChipHigh: { backgroundColor: '#e8f0fe', borderColor: '#a8c8fa' },
  modelChipMed: { backgroundColor: '#f1f3f4', borderColor: '#dadce0' },
  modelChipText: { fontSize: 13, fontFamily: FONT.semibold, fontWeight: '600', color: '#202124' },
  modelChipMeta: { fontSize: 11, fontFamily: FONT.regular, color: '#5f6368' },
  photoRefCard: { backgroundColor: '#e8f0fe', borderRadius: 12, padding: 12, marginBottom: 14, borderWidth: 1, borderColor: '#d2e3fc', alignItems: 'center' },
  photoRefImg: { width: '100%', height: 160, borderRadius: 8, marginBottom: 8, backgroundColor: '#e8eaed' },
  photoRefLabel: { fontSize: 12, fontFamily: FONT.semibold, color: '#1a73e8', fontWeight: '600' },
suggestionsTitle: { fontSize: 14, fontFamily: FONT.bold, fontWeight: '700', color: '#5f6368', marginBottom: 8 },
colorSwatch: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: '#c4c4c4' },
});
