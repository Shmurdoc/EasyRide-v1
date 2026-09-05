import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, COLORS } from '../constants';

interface DividerProps {
  label?: string;
  color?: string;
  thickness?: number;
  style?: ViewStyle;
  testID?: string;
}

export function Divider({
  label,
  color,
  thickness = 1,
  style,
  testID,
}: DividerProps) {
  const { colors, typography } = useTheme();
  const lineColor = color || colors.border;

  if (label) {
    return (
      <View testID={testID} style={[styles.container, style]}>
        <View
          style={[
            styles.line,
            { backgroundColor: lineColor, height: thickness },
          ]}
        />
        <Text
          style={[
            typography.xs,
            {
              color: colors.textMuted,
              marginHorizontal: SPACING.md,
              textTransform: 'uppercase',
              letterSpacing: 1.2,
            },
          ]}
        >
          {label}
        </Text>
        <View
          style={[
            styles.line,
            { backgroundColor: lineColor, height: thickness },
          ]}
        />
      </View>
    );
  }

  return (
    <View
      testID={testID}
      style={[
        {
          height: thickness,
          backgroundColor: lineColor,
          marginVertical: SPACING.md,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  line: {
    flex: 1,
  },
});
