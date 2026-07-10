import React, { useState } from 'react';
import { View, TextInput as RNTextInput, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  style?: ViewStyle;
  testID?: string;
}

export function Input({
  label, value, onChangeText, placeholder, secureTextEntry,
  error, multiline, keyboardType, autoCapitalize, style, testID,
}: InputProps) {
  const { colors, typography } = useTheme();
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {label && (
        <Text style={[{ color: colors.text, marginBottom: SPACING.sm }, typography.body]}>
          {label}
        </Text>
      )}
      <RNTextInput
        testID={testID}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[
          {
            width: '100%',
            paddingVertical: 12,
            paddingHorizontal: 14,
            backgroundColor: colors.surface,
            borderWidth: focused ? 2 : 1,
            borderColor: focused ? colors.primary : colors.border,
            borderRadius: RADIUS.md,
            color: colors.text,
            fontSize: 14,
          },
          error ? { borderColor: colors.error } : {},
        ]}
      />
      {error && (
        <Text style={[{ color: colors.error, marginTop: SPACING.xs }, typography.small]}>
          {error}
        </Text>
      )}
    </View>
  );
}
