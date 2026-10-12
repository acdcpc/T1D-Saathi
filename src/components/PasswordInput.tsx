import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Password field with a show/hide (eye) toggle — Warm Dawn styled.
 * Pass the same props/styles a plain TextInput would receive; the toggle
 * sits inside the field on the right. Bilingual accessibility label.
 */
export default function PasswordInput({
  isNe, error, style, errorStyle, ...rest
}: TextInputProps & { isNe?: boolean; error?: boolean; errorStyle?: any }) {
  const [show, setShow] = useState(false);
  return (
    <View style={styles.wrap}>
      <TextInput {...rest} secureTextEntry={!show} style={[style, error && errorStyle, styles.padRight]} />
      <TouchableOpacity
        style={styles.eyeBtn}
        onPress={() => setShow((s) => !s)}
        accessibilityRole="button"
        accessibilityLabel={show
          ? (isNe ? 'पासवर्ड लुकाउनुहोस्' : 'Hide password')
          : (isNe ? 'पासवर्ड देखाउनुहोस्' : 'Show password')}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#8A8F98" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center' },
  padRight: { paddingRight: 46 },
  eyeBtn: { position: 'absolute', right: 6, top: 0, bottom: 0, justifyContent: 'center', paddingHorizontal: 10 },
});
