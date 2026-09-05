import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface ChipProps {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  style?: ViewStyle;
  testID?: string;
}

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  size = 'md',
  style,
  testID,
}: ChipProps) {
  const { colors, typography } = useTheme();

  const isSelected = selected;

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          paddingVertical: size === 'sm' ? 6 : 8,
          paddingHorizontal: size === 'sm' ? SPACING.md : SPACING.base,
          backgroundColor: isSelected ? COLORS.brand : colors.surfaceAlt,
          borderColor: isSelected ? COLORS.brand : colors.border,
          borderWidth: isSelected ? 1.5 : 1,
          borderRadius: RADIUS.full,
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed ? 0.96 : 1 }],
        },
        style,
      ]}
    >
      {icon && <>{icon}</>}
      <Text
        style={[
          size === 'sm' ? typography.xs : typography.small,
          {
            color: isSelected ? '#FFFFFF' : colors.textSecondary,
            fontWeight: isSelected ? '700' : '500',
            marginLeft: icon ? SPACING.xs : 0,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
});
