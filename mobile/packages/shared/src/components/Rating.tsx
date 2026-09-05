import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, COLORS } from '../constants';

interface RatingProps {
  score: number;
  maxScore?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onRatingChange?: (rating: number) => void;
  style?: ViewStyle;
  testID?: string;
}

export function Rating({
  score,
  maxScore = 5,
  showValue = true,
  size = 'sm',
  interactive = false,
  onRatingChange,
  style,
  testID,
}: RatingProps) {
  const { colors, typography } = useTheme();
  const roundedScore = Math.round(score);

  const starSizes = { sm: 14, md: 18, lg: 22 };
  const starSize = starSizes[size];

  const gap = size === 'sm' ? 2 : 4;

  return (
    <View
      testID={testID}
      style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}
    >
      {Array.from({ length: maxScore }, (_, index) => {
        const starNumber = index + 1;
        const isFilled = starNumber <= roundedScore;

        if (interactive) {
          return (
            <Pressable
              key={index}
              onPress={() => onRatingChange?.(starNumber)}
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              style={({ pressed }) => ({
                opacity: pressed ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.9 : 1 }],
              })}
            >
              <Text
                style={{
                  fontSize: starSize,
                  color: isFilled ? COLORS.brand : colors.border,
                }}
              >
                ★
              </Text>
            </Pressable>
          );
        }

        return (
          <Text
            key={index}
            style={{
              fontSize: starSize,
              color: isFilled ? COLORS.brand : colors.border,
            }}
          >
            ★
          </Text>
        );
      })}

      {showValue && (
        <Text
          style={[
            size === 'sm' ? typography.xs : typography.small,
            { color: colors.textMuted, marginLeft: SPACING.xs },
          ]}
        >
          {score.toFixed(1)}
        </Text>
      )}
    </View>
  );
}
