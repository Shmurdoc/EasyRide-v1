import React, { useRef, useEffect } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../theme';
import { RADIUS, SPACING, COLORS } from '../constants';

type GradientButtonSize = 'sm' | 'md' | 'lg';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  size?: GradientButtonSize;
  disabled?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function GradientButton({
  title,
  onPress,
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
  testID,
}: GradientButtonProps) {
  const { colors, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!disabled && !loading) {
      const shimmer = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        })
      );
      shimmer.start();
      return () => shimmer.stop();
    }
  }, [disabled, loading]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 50,
      bounciness: 4,
    }).start();
  };

  const handlePress = () => {
    if (!disabled && !loading) onPress();
  };

  const sizeStyles: Record<GradientButtonSize, ViewStyle> = {
    sm: {
      paddingVertical: 10,
      paddingHorizontal: 16,
      minHeight: 40,
      borderRadius: RADIUS.sm,
    },
    md: {
      paddingVertical: 14,
      paddingHorizontal: SPACING.base,
      minHeight: 48,
      borderRadius: RADIUS.md,
    },
    lg: {
      paddingVertical: 18,
      paddingHorizontal: SPACING.lg,
      minHeight: 56,
      borderRadius: RADIUS.lg,
    },
  };

  const textSizes: Record<GradientButtonSize, TextStyle> = {
    sm: { ...typography.button, fontSize: 13 },
    md: typography.button,
    lg: typography.buttonLg,
  };

  const shimmerTranslateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 },
        styles.shadow,
      ]}
    >
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[sizeStyles[size], { overflow: 'hidden' }, style]}
      >
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sizeStyles[size].borderRadius,
              backgroundColor: COLORS.brand,
            },
          ]}
        />

        <View
          style={[
            StyleSheet.absoluteFill,
            {
              borderRadius: sizeStyles[size].borderRadius,
              overflow: 'hidden',
            },
          ]}
        >
          <Animated.View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              transform: [{ translateX: shimmerTranslateX }],
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              width: 100,
            }}
          />
        </View>

        <View style={styles.content}>
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              {icon && <View style={{ marginRight: SPACING.sm }}>{icon}</View>}
              <Text
                style={[
                  textSizes[size],
                  { color: '#FFFFFF', fontWeight: '700' },
                  textStyle,
                ]}
              >
                {title}
              </Text>
            </>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  shadow: {
    shadowColor: COLORS.brand,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
