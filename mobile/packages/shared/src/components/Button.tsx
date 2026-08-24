import React, { useRef, useEffect } from 'react';
import { Animated, TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme';
import { RADIUS, SPACING, COLORS, GRADIENTS, SHADOWS } from '../constants';

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  glow?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  title, onPress, variant = 'primary', size = 'md',
  disabled, loading, glow = false, icon, style, textStyle,
}: ButtonProps) {
  const { colors, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (glow && variant === 'primary' && !disabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0.3, duration: 1500, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [glow, variant, disabled]);

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.98, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  };

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { paddingVertical: 10, paddingHorizontal: 16, minHeight: 40, borderRadius: RADIUS.sm },
    md: { paddingVertical: 14, paddingHorizontal: SPACING.base, minHeight: 48, borderRadius: RADIUS.md },
    lg: { paddingVertical: 18, paddingHorizontal: SPACING.lg, minHeight: 56, borderRadius: RADIUS.lg },
  };

  const textSizes: Record<ButtonSize, TextStyle> = {
    sm: typography.button,
    md: typography.button,
    lg: typography.buttonLarge,
  };

  const glowStyle: ViewStyle = variant === 'primary' && glow ? {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  } : {};

  const renderContent = () => (
    <>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'accent' || variant === 'danger' ? colors.brandContrast : colors.text} />
      ) : (
        <>
          {icon && <>{icon}</>}
          <Text style={[
            { color: variant === 'primary' || variant === 'accent' || variant === 'danger' ? colors.brandContrast : colors.text },
            textSizes[size],
            icon ? { marginLeft: 8 } : {},
            textStyle,
          ]}>
            {title}
          </Text>
        </>
      )}
    </>
  );

  if (variant === 'accent') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={1}
          style={[sizeStyles[size], { backgroundColor: colors.brand }, style]}
        >
          <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {renderContent()}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'primary') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }, glowStyle]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={1}
          style={[sizeStyles[size], style]}
        >
          <LinearGradient
            colors={GRADIENTS.primary as unknown as string[]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[StyleSheet.absoluteFill, { borderRadius: sizeStyles[size].borderRadius as number }]}
          />
          <Animated.View style={[StyleSheet.absoluteFill, {
            backgroundColor: COLORS.primaryGlow,
            borderRadius: sizeStyles[size].borderRadius,
            opacity: glowAnim,
          }]} />
          <Animated.View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {renderContent()}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  if (variant === 'danger') {
    return (
      <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }]}>
        <TouchableOpacity
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          disabled={disabled || loading}
          activeOpacity={1}
          style={[sizeStyles[size], { backgroundColor: COLORS.error }, SHADOWS.glowError, style]}
        >
          <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            {renderContent()}
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>
    );
  }

  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: colors.primary },
    accent: { backgroundColor: colors.brand },
    secondary: {
      backgroundColor: COLORS.surface,
      borderWidth: 1.5,
      borderColor: COLORS.border,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: COLORS.error },
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 }]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={1}
        style={[sizeStyles[size], variantStyles[variant], style]}
      >
        <Animated.View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
          {renderContent()}
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}
