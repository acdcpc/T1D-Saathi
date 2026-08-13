import React, { Component } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { FONT,  T } from '../theme';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; errorMsg: string; }

/**
 * Nepali-friendly error boundary — shows a calm, actionable message
 * instead of a white screen on budget devices.
 */
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, errorMsg: '' };

  static getDerivedStateFromError(err: Error): State {
    return { hasError: true, errorMsg: err?.message || '' };
  }

  componentDidCatch(err: Error) {
    console.error('[ErrorBoundary]', err);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <View style={styles.wrap}>
        <Text style={styles.icon}>🙏</Text>
        <Text style={styles.title}>केही गडबड भयो</Text>
        <Text style={styles.subtitle}>Something went wrong. Please try again.</Text>
        <TouchableOpacity
          style={styles.btn}
          onPress={() => this.setState({ hasError: false, errorMsg: '' })}
        >
          <Text style={styles.btnText}>फेरि प्रयास गर्नुहोस् · Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: T.bg, alignItems: 'center', justifyContent: 'center', padding: 32 },
  icon: { fontSize: 56, fontFamily: FONT.regular, marginBottom: 16 },
  title: { fontSize: 20, fontFamily: FONT.extrabold, fontWeight: '800', color: T.text },
  subtitle: { fontSize: 14, fontFamily: FONT.regular, color: T.muted, marginTop: 8, textAlign: 'center' },
  btn: { backgroundColor: T.blue, borderRadius: 28, paddingVertical: 14, paddingHorizontal: 24, marginTop: 24 },
  btnText: { color: '#fff', fontSize: 15, fontFamily: FONT.bold, fontWeight: '700' },
});
