import React from 'react';
import { Text, TextStyle, View, StyleSheet } from 'react-native';
import { GRADIENTS } from '../constants';

let LinearGradient: any = null;
try {
  LinearGradient = require('expo-linear-gradient').LinearGradient;
} catch (e) {
  // expo-linear-gradient not linked in release builds — fall back to plain Text
}

interface GradientTextProps {
  colors?: readonly [string, string, ...string[]];
  start?: { x: number; y: number };
  end?: { x: number; y: number };
  style?: TextStyle;
  numberOfLines?: number;
  ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
  children: React.ReactNode;
}

export function GradientText({
  colors = GRADIENTS.primary,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 0 },
  style,
  numberOfLines,
  ellipsizeMode,
  children,
}: GradientTextProps) {
  if (!LinearGradient) {
    // Fallback: render with first color from gradient
    return (
      <Text style={[style, { color: (colors as string[])[0] || GRADIENTS.primary[0] }]} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>
        {children}
      </Text>
    );
  }

  return (
    <View style={{ overflow: 'hidden' }}>
      <Text style={[style, { color: 'transparent' }]} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>{children}</Text>
      <LinearGradient
        colors={colors as unknown as string[]}
        start={start}
        end={end}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Text style={[style, { color: 'transparent' }]} numberOfLines={numberOfLines} ellipsizeMode={ellipsizeMode}>{children}</Text>
      </LinearGradient>
    </View>
  );
}
