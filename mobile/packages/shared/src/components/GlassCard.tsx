import React, { useRef } from 'react';
import {
  Animated,
  View,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Pressable,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, SHADOWS, COLORS } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  glow?: boolean;
  glowColor?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function GlassCard({
  children,
  padding = SPACING.base,
  glow = false,
  glowColor = COLORS.brand,
  onPress,
  style,
  testID,
}: GlassCardProps) {
  const { colors } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.spring(scaleAnim, {
      toValue: 0.97,
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

  const glowStyle: ViewStyle = glow
    ? {
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
      }
    : {};

  const cardContent = (
    <View
      style={[
        styles.card,
        {
          padding,
          backgroundColor: colors.glass,
          borderColor: colors.glassBorder,
        },
        glowStyle,
        style as ViewStyle,
      ]}
    >
      <View style={styles.content}>{children}</View>
    </View>
  );

  if (onPress) {
    return (
      <Animated.View
        testID={testID}
        style={[{ transform: [{ scale: scaleAnim }] }, SHADOWS.card]}
      >
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
        >
          {cardContent}
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <Animated.View testID={testID} style={SHADOWS.card}>
      {cardContent}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    overflow: 'hidden',
  },
  content: {
    position: 'relative',
  },
});
