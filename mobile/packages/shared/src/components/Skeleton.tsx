import React, { useRef, useEffect } from 'react';
import {
  Animated,
  View,
  ViewStyle,
  DimensionValue,
} from 'react-native';
import { useTheme } from '../theme';
import { COLORS, RADIUS, SPACING } from '../constants';

interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export function Skeleton({
  width = '100%',
  height = 16,
  borderRadius = RADIUS.sm,
  style,
}: SkeletonProps) {
  const { colors } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 1500,
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

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: colors.surfaceAlt,
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
            backgroundColor: 'transparent',
            position: 'relative',
          }}
        >
          <View
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              opacity: 0.06,
              backgroundColor: '#FFFFFF',
            }}
          />
        </View>
      </Animated.View>
    </View>
  );
}

export function SkeletonCard({ style }: { style?: ViewStyle }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: RADIUS.lg,
          padding: SPACING.base,
          gap: SPACING.md,
          borderWidth: 1,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Skeleton width="50%" height={20} borderRadius={RADIUS.sm} />
      <Skeleton width="100%" height={14} borderRadius={RADIUS.xs} />
      <Skeleton width="75%" height={14} borderRadius={RADIUS.xs} />
      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
        <Skeleton width={80} height={32} borderRadius={RADIUS.full} />
        <Skeleton width={60} height={32} borderRadius={RADIUS.full} />
      </View>
    </View>
  );
}

export function SkeletonCircle({
  size = 48,
  style,
}: {
  size?: number;
  style?: ViewStyle;
}) {
  return <Skeleton width={size} height={size} borderRadius={size / 2} style={style} />;
}
