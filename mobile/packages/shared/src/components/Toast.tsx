import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Text,
  View,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS, SHADOWS } from '../constants';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onHide: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function Toast({
  visible,
  message,
  type = 'info',
  duration = 3000,
  onHide,
  style,
  testID,
}: ToastProps) {
  const { colors, typography } = useTheme();
  const translateY = useRef(new Animated.Value(-120)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);

      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          speed: 38,
          bounciness: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          speed: 38,
          bounciness: 6,
        }),
      ]).start();

      timeoutRef.current = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -120,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
          }),
        ]).start(() => onHide());
      }, duration);
    }

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [visible]);

  if (!visible) return null;

  const configs: Record<
    ToastType,
    { bg: string; icon: string; textColor: string; glowColor: string }
  > = {
    success: {
      bg: 'rgba(31, 157, 85, 0.18)',
      icon: '✓',
      textColor: COLORS.success,
      glowColor: COLORS.success,
    },
    error: {
      bg: 'rgba(229, 72, 77, 0.18)',
      icon: '✕',
      textColor: COLORS.error,
      glowColor: COLORS.error,
    },
    warning: {
      bg: 'rgba(232, 146, 12, 0.18)',
      icon: '⚠',
      textColor: COLORS.warning,
      glowColor: COLORS.warning,
    },
    info: {
      bg: colors.surfaceAlt,
      icon: 'ℹ',
      textColor: COLORS.brand,
      glowColor: COLORS.brand,
    },
  };

  const config = configs[type];

  return (
    <Animated.View
      testID={testID}
      style={[
        styles.container,
        {
          top: Platform.OS === 'ios' ? 60 : 40,
          backgroundColor: config.bg,
          borderColor:
            type === 'info'
              ? colors.border
              : `${config.textColor}33`,
          borderWidth: 1,
          opacity,
          transform: [{ translateY }, { scale: scaleAnim }],
          shadowColor: config.glowColor,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.2,
          shadowRadius: 12,
          elevation: 6,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.iconCircle,
          { backgroundColor: `${config.textColor}22` },
        ]}
      >
        <Text style={[styles.icon, { color: config.textColor }]}>
          {config.icon}
        </Text>
      </View>
      <Text
        style={[
          typography.body,
          { color: colors.text, flex: 1 },
        ]}
        numberOfLines={2}
      >
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: SPACING.base,
    right: SPACING.base,
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    zIndex: 3000,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SPACING.sm,
  },
  icon: {
    fontSize: 16,
    fontWeight: '700',
  },
});
