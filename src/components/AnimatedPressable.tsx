// Pressable with a subtle press-in scale animation (built-in Animated, no reanimated).
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
}

export default function AnimatedPressable({
  onPress,
  onLongPress,
  disabled,
  pressScale = 0.96,
  style,
  children,
  hitSlop = 4,
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
      onPressIn={() => animateTo(pressScale)}
      onPressOut={() => animateTo(1)}
    >
      <Animated.View style={[style, { transform: [{ scale: anim }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}
