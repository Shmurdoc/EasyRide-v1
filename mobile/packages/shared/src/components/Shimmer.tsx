import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../theme';
import { COLORS, RADIUS } from '../constants';

interface ShimmerProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  variant?: 'default' | 'brand';
  style?: ViewStyle;
}

export function Shimmer({
  width = '100%',
  height = 16,
  borderRadius = RADIUS.sm,
  variant = 'default',
  style,
}: ShimmerProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );
    shimmer.start();
    return () => shimmer.stop();
  }, []);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-300, 300],
  });

  const baseColor =
    variant === 'brand'
      ? 'rgba(255, 106, 0, 0.08)'
      : colors.surfaceAlt;

  const shimmerColor =
    variant === 'brand'
      ? 'rgba(255, 106, 0, 0.15)'
      : 'rgba(255, 255, 255, 0.08)';

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: baseColor,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          transform: [{ translateX }],
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: shimmerColor,
            width: 100,
          }}
        />
      </Animated.View>
    </View>
  );
}
