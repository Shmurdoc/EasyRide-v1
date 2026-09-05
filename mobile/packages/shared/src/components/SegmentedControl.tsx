import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface Tab {
  key: string;
  label: string;
}

interface SegmentedControlProps {
  tabs: Tab[];
  selected: string;
  onSelect: (key: string) => void;
  style?: ViewStyle;
  testID?: string;
}

export function SegmentedControl({
  tabs,
  selected,
  onSelect,
  style,
  testID,
}: SegmentedControlProps) {
  const { colors, typography } = useTheme();
  const [containerWidth, setContainerWidth] = useState(0);
  const translateX = useRef(new Animated.Value(0)).current;
  const indicatorWidth = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (containerWidth > 0) {
      const tabWidth = containerWidth / tabs.length;
      const selectedIndex = tabs.findIndex((t) => t.key === selected);
      const index = selectedIndex >= 0 ? selectedIndex : 0;

      Animated.parallel([
        Animated.spring(translateX, {
          toValue: tabWidth * index,
          useNativeDriver: true,
          speed: 40,
          bounciness: 4,
        }),
        Animated.spring(indicatorWidth, {
          toValue: tabWidth,
          useNativeDriver: false,
          speed: 40,
          bounciness: 4,
        }),
      ]).start();
    }
  }, [selected, containerWidth, tabs.length]);

  const tabWidth = containerWidth / tabs.length;

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceAlt,
          borderRadius: RADIUS.md,
          padding: 3,
        },
        style,
      ]}
      onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
    >
      <Animated.View
        style={[
          styles.indicator,
          {
            width: indicatorWidth as any,
            backgroundColor: colors.surface,
            borderRadius: RADIUS.sm - 1,
            transform: [{ translateX }],
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.08,
            shadowRadius: 4,
            elevation: 2,
          },
        ]}
      />

      {tabs.map((tab) => {
        const isSelected = tab.key === selected;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onSelect(tab.key)}
            style={styles.tab}
          >
            <Text
              style={[
                typography.small,
                {
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? COLORS.brand : colors.textMuted,
                  textAlign: 'center',
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    position: 'relative',
  },
  indicator: {
    position: 'absolute',
    top: 3,
    bottom: 3,
    left: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
