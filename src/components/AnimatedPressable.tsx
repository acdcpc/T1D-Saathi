// Pressable with a subtle press-in scale animation (built-in Animated, no reanimated).
// NOTE: the layout `style` is applied to the outer Pressable so percentage widths
// and flex sizing behave exactly like a normal TouchableOpacity; only the scale
// transform lives on the inner Animated.View.
import React, { useRef } from 'react';
import { Animated, Pressable, StyleProp, ViewStyle } from 'react-native';

interface Props {
  onPress?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  pressScale?: number;      // scale when pressed (default 0.96)
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  hitSlop?: number;
  accessibilityRole?: 'button' | 'link' | 'imagebutton' | 'none' | string;
  accessibilityLabel?: string;
  accessibilityState?: Record<string, unknown>;
  accessibilityHint?: string;
}

export default function AnimatedPressable({
  onPress,
  onLongPress,
  disabled,
  pressScale = 0.96,
  style,
  children,
  hitSlop = 4,
  accessibilityRole,
  accessibilityLabel,
  accessibilityState,
  accessibilityHint,
}: Props) {
  const anim = useRef(new Animated.Value(1)).current;

  const animateTo = (to: number) =>
    Animated.spring(anim, { toValue: to, useNativeDriver: true, speed: 40, bounciness: 0 }).start();

  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={style}
      accessibilityRole={accessibilityRole as any}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={accessibilityState as any}
      accessibilityHint={accessibilityHint}
      onPressIn={() => animateTo(pressScale)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={{ transform: [{ scale: anim }] }}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
