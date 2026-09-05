import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { COLORS, RADIUS } from '../constants';

interface ProgressBarProps {
  progress: number;
  height?: number;
  color?: string;
  backgroundColor?: string;
  animated?: boolean;
  showTrack?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function ProgressBar({
  progress,
  height = 4,
  color = COLORS.brand,
  backgroundColor,
  animated = true,
  showTrack = true,
  style,
  testID,
}: ProgressBarProps) {
  const { colors } = useTheme();
  const widthAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  const clampedProgress = Math.min(Math.max(progress, 0), 100);
  const bgColor = backgroundColor || colors.surfaceAlt;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(widthAnim, {
          toValue: clampedProgress,
          useNativeDriver: false,
          speed: 40,
          bounciness: 4,
        }),
        Animated.loop(
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.4,
              duration: 1200,
              useNativeDriver: true,
            }),
          ])
        ),
      ]).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated]);

  const fillWidth = animated
    ? widthAnim.interpolate({
        inputRange: [0, 100],
        outputRange: ['0%', '100%'],
        extrapolate: 'clamp',
      })
    : `${clampedProgress}%`;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          height,
          backgroundColor: bgColor,
          borderRadius: height / 2,
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Animated.View
        style={[
          styles.fill,
          {
            width: fillWidth as any,
            height: '100%',
            backgroundColor: color,
            borderRadius: height / 2,
          },
        ]}
      >
        {showTrack && clampedProgress > 0 && (
          <Animated.View
            style={[
              styles.glow,
              {
                opacity: glowAnim,
                backgroundColor: color,
                borderRadius: height / 2,
              },
            ]}
          />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  fill: {
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 20,
    opacity: 0.4,
  },
});
