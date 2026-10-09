import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { FONT, T, input } from '../theme';
import GradientButton from '../components/GradientButton';

/**
 * Shown when the app receives a password-recovery link
 * (com.t1dsaathi.app://auth/callback#...&type=recovery).
 * The recovery session is already active (AuthContext); the user picks a new password.
 */
export default function ResetPasswordScreen() {
  const { clearRecovery } = useAuth();
  const { language } = useLanguage();
  const isNe = language === 'ne';
  const insets = useSafeAreaInsets();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!password.trim() || password.length < 6) {
      setError(isNe ? 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ' : 'Password must be at least 6 characters');
      return;
    }
    if (confirm !== password) {
      setError(isNe ? 'पासवर्डहरू मिलेनन्' : 'Passwords do not match');
      return;
    }
    setSaving(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updErr) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', updErr.message);
      return;
    }
    Alert.alert(
      isNe ? 'पासवर्ड अपडेट भयो' : 'Password updated',
      isNe ? 'नयाँ पासवर्ड सेट भयो। अब एप प्रयोग गर्न सक्नुहुन्छ।' : 'Your new password is set. You can continue using the app.',
    );
    clearRecovery();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: T.bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={[styles.card, { marginBottom: Math.max(insets.bottom ?? 0, 24) }]}>
        <Text style={styles.title}>{isNe ? 'नयाँ पासवर्ड सेट गर्नुहोस्' : 'Set a new password'}</Text>
        <Text style={styles.sub}>{isNe ? 'कम्तिमा ६ अक्षरको नयाँ पासवर्ड लेख्नुहोस्।' : 'Choose a new password (at least 6 characters).'}</Text>
        <TextInput
          style={[styles.field, error && styles.fieldError, { color: T.text }]}
          placeholder={isNe ? 'नयाँ पासवर्ड' : 'New password'}
          accessibilityLabel={isNe ? 'नयाँ पासवर्ड' : 'New password'}
          value={password}
          onChangeText={(v) => { setPassword(v); if (error) setError(null); }}
          secureTextEntry
          textContentType="newPassword"
          placeholderTextColor={T.muted}
        />
        <TextInput
          style={[styles.field, error && styles.fieldError, { color: T.text }]}
          placeholder={isNe ? 'पासवर्ड पुनः लेख्नुहोस्' : 'Confirm new password'}
          accessibilityLabel={isNe ? 'पासवर्ड पुनः लेख्नुहोस्' : 'Confirm new password'}
          value={confirm}
          onChangeText={(v) => { setConfirm(v); if (error) setError(null); }}
          secureTextEntry
          textContentType="newPassword"
          placeholderTextColor={T.muted}
        />
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <GradientButton label={isNe ? 'पासवर्ड सेभ गर्नुहोस्' : 'Save new password'} onPress={handleSave} loading={saving} />
        <TouchableOpacity onPress={clearRecovery} accessibilityRole="button">
          <Text style={styles.cancelText}>{isNe ? 'रद्द गर्नुहोस्' : 'Cancel'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%', maxWidth: 400, backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24,
    borderWidth: 1, borderColor: T.border,
  },
  title: { fontSize: 22, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text, marginBottom: 8 },
  sub: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginBottom: 16, lineHeight: 20 },
  field: { ...input, marginBottom: 12 },
  fieldError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginBottom: 8 },
  cancelText: { color: T.muted, textAlign: 'center', fontSize: 14, fontFamily: FONT.regular, paddingVertical: 12, marginTop: 6 },
});
