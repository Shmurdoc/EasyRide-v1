import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS, RIDE_STATUS_COLORS, RIDE_STATUS_LABELS } from '../constants';

interface RideStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
  showDot?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function RideStatusBadge({
  status,
  size = 'sm',
  showDot = true,
  style,
  testID,
}: RideStatusBadgeProps) {
  const { colors, typography } = useTheme();

  const statusColor = RIDE_STATUS_COLORS[status] || colors.textMuted;
  const label = RIDE_STATUS_LABELS[status] || status.replace(/_/g, ' ');
  const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

  const dotSize = size === 'sm' ? 6 : 8;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: `${statusColor}18`,
          paddingVertical: size === 'sm' ? 3 : 5,
          paddingHorizontal: size === 'sm' ? SPACING.sm : SPACING.md,
          borderRadius: RADIUS.sm,
        },
        style,
      ]}
    >
      {showDot && (
        <View
          style={[
            styles.dot,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: statusColor,
            },
          ]}
        />
      )}
      <Text
        style={[
          size === 'sm' ? typography.xs : typography.small,
          { color: statusColor, fontWeight: '600' },
        ]}
      >
        {displayLabel}
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
