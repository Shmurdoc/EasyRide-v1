import React, { useRef, useEffect } from 'react';
import { Animated, View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { COLORS, SPACING, SHADOWS } from '../constants';

interface LoadingOverlayProps {
  message?: string;
  fullScreen?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function LoadingOverlay({
  message,
  fullScreen = true,
  style,
  testID,
}: LoadingOverlayProps) {
  const { colors, typography } = useTheme();
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0.4)).current;
  const dotAnims = useRef([
    new Animated.Value(0.3),
    new Animated.Value(0.3),
    new Animated.Value(0.3),
  ]).current;

  useEffect(() => {
    const spin = Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        useNativeDriver: true,
      })
    );

    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.4,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    const dots = Animated.loop(
      Animated.stagger(
        200,
        dotAnims.map((anim) =>
          Animated.sequence([
            Animated.timing(anim, {
              toValue: 1,
              duration: 400,
              useNativeDriver: true,
            }),
            Animated.timing(anim, {
              toValue: 0.3,
              duration: 400,
              useNativeDriver: true,
            }),
          ])
        )
      )
    );

    spin.start();
    pulse.start();
    dots.start();

    return () => {
      spin.stop();
      pulse.stop();
      dots.stop();
    };
  }, []);

  const spinValue = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <View
      testID={testID}
      style={[
        fullScreen ? styles.fullScreen : styles.inline,
        { backgroundColor: fullScreen ? colors.bg : 'transparent' },
        style,
      ]}
    >
      <View style={styles.spinnerContainer}>
        <Animated.View
          style={[
            styles.outerRing,
            {
              transform: [{ rotate: spinValue }],
              opacity: pulseAnim,
            },
          ]}
        >
          <View
            style={[
              styles.arc,
              {
                borderTopColor: COLORS.brand,
                borderRightColor: 'transparent',
                borderBottomColor: 'transparent',
                borderLeftColor: 'transparent',
              },
            ]}
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.glow,
            {
              opacity: pulseAnim,
              backgroundColor: COLORS.brand,
            },
          ]}
        />

        <View style={styles.centerDot}>
          <Text style={[styles.logoText, { color: COLORS.brand }]}>E</Text>
        </View>
      </View>

      {message && (
        <Animated.Text
          style={[
            typography.body,
            {
              color: colors.textMuted,
              marginTop: SPACING.lg,
              opacity: pulseAnim,
              letterSpacing: 1,
            },
          ]}
        >
          {message}
        </Animated.Text>
      )}

      <View style={styles.dotsRow}>
        {dotAnims.map((anim, index) => (
          <Animated.View
            key={index}
            style={[
              styles.dot,
              {
                backgroundColor: COLORS.brand,
                opacity: anim,
                transform: [
                  {
                    scale: anim.interpolate({
                      inputRange: [0.3, 1],
                      outputRange: [0.7, 1.2],
                    }),
                  },
                ],
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inline: {
    padding: SPACING.xl,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerContainer: {
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerRing: {
    position: 'absolute',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: 'transparent',
  },
  arc: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
  },
  glow: {
    position: 'absolute',
    width: 48,
    height: 48,
    borderRadius: 24,
    opacity: 0.15,
  },
  centerDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '800',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: SPACING.base,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
