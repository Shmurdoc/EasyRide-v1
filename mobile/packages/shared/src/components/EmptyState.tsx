import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, COLORS } from '../constants';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  style,
  testID,
}: EmptyStateProps) {
  const { colors, typography } = useTheme();

  return (
    <View testID={testID} style={[styles.container, style]}>
      {icon && <View style={styles.iconContainer}>{icon}</View>}

      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>

      {description && (
        <Text
          style={[
            typography.body,
            {
              color: colors.textMuted,
              textAlign: 'center',
              marginTop: SPACING.sm,
              lineHeight: 20,
            },
          ]}
        >
          {description}
        </Text>
      )}

      {action && <View style={styles.actionContainer}>{action}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.xl,
    paddingHorizontal: SPACING['2xl'],
  },
  iconContainer: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 106, 0, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  actionContainer: {
    marginTop: SPACING.lg,
  },
});
