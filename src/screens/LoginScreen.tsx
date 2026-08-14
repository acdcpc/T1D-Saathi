import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { T, primBtn, input } from '../theme';

export default function LoginScreen({ navigation }: any) {
  const { signIn, signUp, signInWithGoogle, signInAsGuest } = useAuth();
  const { t, language } = useLanguage();
  const isNe = language === 'ne';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'सबै फिल्ड भर्नुहोस्' : 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { error } = isSignup
      ? await signUp(email.trim(), password)
      : await signIn(email.trim(), password);
    setLoading(false);
    if (error) Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'लग इन हुन सकेन। इमेल र पासवर्ड जाँच गर्नुहोस्।' : 'Unable to continue. Check your email and password, then try again.');
  };

  const handleGuest = async () => {
    setLoading(true);
    try { await signInAsGuest(); }
    catch { Alert.alert(isNe ? 'त्रुटि' : 'Error', isNe ? 'अतिथि मोड उपलब्ध छैन।' : 'Guest mode is currently unavailable.'); }
    finally { setLoading(false); }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={styles.appTitle}>T1D साथी</Text>
          <Text style={styles.appSubtitle}>T1D Saathi</Text>
          <Text style={styles.tagline}>{isNe ? 'तपाईंको मधुमेह सहयात्री' : 'Your Diabetes Companion'}</Text>
        </View>
        <View style={styles.form}>
          <TextInput
            style={styles.field}
            placeholder={isNe ? 'इमेल' : 'Email'}
            accessibilityLabel={isNe ? 'इमेल' : 'Email'}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            textContentType="emailAddress"
            returnKeyType="next"
            placeholderTextColor={T.muted}
          />
          <TextInput
            style={styles.field}
            placeholder={isNe ? 'पासवर्ड' : 'Password'}
            accessibilityLabel={isNe ? 'पासवर्ड' : 'Password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            textContentType="password"
            returnKeyType="done"
            placeholderTextColor={T.muted}
          />
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel={isSignup ? (isNe ? 'खाता बनाउनुहोस्' : 'Create account') : (isNe ? 'लग इन' : 'Log in')}
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
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'गुगलबाट लग इन' : 'Continue with Google'} style={styles.outlineBtn} onPress={signInWithGoogle} disabled={loading}>
            <Text style={styles.outlineBtnText}>G  {isNe ? 'गुगलबाट लग इन' : 'Continue with Google'}</Text>
          </TouchableOpacity>
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={isNe ? 'अतिथिको रूपमा जारी राख्नुहोस्' : 'Continue as guest'} style={styles.guestBtn} onPress={handleGuest} disabled={loading}>
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
  appTitle: { fontWeight: '800', fontSize: 26, color: T.text },
  appSubtitle: { fontSize: 14, color: T.muted, marginTop: 2 },
  tagline: { fontSize: 14, color: T.blue, marginTop: 10, fontWeight: '600' },

  form: { gap: 14 },
  field: { ...input },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  switchText: { color: T.blue, textAlign: 'center', fontSize: 14, paddingVertical: 8 },

  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: T.border },
  orText: { marginHorizontal: 12, color: T.muted, fontSize: 13 },

  outlineBtn: {
    borderWidth: 1.5, borderColor: T.border, borderRadius: 28,
    paddingVertical: 13, alignItems: 'center', backgroundColor: T.surface,
  },
  outlineBtnText: { color: T.text, fontSize: 16, fontWeight: '600' },

  guestBtn: {
    borderRadius: 28, paddingVertical: 13, alignItems: 'center', backgroundColor: T.blueLight,
  },
  guestBtnText: { color: T.blue, fontSize: 16, fontWeight: '600' },

  disclaimer: { textAlign: 'center', color: T.muted, fontSize: 11, marginTop: 28, paddingHorizontal: 20, lineHeight: 16 },
});
