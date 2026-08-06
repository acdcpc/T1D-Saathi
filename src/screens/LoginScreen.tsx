import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(t('error'), 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = isSignup
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert(t('error'), error.message);
  };

  const handleGuest = async () => {
    setLoading(true);
    await signInAsGuest();
    setLoading(false);
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appName}>{t('appName')}</Text>
          <Text style={styles.tagline}>{t('tagline')}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            style={styles.input}
            placeholder={t('email')}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder={t('password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{isSignup ? t('signup') : t('login')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switchText}>
              {isSignup ? 'Already have an account? Log in' : 'Don\'t have an account? Sign up'}
            </Text>
          </TouchableOpacity>
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>
          <TouchableOpacity style={[styles.button, styles.googleButton]} onPress={signInWithGoogle}>
            <Text style={styles.googleText}>{t('googleLogin')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuest} disabled={loading}>
            <Text style={styles.guestText}>{t('guestLogin')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>{t('disclaimer')}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F7FF' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 40 },
  appName: { fontSize: 36, fontWeight: '800', color: '#1a73e8', marginBottom: 8 },
  tagline: { fontSize: 16, color: '#5f6368' },
  form: { gap: 14 },
  input: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, fontSize: 16,
    borderWidth: 1, borderColor: '#dadce0',
  },
  button: {
    borderRadius: 12, padding: 16, alignItems: 'center', justifyContent: 'center', minHeight: 52,
  },
  primaryButton: { backgroundColor: '#1a73e8' },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
  switchText: { color: '#1a73e8', textAlign: 'center', fontSize: 14, paddingVertical: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  line: { flex: 1, height: 1, backgroundColor: '#dadce0' },
  orText: { marginHorizontal: 12, color: '#5f6368', fontSize: 14 },
  googleButton: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#dadce0' },
  googleText: { color: '#3c4043', fontSize: 17, fontWeight: '600' },
  guestButton: { backgroundColor: '#e8eaed' },
  guestText: { color: '#3c4043', fontSize: 17, fontWeight: '600' },
  disclaimer: { textAlign: 'center', color: '#5f6368', fontSize: 11, marginTop: 32, paddingHorizontal: 20 },
});
