import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { usePreferences } from '../context/PreferencesContext';
import { FONT,  T, primBtn, input } from '../theme';
import GradientButton from '../components/GradientButton';
import { D2 } from '../design/tokens';

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth();
  const insets = useSafeAreaInsets();
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
        const dupByError = !!error && /already|registered|exists/i.test(error.message || '');
        const dupByFake = !error && !!data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0;
        if (dupByError || dupByFake) {
          Alert.alert(
            isNe ? 'खाता पहिले नै छ' : 'Account already exists',
            isNe ? 'यो इमेलमा पहिले नै खाता छ। कृपया लग इन गर्नुहोस्।' : 'This email already has an account. Please log in instead.',
            [{ text: isNe ? 'लग इन' : 'Log in', onPress: () => setIsSignup(false) }],
          );
        } else if (error) {
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
          const lower = msg.toLowerCase();
          let friendly = msg;
          if (msg.includes('Invalid login credentials')) {
            friendly = isNe ? 'इमेल वा पासवर्ड गलत छ।' : 'Incorrect email or password.';
          } else if (lower.includes('email not confirmed')) {
            friendly = isNe
              ? 'कृपया पहिले इमेल पुष्टि गर्नुहोस् — इनबक्समा लिङ्क हेर्नुहोस्।'
              : 'Please confirm your email first — check your inbox for the link.';
          } else if (lower.includes('rate limit') || lower.includes('too many')) {
            friendly = isNe ? 'धेरै प्रयास भयो। एकछिन पछि फेरि प्रयास गर्नुहोस्।' : 'Too many attempts. Please try again in a little while.';
          }
          Alert.alert(isNe ? 'त्रुटि' : 'Error', friendly);
        }
      }
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || (isNe ? 'केही गलत भयो।' : 'Something went wrong'));
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    try {
      await signInAsGuest();
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || (isNe ? 'पाहुना लग इन असफल भयो' : 'Guest sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  const showStaffInfo = () => {
    Alert.alert(
      isNe ? 'स्टाफ पहुँच' : 'Staff access',
      isNe
        ? 'क्लिनिसियन र एडमिनहरूले आफ्नो आधिकारिक इमेल र पासवर्डले लग इन गर्नुहोस्। लग इन गरेपछि क्लिनिसियन क्षेत्र र एडमिन कन्सोल उपलब्ध हुन्छ।'
        : 'Clinicians and admins sign in with their official email and password. After signing in you get the clinician area and admin console.',
    );
  };

  const handleGoogle = async () => {
    setLoading(true);
    try {
      const outcome = await signInWithGoogle();
      if (outcome === 'unavailable') {
        Alert.alert(
          isNe ? 'गुगल लग इन उपलब्ध छैन' : 'Google sign-in unavailable',
          isNe ? 'गुगल लग इन अहिले उपलब्ध छैन। इमेल वा पाहुना विकल्प प्रयोग गर्नुहोस्।' : 'Google sign-in is unavailable right now. Try email or guest instead.',
        );
      }
      // 'signed-in' → auth state drives navigation. 'cancelled' → stay silent.
    } catch (e: any) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', e?.message || (isNe ? 'गुगल लग इन असफल भयो' : 'Google sign-in failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: TH.bg }]} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: Math.max(insets.bottom ?? 0, 48) }]} keyboardShouldPersistTaps="handled">
        <View style={styles.cardCol}>
        <View style={styles.header}>
          <Text style={[styles.appTitle, { color: TH.text, fontSize: 26 * fontScale }]}>T1D साथी</Text>
          <Text style={styles.tagline}>{isNe ? 'तपाईंको मधुमेह सहयात्री' : 'Your Diabetes Companion'}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            style={[styles.field, emailError && styles.fieldError, { color: TH.text, fontSize: 15 * fontScale }]}
            placeholder={isNe ? 'इमेल' : 'Email'}
            accessibilityLabel={isNe ? 'इमेल' : 'Email'}
            value={email}
            onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(null); }}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            returnKeyType="next"
            placeholderTextColor={TH.muted}          />
          {emailError ? <Text style={styles.errorText}>{emailError}</Text> : null}
          <TextInput
            style={[styles.field, passwordError && styles.fieldError, { color: TH.text, fontSize: 15 * fontScale }]}
            placeholder={isNe ? 'पासवर्ड' : 'Password'}
            accessibilityLabel={isNe ? 'पासवर्ड' : 'Password'}
            value={password}
            onChangeText={(v) => { setPassword(v); if (passwordError) setPasswordError(null); }}
            secureTextEntry
            textContentType="password"
            returnKeyType="done"
            placeholderTextColor={TH.muted}          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : (
            isSignup ? <Text style={styles.hintText}>{isNe ? 'कम्तिमा ६ अक्षरको पासवर्ड' : 'At least 6 characters'}</Text> : null
          )}
          <GradientButton
            label={isSignup ? (isNe ? 'खाता बनाउनुहोस्' : 'Create Account') : (isNe ? 'लग इन' : 'Log In')}
            onPress={handleSubmit}
            loading={loading}
          />
          <TouchableOpacity onPress={showStaffInfo} accessibilityRole="button">
            <Text style={styles.staffNote}>{isNe ? 'चिकित्सक वा एडमिन हुनुहुन्छ? कार्य इमेलले लग इन गर्नुहोस् →' : 'Clinician or admin? Sign in with your work email →'}</Text>
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'गुगलबाट लग इन' : 'Continue with Google'} style={styles.outlineBtn} onPress={handleGoogle} disabled={loading}>            <Text style={styles.outlineBtnText}>G  {isNe ? 'गुगलबाट लग इन' : 'Continue with Google'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'अतिथिको रूपमा जारी राख्नुहोस्' : 'Continue as guest'} style={styles.guestBtn} onPress={handleGuest} disabled={loading}>
            <Text style={styles.guestBtnText}>{isNe ? 'पाहुनाको रूपमा जारी राख्नुहोस्' : 'Continue as Guest'}</Text>
          </TouchableOpacity>
        </View>
        </View>
        <Text style={styles.disclaimer}>{isNe ? 'यो एप चिकित्सकीय उपकरण होइन। प्रयोग गर्नुभन्दा पहिले चिकित्सकको सल्लाह लिनुहोस्।' : 'This app is not a medical device. Consult your clinician before use.'}</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  hintText: { color: '#8A8F98', fontSize: 12, marginTop: 4 },
  staffNote: { color: T.muted, textAlign: 'center', fontSize: 12.5, marginTop: 12, fontFamily: FONT.regular },
  container: { flex: 1, backgroundColor: T.bg },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cardCol: {
    width: '100%', maxWidth: 400, alignSelf: 'center',
    backgroundColor: '#FFFFFF', borderRadius: 22, padding: 24,
    borderWidth: 1, borderColor: T.border,
    shadowColor: '#C9B8A6', shadowOpacity: 0.12, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 3,
  },
  header: { alignItems: 'center', marginBottom: 36 },
  appTitle: { fontWeight: '800', fontSize: 26, fontFamily: FONT.extrabold, color: T.text },
  appSubtitle: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginTop: 2 },
  tagline: { fontSize: 14, fontFamily: FONT.semibold, color: D2.teal, marginTop: 10, fontWeight: '600' },

  form: { gap: 14 },
  field: { ...input },
  fieldError: { borderColor: T.red, borderWidth: 1.5 },
  errorText: { color: T.red, fontSize: 12, fontFamily: FONT.regular, marginTop: -6 },
  btnText: { color: '#fff', fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  switchText: { color: D2.tealDeep, textAlign: 'center', fontSize: 14, fontFamily: FONT.regular, paddingVertical: 8 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: T.border },
  orText: { marginHorizontal: 12, color: T.muted, fontSize: 13, fontFamily: FONT.regular },

  outlineBtn: {
    borderWidth: 1.5, borderColor: T.border, borderRadius: 28,
    paddingVertical: 13, alignItems: 'center', backgroundColor: T.surface,
  },
  outlineBtnText: { color: T.text, fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  guestBtn: {
    borderRadius: 28, paddingVertical: 13, alignItems: 'center', backgroundColor: D2.tealTint,
  },
  guestBtnText: { color: D2.tealDeep, fontSize: 16, fontFamily: FONT.semibold, fontWeight: '600' },

  disclaimer: { textAlign: 'center', color: T.muted, fontSize: 11, fontFamily: FONT.regular, marginTop: 20, paddingHorizontal: 20, lineHeight: 16, maxWidth: 400, alignSelf: 'center' },
});
