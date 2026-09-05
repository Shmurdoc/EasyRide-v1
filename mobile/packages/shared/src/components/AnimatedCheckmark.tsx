import React, { useRef, useEffect } from 'react';
import { Animated, View, StyleSheet, ViewStyle } from 'react-native';
import { COLORS } from '../constants';

interface AnimatedCheckmarkProps {
  size?: number;
  color?: string;
  duration?: number;
  style?: ViewStyle;
  testID?: string;
}

export function AnimatedCheckmark({
  size = 80,
  color = COLORS.success,
  duration = 600,
  style,
  testID,
}: AnimatedCheckmarkProps) {
  const circleScale = useRef(new Animated.Value(0)).current;
  const circleOpacity = useRef(new Animated.Value(0)).current;
  const checkScale = useRef(new Animated.Value(0)).current;
  const checkOpacity = useRef(new Animated.Value(0)).current;
  const burstAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(circleScale, {
          toValue: 1,
          duration: duration * 0.4,
          useNativeDriver: true,
        }),
        Animated.timing(circleOpacity, {
          toValue: 1,
          duration: duration * 0.3,
          useNativeDriver: true,
        }),
        Animated.timing(burstAnim, {
          toValue: 1,
          duration: duration * 0.5,
          useNativeDriver: true,
        }),
      ]),
      Animated.parallel([
        Animated.spring(checkScale, {
          toValue: 1,
          useNativeDriver: true,
          speed: 12,
          bounciness: 4,
        }),
        Animated.timing(checkOpacity, {
          toValue: 1,
          duration: duration * 0.2,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, []);

  const circleSize = size * 0.75;
  const checkWidth = size * 0.35;
  const checkHeight = size * 0.2;

  const burstScale = burstAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 1.8],
  });

  const burstOpacity = burstAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.3, 0],
  });

  return (
    <View
      testID={testID}
      style={[{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }, style]}
    >
      <Animated.View
        style={[
          styles.burst,
          {
            width: circleSize * 1.5,
            height: circleSize * 1.5,
            borderRadius: circleSize * 0.75,
            backgroundColor: color,
            opacity: burstOpacity,
            transform: [{ scale: burstScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.circle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
            borderWidth: 3,
            borderColor: color,
            opacity: circleOpacity,
            transform: [{ scale: circleScale }],
          },
        ]}
      />

      <Animated.View
        style={[
          styles.checkContainer,
          {
            opacity: checkOpacity,
            transform: [{ scale: checkScale }],
          },
        ]}
      >
        <View
          style={[
            styles.checkLine,
            {
              width: checkWidth * 0.5,
              height: 3,
              backgroundColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '-45deg' }, { translateX: 2 }, { translateY: 1 }],
            },
          ]}
        />
        <View
          style={[
            styles.checkLine,
            {
              width: checkWidth,
              height: 3,
              backgroundColor: color,
              borderRadius: 1.5,
              transform: [{ rotate: '45deg' }, { translateX: -4 }, { translateY: -1 }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  burst: {
    position: 'absolute',
  },
  circle: {
    position: 'absolute',
  },
  checkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkLine: {
    position: 'absolute',
  },
});
