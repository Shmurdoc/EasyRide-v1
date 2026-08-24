import React, { useRef } from 'react';
import { Animated, View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SPACING, RADIUS, COLORS, SHADOWS } from '../constants';

interface GlassCardProps {
  children: React.ReactNode;
  padding?: number;
  glow?: boolean;
  glowColor?: string;
  style?: StyleProp<ViewStyle>;
}

export function GlassCard({
  children,
  padding = SPACING.base,
  glow = false,
  glowColor = COLORS.primary,
  style,
}: GlassCardProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  return (
    <Animated.View style={[
      { transform: [{ scale: scaleAnim }] },
      SHADOWS.subtle,
      glow ? {
        shadowColor: glowColor,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 8,
      } : {},
    ]}>
      <View
        onStartShouldSetResponder={() => true}
        onResponderGrant={handlePressIn}
        onResponderRelease={handlePressOut}
        style={[{
          padding,
          borderRadius: RADIUS.xl,
          backgroundColor: COLORS.surface,
          borderWidth: 1,
          borderColor: COLORS.surfaceBorder,
          overflow: 'hidden',
        }, style]}
      >
        <View style={{ position: 'relative' }}>
          {children}
        </View>
      </View>
    </Animated.View>
  );
}
