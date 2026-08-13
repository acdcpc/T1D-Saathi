import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FONT,  T } from '../theme';
import { useLanguage } from '../context/LanguageContext';

/**
 * Small "Based on ISPAD 2022 Guidelines" compliance indicator.
 * Shown on all protocol / dosing screens for clinical credibility.
 */
export default function ISPADBadge({ label }: { label?: string }) {
  const { language } = useLanguage();
  const isNe = language === 'ne';
  return (
    <View style={styles.badge}>
      <Text style={styles.dot}>✓</Text>
      <Text style={styles.text}>
        {label || (isNe ? 'ISPAD 2022 दिशानिर्देशमा आधारित' : 'Based on ISPAD 2022 Guidelines')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: T.blueLightBg,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  dot: { color: T.blueDark, fontWeight: '800', fontSize: 12, fontFamily: FONT.extrabold },
  text: { color: T.blueDark, fontSize: 12, fontFamily: FONT.semibold, fontWeight: '600' },
});
