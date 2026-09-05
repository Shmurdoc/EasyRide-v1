import React, { useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, SHADOWS, COLORS } from '../constants';

type CardVariant = 'default' | 'elevated' | 'outlined';

interface CardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  padding?: number;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function Card({
  children,
  variant = 'default',
  padding = SPACING.base,
  onPress,
  style,
  testID,
}: CardProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.98,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.raised,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1,
          borderColor: colors.border,
        };
      case 'default':
      default:
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          ...SHADOWS.card,
        };
    }
  };

  const content = (
    <View style={[styles.inner, { padding }, getVariantStyle(), style]}>
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Animated.View
        testID={testID}
        style={{ transform: [{ scale: scaleAnim }] }}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {content}
        </Pressable>
      </Animated.View>
    );
  }

  return <View testID={testID}>{content}</View>;
}

const styles = StyleSheet.create({
  inner: {
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
  },
});
