import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface HeaderAction {
  icon?: string;
  label?: string;
  onPress: () => void;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  leftAction?: HeaderAction;
  rightAction?: HeaderAction;
  transparent?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function Header({
  title,
  subtitle,
  leftAction,
  rightAction,
  transparent = false,
  style,
  testID,
}: HeaderProps) {
  const { colors, typography } = useTheme();

  return (
    <View
      testID={testID}
      style={[
        styles.container,
        {
          backgroundColor: transparent ? 'transparent' : colors.bg,
          paddingTop: Platform.OS === 'ios' ? SPACING.xl : SPACING.lg,
        },
        style,
      ]}
    >
      <View style={styles.leftContainer}>
        {leftAction && (
          <TouchableOpacity
            onPress={leftAction.onPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.actionButton}
          >
            {leftAction.icon ? (
              <Text
                style={[
                  styles.actionIcon,
                  { color: transparent ? '#FFFFFF' : colors.text },
                ]}
              >
                {leftAction.icon}
              </Text>
            ) : leftAction.label ? (
              <Text
                style={[
                  typography.bodyMedium,
                  { color: transparent ? '#FFFFFF' : COLORS.brand },
                ]}
              >
                {leftAction.label}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.titleContainer}>
        <Text
          style={[
            typography.h2,
            {
              color: transparent ? '#FFFFFF' : colors.text,
              textAlign: 'center',
            },
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle && (
          <Text
            style={[
              typography.caption,
              {
                color: transparent ? 'rgba(255,255,255,0.7)' : colors.textMuted,
                textAlign: 'center',
                marginTop: 2,
              },
            ]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        )}
      </View>

      <View style={styles.rightContainer}>
        {rightAction && (
          <TouchableOpacity
            onPress={rightAction.onPress}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            style={styles.actionButton}
          >
            {rightAction.icon ? (
              <Text
                style={[
                  styles.actionIcon,
                  { color: transparent ? '#FFFFFF' : colors.text },
                ]}
              >
                {rightAction.icon}
              </Text>
            ) : rightAction.label ? (
              <Text
                style={[
                  typography.bodyMedium,
                  { color: transparent ? '#FFFFFF' : COLORS.brand },
                ]}
              >
                {rightAction.label}
              </Text>
            ) : null}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md,
  },
  leftContainer: {
    width: 60,
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  rightContainer: {
    width: 60,
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: SPACING.xs,
  },
  actionIcon: {
    fontSize: 20,
    fontWeight: '600',
  },
});
