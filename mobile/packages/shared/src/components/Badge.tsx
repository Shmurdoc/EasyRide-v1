import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'default' | 'brand';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
  dot?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Badge({
  label,
  variant = 'default',
  size = 'sm',
  dot = false,
  style,
  testID,
}: BadgeProps) {
  const { colors, typography } = useTheme();

  const variantConfig: Record<BadgeVariant, { bg: string; text: string }> = {
    success: { bg: 'rgba(31, 157, 85, 0.18)', text: COLORS.success },
    error: { bg: 'rgba(229, 72, 77, 0.18)', text: COLORS.error },
    warning: { bg: 'rgba(232, 146, 12, 0.18)', text: COLORS.warning },
    info: { bg: 'rgba(46, 107, 240, 0.18)', text: COLORS.info },
    brand: { bg: 'rgba(255, 106, 0, 0.18)', text: COLORS.brand },
    default: { bg: colors.surfaceAlt, text: colors.textMuted },
  };

  const config = variantConfig[variant];

  const dotColor =
    variant === 'success'
      ? COLORS.success
      : variant === 'error'
      ? COLORS.error
      : variant === 'warning'
      ? COLORS.warning
      : variant === 'info'
      ? COLORS.info
      : variant === 'brand'
      ? COLORS.brand
      : colors.textMuted;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? SPACING.sm : SPACING.md,
          borderRadius: RADIUS.sm,
        },
        style,
      ]}
    >
      {dot && (
        <View
          style={[
            styles.dot,
            {
              backgroundColor: dotColor,
              width: size === 'sm' ? 6 : 8,
              height: size === 'sm' ? 6 : 8,
              borderRadius: size === 'sm' ? 3 : 4,
            },
          ]}
        />
      )}
      <Text
        style={[
          size === 'sm' ? typography.xs : typography.small,
          { color: config.text, fontWeight: '600' },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  dot: {
    marginRight: SPACING.xs,
  },
});
