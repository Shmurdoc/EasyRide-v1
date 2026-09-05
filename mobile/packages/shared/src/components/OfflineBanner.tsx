import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { COLORS, SPACING } from '../constants';

interface OfflineBannerProps {
  message?: string;
  style?: ViewStyle;
  testID?: string;
}

export function OfflineBanner({
  message = "You're offline. Showing cached data.",
  style,
  testID,
}: OfflineBannerProps) {
  const { colors, typography } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: 'rgba(229, 72, 77, 0.12)',
          borderBottomColor: 'rgba(229, 72, 77, 0.2)',
        },
        style,
      ]}
    >
      <View style={styles.content}>
        <View style={[styles.dot, { backgroundColor: COLORS.error }]} />
        <Text
          style={[
            typography.small,
            { color: COLORS.error, fontWeight: '600', flex: 1 },
          ]}
        >
          {message}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.base,
    borderBottomWidth: 1,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
