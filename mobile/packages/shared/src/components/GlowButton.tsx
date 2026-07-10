import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Vibration, View } from 'react-native';
let LinearGradient: any = null;
try { LinearGradient = require('expo-linear-gradient').LinearGradient; } catch {}
import { useTheme } from '../theme';
import { RADIUS, SPACING, COLORS } from '../constants';

type ButtonSize = 'sm' | 'md' | 'lg';

interface GlowButtonProps {
  title: string;
  onPress: () => void;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  glowColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function GlowButton({
  title, onPress, size = 'md', disabled, loading, icon,
  glowColor = COLORS.primary, style, textStyle,
}: GlowButtonProps) {
  const { colors, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;
  const innerGlow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [disabled]);

  const handlePressIn = () => {
    try {
      Vibration.vibrate(10);
    } catch (e) {
      console.warn('[GlowButton] Vibration.vibrate failed:', e);
    }
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(innerGlow, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }),
      Animated.timing(innerGlow, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const handlePress = React.useCallback(() => {
    try {
      console.log('[GlowButton] handlePress called, disabled=', disabled, 'loading=', loading);
      if (disabled || loading) return;
      onPress?.();
    } catch (e) {
      console.error('[GlowButton] handlePress crashed:', e);
    }
  }, [disabled, loading, onPress]);

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { paddingVertical: 12, paddingHorizontal: 20, minHeight: 44, borderRadius: RADIUS.sm },
    md: { paddingVertical: 16, paddingHorizontal: SPACING.base, minHeight: 52, borderRadius: RADIUS.md },
    lg: { paddingVertical: 20, paddingHorizontal: SPACING.lg, minHeight: 60, borderRadius: RADIUS.lg },
  };

  const textSizes: Record<ButtonSize, TextStyle> = {
    sm: typography.button,
    md: typography.button,
    lg: typography.buttonLarge,
  };

  return (
    <Animated.View style={{
      transform: [{ scale: scaleAnim }],
      opacity: disabled ? 0.5 : 1,
      shadowColor: glowColor,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: glowAnim,
      shadowRadius: 24,
      elevation: 12,
    }}>
      <TouchableOpacity
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[sizeStyles[size], { overflow: 'hidden' }, style]}
      >
        {LinearGradient ? (
          <LinearGradient
            colors={[glowColor, glowColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: sizeStyles[size].borderRadius }]}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: glowColor, borderRadius: sizeStyles[size].borderRadius }]} />
        )}
        <Animated.View style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: COLORS.white,
            borderRadius: sizeStyles[size].borderRadius,
            opacity: innerGlow,
          },
        ]} />
        <Animated.View style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {loading ? (
            <ActivityIndicator size="small" color={COLORS.bg} />
          ) : (
            <>
              {icon}
              <Text style={[
                { color: COLORS.bg, marginLeft: icon ? 8 : 0 },
                textSizes[size],
                textStyle,
              ]}>
                {title}
              </Text>
            </>
          )}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
