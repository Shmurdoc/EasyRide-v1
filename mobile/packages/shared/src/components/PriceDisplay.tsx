import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, COLORS } from '../constants';

type PriceSize = 'sm' | 'md' | 'lg' | 'xl';

interface PriceDisplayProps {
  amount: number;
  currency?: string;
  label?: string;
  size?: PriceSize;
  strikeThrough?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function PriceDisplay({
  amount,
  currency = 'R',
  label,
  size = 'md',
  strikeThrough = false,
  style,
  testID,
}: PriceDisplayProps) {
  const { colors, typography } = useTheme();

  const formatted = `${currency} ${amount.toFixed(2)}`;
  const integerPart = amount.toFixed(2).split('.')[0];
  const decimalPart = amount.toFixed(2).split('.')[1];

  const sizeConfig: Record<
    PriceSize,
    { intSize: number; decSize: number; currencySize: number; fontWeight: string }
  > = {
    sm: { intSize: 14, decSize: 11, currencySize: 11, fontWeight: '600' },
    md: { intSize: 20, decSize: 14, currencySize: 14, fontWeight: '700' },
    lg: { intSize: 28, decSize: 18, currencySize: 18, fontWeight: '800' },
    xl: { intSize: 36, decSize: 22, currencySize: 22, fontWeight: '800' },
  };

  const config = sizeConfig[size];

  return (
    <View
      testID={testID}
      style={[styles.container, style]}
    >
      {label && (
        <Text style={[typography.small, { color: colors.textMuted, marginRight: SPACING.sm }]}>
          {label}
        </Text>
      )}
      <Text
        style={[
          styles.price,
          {
            textDecorationLine: strikeThrough ? 'line-through' : 'none',
            opacity: strikeThrough ? 0.5 : 1,
          },
        ]}
      >
        <Text
          style={{
            fontSize: config.currencySize,
            fontWeight: config.fontWeight as any,
            color: COLORS.brand,
          }}
        >
          {currency}{' '}
        </Text>
        <Text
          style={{
            fontSize: config.intSize,
            fontWeight: config.fontWeight as any,
            color: COLORS.brand,
          }}
        >
          {integerPart}
        </Text>
        <Text
          style={{
            fontSize: config.decSize,
            fontWeight: config.fontWeight as any,
            color: COLORS.brand,
          }}
        >
          .{decimalPart}
        </Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  price: {
    letterSpacing: -0.3,
  },
});
