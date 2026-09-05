import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { COLORS } from '../constants';

type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: AvatarSize;
  online?: boolean;
  style?: ViewStyle;
  testID?: string;
}

const SIZE_MAP: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 80,
};

const FONT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 13,
  md: 18,
  lg: 24,
  xl: 30,
};

const DOT_SIZE_MAP: Record<AvatarSize, number> = {
  sm: 8,
  md: 10,
  lg: 12,
  xl: 14,
};

export function Avatar({
  name,
  uri,
  size = 'md',
  online,
  style,
  testID,
}: AvatarProps) {
  const { colors, typography } = useTheme();
  const dimension = SIZE_MAP[size];
  const fontSize = FONT_SIZE_MAP[size];
  const dotSize = DOT_SIZE_MAP[size];

  const initials = name
    .split(' ')
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const bgColors = [
    COLORS.brand,
    COLORS.info,
    COLORS.success,
    COLORS.warning,
  ];
  const colorIndex = name.length % bgColors.length;
  const bgColor = bgColors[colorIndex];

  return (
    <View testID={testID} style={[{ width: dimension, height: dimension }, style]}>
      {uri ? (
        <Image
          source={{ uri }}
          style={[
            styles.image,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            {
              width: dimension,
              height: dimension,
              borderRadius: dimension / 2,
              backgroundColor: bgColor,
            },
          ]}
        >
          <Text
            style={[
              styles.initials,
              {
                fontSize,
                color: '#FFFFFF',
              },
            ]}
          >
            {initials}
          </Text>
        </View>
      )}
      {online !== undefined && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: online ? COLORS.success : colors.textMuted,
              borderWidth: 2,
              borderColor: colors.bg,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  image: {
    backgroundColor: 'transparent',
  },
  initialsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
  },
});
