import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, COLORS } from '../constants';
import { Button } from './Button';

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  icon?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message,
  onRetry,
  retryLabel = 'Try Again',
  icon,
  style,
  testID,
}: ErrorStateProps) {
  const { colors, typography } = useTheme();

  return (
    <View testID={testID} style={[styles.container, style]}>
      {icon ? (
        <View style={styles.iconContainer}>{icon}</View>
      ) : (
        <View style={[styles.iconContainer, { backgroundColor: 'rgba(229, 72, 77, 0.12)' }]}>
          <Text style={[styles.errorIcon, { color: COLORS.error }]}>!</Text>
        </View>
      )}

      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
        {title}
      </Text>

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
        {message}
      </Text>

      {onRetry && (
        <View style={styles.retryContainer}>
          <Button
            title={retryLabel}
            onPress={onRetry}
            variant="outline"
            size="md"
          />
        </View>
      )}
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
    backgroundColor: 'rgba(229, 72, 77, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
  },
  errorIcon: {
    fontSize: 32,
    fontWeight: '800',
  },
  retryContainer: {
    marginTop: SPACING.lg,
  },
});
