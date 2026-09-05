import React, { useState, useRef } from 'react';
import {
  View,
  TextInput as RNTextInput,
  Text,
  StyleSheet,
  ViewStyle,
  StyleProp,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  placeholderTextColor?: string;
  secureTextEntry?: boolean;
  error?: string;
  hint?: string;
  multiline?: boolean;
  numberOfLines?: number;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'url' | 'decimal-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoComplete?: string;
  autoFocus?: boolean;
  editable?: boolean;
  maxLength?: number;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Input({
  label,
  value,
  onChangeText,
  placeholder,
  placeholderTextColor,
  secureTextEntry = false,
  error,
  hint,
  multiline = false,
  numberOfLines = 1,
  keyboardType = 'default',
  autoCapitalize = 'none',
  autoComplete,
  autoFocus = false,
  editable = true,
  maxLength,
  leftIcon,
  rightIcon,
  onRightIconPress,
  style,
  inputStyle,
  testID,
}: InputProps) {
  const { colors, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secureVisible, setSecureVisible] = useState(false);
  const glowAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setFocused(true);
    Animated.timing(glowAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const handleBlur = () => {
    setFocused(false);
    Animated.timing(glowAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const borderColor = focused
    ? COLORS.brand
    : error
    ? COLORS.error
    : colors.border;

  const borderWidth = focused ? 1.5 : 1;

  return (
    <View style={[styles.container, style]}>
      {label && (
        <Text
          style={[
            typography.label,
            {
              color: colors.textMuted,
              marginBottom: SPACING.xs,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
            },
          ]}
        >
          {label}
        </Text>
      )}
      <Animated.View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor,
            borderWidth,
            borderRadius: RADIUS.md,
            shadowColor: focused ? COLORS.brand : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: focused ? 0.2 : 0,
            shadowRadius: 8,
            elevation: focused ? 4 : 0,
          },
          multiline && { minHeight: (numberOfLines || 3) * 20 + SPACING.base * 2 },
        ]}
      >
        {leftIcon && (
          <View style={[styles.iconContainer, styles.leftIcon]}>
            {leftIcon}
          </View>
        )}
        <RNTextInput
          testID={testID}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor || colors.textMuted}
          secureTextEntry={secureTextEntry && !secureVisible}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete as any}
          autoFocus={autoFocus}
          editable={editable}
          maxLength={maxLength}
          onFocus={handleFocus}
          onBlur={handleBlur}
          style={[
            styles.input,
            typography.body,
            {
              color: colors.text,
              paddingHorizontal: leftIcon ? SPACING.xs : SPACING.md,
              paddingVertical: multiline ? SPACING.md : 0,
              textAlignVertical: multiline ? 'top' : 'center',
            },
            inputStyle,
          ]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setSecureVisible(!secureVisible)}
            style={[styles.iconContainer, styles.rightIcon]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {secureVisible ? 'Hide' : 'Show'}
            </Text>
          </TouchableOpacity>
        )}
        {rightIcon && !secureTextEntry && (
          <TouchableOpacity
            onPress={onRightIconPress}
            disabled={!onRightIconPress}
            style={[styles.iconContainer, styles.rightIcon]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            {rightIcon}
          </TouchableOpacity>
        )}
      </Animated.View>
      {error && (
        <Text
          style={[
            typography.caption,
            { color: COLORS.error, marginTop: SPACING.xs },
          ]}
        >
          {error}
        </Text>
      )}
      {!error && hint && (
        <Text
          style={[
            typography.caption,
            { color: colors.textMuted, marginTop: SPACING.xs },
          ]}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 44,
    height: 48,
  },
  leftIcon: {
    marginLeft: SPACING.xs,
  },
  rightIcon: {
    marginRight: SPACING.xs,
  },
});
