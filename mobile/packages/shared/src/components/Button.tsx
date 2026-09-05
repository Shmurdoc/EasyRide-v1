import React, { useRef, useEffect } from 'react';
import {
  Animated,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  View,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { RADIUS, SPACING, COLORS } from '../constants';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
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
  iconPosition?: 'left' | 'right';
  style?: ViewStyle;
  textStyle?: TextStyle;
  testID?: string;
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  glow = false,
  icon,
  iconPosition = 'left',
  style,
  textStyle,
  testID,
}: ButtonProps) {
  const { colors, typography } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (glow && variant === 'primary' && !disabled && !loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1400,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0.3,
            duration: 1400,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [glow, variant, disabled, loading]);

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

  const sizeStyles: Record<ButtonSize, ViewStyle> = {
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

  const textSizes: Record<ButtonSize, TextStyle> = {
    sm: { ...typography.button, fontSize: 13 },
    md: typography.button,
    lg: typography.buttonLg,
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: COLORS.brand,
        };
      case 'secondary':
        return {
          backgroundColor: colors.glass,
          borderWidth: 1,
          borderColor: colors.glassBorder,
        };
      case 'outline':
        return {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderColor: COLORS.brand,
        };
      case 'ghost':
        return {
          backgroundColor: 'transparent',
        };
      case 'danger':
        return {
          backgroundColor: COLORS.error,
        };
      default:
        return {};
    }
  };

  const getTextColor = (): string => {
    switch (variant) {
      case 'primary':
        return '#FFFFFF';
      case 'secondary':
        return colors.text;
      case 'outline':
        return COLORS.brand;
      case 'ghost':
        return colors.text;
      case 'danger':
        return '#FFFFFF';
      default:
        return '#FFFFFF';
    }
  };

  const glowStyle: ViewStyle =
    variant === 'primary' && glow
      ? {
          shadowColor: COLORS.brand,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: glowAnim,
          shadowRadius: 20,
          elevation: 10,
        }
      : {};

  const content = (
    <View style={styles.content}>
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? COLORS.brand : '#FFFFFF'}
        />
      ) : (
        <>
          {icon && iconPosition === 'left' && (
            <View style={[styles.icon, { marginRight: SPACING.sm }]}>{icon}</View>
          )}
          <Text
            style={[
              textSizes[size],
              { color: getTextColor(), fontWeight: '700' },
              textStyle,
            ]}
          >
            {title}
          </Text>
          {icon && iconPosition === 'right' && (
            <View style={[styles.icon, { marginLeft: SPACING.sm }]}>{icon}</View>
          )}
        </>
      )}
    </View>
  );

  return (
    <Animated.View
      style={[
        { transform: [{ scale: scaleAnim }], opacity: disabled ? 0.5 : 1 },
        glowStyle,
      ]}
    >
      <TouchableOpacity
        testID={testID}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        activeOpacity={0.9}
        style={[
          sizeStyles[size],
          getVariantStyle(),
          variant === 'ghost' && { paddingVertical: size === 'sm' ? 8 : 12 },
          style,
        ]}
      >
        {content}
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
