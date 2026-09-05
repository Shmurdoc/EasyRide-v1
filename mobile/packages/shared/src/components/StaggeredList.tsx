import React, { useRef, useEffect } from 'react';
import { Animated, View, ViewStyle } from 'react-native';

interface StaggeredListProps {
  children: React.ReactNode[];
  staggerDelay?: number;
  initialOffset?: number;
  springConfig?: {
    speed?: number;
    bounciness?: number;
  };
  style?: ViewStyle;
  testID?: string;
}

export function StaggeredList({
  children,
  staggerDelay = 60,
  initialOffset = 20,
  springConfig = { speed: 14, bounciness: 6 },
  style,
  testID,
}: StaggeredListProps) {
  const animValues = useRef(
    children.map(() => new Animated.Value(0))
  ).current;

  useEffect(() => {
    const animations = animValues.map((anim, index) =>
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        speed: springConfig.speed,
        bounciness: springConfig.bounciness,
        delay: index * staggerDelay,
      })
    );

    Animated.stagger(staggerDelay, animations).start();
  }, [children.length]);

  return (
    <View testID={testID} style={style}>
      {children.map((child, index) => (
        <Animated.View
          key={index}
          style={{
            opacity: animValues[index],
            transform: [
              {
                translateY: animValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [initialOffset, 0],
                }),
              },
              {
                scale: animValues[index].interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          }}
        >
          {child}
        </Animated.View>
      ))}
    </View>
  );
}
