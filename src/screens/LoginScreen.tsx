import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { FONT,  T, primBtn, input } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth();
  const { t, language } = useLanguage();
  const { theme: TH, fontScale } = usePreferences();
  const isNe = language === 'ne';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const validate = (): boolean => {
    let ok = true;
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      setEmailError(isNe ? 'इमेल आवश्यक छ' : 'Email is required');
      ok = false;
    } else if (!emailRe.test(email.trim())) {
      setEmailError(isNe ? 'मान्य इमेल लेख्नुहोस्' : 'Enter a valid email');
      ok = false;
    } else {
      setEmailError(null);
    }
    if (!password.trim()) {
      setPasswordError(isNe ? 'पासवर्ड आवश्यक छ' : 'Password is required');
      ok = false;
    } else if (password.length < 6) {
      setPasswordError(isNe ? 'पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ' : 'Password must be at least 6 characters');
      ok = false;
    } else {
      setPasswordError(null);
    }
    return ok;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      if (isSignup) {
        const { data, error } = await signUp(email.trim(), password);
        if (error) {
          Alert.alert(isNe ? 'त्रुटि' : 'Error', error.message);
        } else if (!data?.session) {
          // Email confirmation is enabled → user must verify before signing in
          Alert.alert(
            isNe ? 'इमेल जाँच गर्नुहोस्' : 'Check your email',
            isNe
              ? 'तपाईंको इमेलमा पुष्टि लिङ्क पठाइएको छ। पुष्टि गरेपछि लग इन गर्नुहोस्।'
              : 'A confirmation link has been sent to your email. Please verify, then log in.',
          );
        }
        // If data.session exists → AuthContext already set the user → auto-navigation
      } else {
        const { error } = await signIn(email.trim(), password);
        if (error) {
          const msg = error.message || '';
          const friendly = msg.includes('Invalid login credentials')
            ? (isNe ? 'इमेल वा पासवर्ड गलत छ।' : 'Incorrect email or password.')
            : msg;
          Alert.alert(isNe ? 'त्रुटि' : 'Error', friendly);
        }
      }
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || 'Guest sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || 'Google sign-in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: TH.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: TH.text, fontSize: 26 * fontScale }]}>T1D साथी</Text>
          <Text style={styles.appSubtitle}>T1D Saathi</Text>
          <Text style={styles.tagline}>{isNe ? 'तपाईंको मधुमेह सहयात्री' : 'Your Diabetes Companion'}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            style={[styles.field, emailError && styles.fieldError, { color: TH.text, fontSize: 15 * fontScale }]}
            placeholder={isNe ? 'इमेल' : 'Email'}
            value={email}
            onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            placeholderTextColor={TH.muted}
          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <TextInput
            style={[styles.field, passwordError && styles.fieldError, { color: TH.text, fontSize: 15 * fontScale }]}
            placeholder={isNe ? 'पासवर्ड' : 'Password'}
            value={password}
            onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); }}
            secureTextEntry
            placeholderTextColor={TH.muted}
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          <TouchableOpacity
            style={[primBtn, loading && { opacity: 0.7 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.btnText}>{isSignup ? (isNe ? 'खाता बनाउनुहोस्' : 'Create Account') : (isNe ? 'लग इन' : 'Log In')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setIsSignup(!isSignup)}>
            <Text style={styles.switchText}>
              {isSignup
                ? (isNe ? 'पहिले नै खाता छ? लग इन गर्नुहोस्' : 'Already have an account? Log in')
                : (isNe ? 'खाता छैन? साइन अप गर्नुहोस्' : "Don't have an account? Sign up")}
            </Text>
          </TouchableOpacity>
          <View style={styles.divider}>
            <View style={styles.line} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.line} />
          </View>
          <TouchableOpacity style={styles.outlineBtn} onPress={handleGoogle} disabled={loading}>
            <Text style={styles.outlineBtnText}>G  {isNe ? 'गुगलबाट लग इन' : 'Continue with Google'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestBtn} onPress={handleGuest} disabled={loading}>
            <Text style={styles.guestBtnText}>{isNe ? 'पाहुनाको रूपमा जारी राख्नुहोस्' : 'Continue as Guest'}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.disclaimer}>{isNe ? 'यो एप चिकित्सकीय उपकरण होइन। प्रयोग गर्नुभन्दा पहिले चिकित्सकको सल्लाह लिनुहोस्।' : 'This app is not a medical device. Consult your clinician before use.'}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 36 },
  appTitle: { fontWeight: '800', fontSize: 26, fontFamily: FONT.extrabold, color: T.text },
  appSubtitle: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },
  tagline: { fontSize: 14, fontFamily: FONT.semibold, color: T.blue, marginTop: 10, fontWeight: '600' },

  form: { gap: 14 },
  field: { ...input },
  fieldError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginTop: -6 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  switchText: { color: T.blue, textAlign: 'center', fontSize: 14, fontFamily: FONT.regular, paddingVertical: 8 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: T.border },
  orText: { marginHorizontal: 12, color: T.muted, fontSize: 13, fontFamily: FONT.regular },

  outlineBtn: {
    borderWidth: 1.5, borderColor: T.border, borderRadius: 28,
    paddingVertical: 13, alignItems: 'center', backgroundColor: T.surface,
  },
  outlineBtnText: { color: T.text, fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  guestBtn: {
    borderRadius: 28, paddingVertical: 13, alignItems: 'center', backgroundColor: T.blueLight,
  },
  guestBtnText: { color: T.blue, fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  disclaimer: { textAlign: 'center', color: T.muted, fontSize: 11, fontFamily: FONT.regular, marginTop: 28, paddingHorizontal: 20, lineHeight: 16 },
});
