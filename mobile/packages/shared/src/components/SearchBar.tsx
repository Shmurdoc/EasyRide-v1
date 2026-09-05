import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Animated,
} from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  debounceMs?: number;
  autoFocus?: boolean;
  onCancel?: () => void;
  showCancel?: boolean;
  style?: ViewStyle;
  testID?: string;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = 'Search...',
  debounceMs = 300,
  autoFocus = false,
  onCancel,
  showCancel = false,
  style,
  testID,
}: SearchBarProps) {
  const { colors, typography } = useTheme();
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (focused) {
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [focused]);

  const handleChangeText = (text: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      onChangeText(text);
    }, debounceMs);
  };

  const handleCancel = () => {
    inputRef.current?.blur();
    onCancel?.();
  };

  const borderColor = focused ? COLORS.brand : colors.border;

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            backgroundColor: colors.surfaceAlt,
            borderColor,
            borderWidth: focused ? 1.5 : 1,
            shadowColor: focused ? COLORS.brand : 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: focused ? 0.15 : 0,
            shadowRadius: 6,
            elevation: focused ? 3 : 0,
          },
        ]}
      >
        <Text style={[styles.searchIcon, { color: colors.textMuted }]}>⌕</Text>

        <TextInput
          ref={inputRef}
          testID={testID}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          autoFocus={autoFocus}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            typography.body,
            { color: colors.text },
          ]}
          returnKeyType="search"
          autoCorrect={false}
        />

        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              onChangeText('');
              inputRef.current?.focus();
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={styles.clearButton}
          >
            <Text style={[styles.clearText, { color: colors.textMuted }]}>✕</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {showCancel && (
        <TouchableOpacity
          onPress={handleCancel}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={styles.cancelButton}
        >
          <Text style={[typography.bodyMedium, { color: COLORS.brand }]}>
            Cancel
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 48,
  },
  searchIcon: {
    fontSize: 18,
    marginRight: SPACING.sm,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 15,
    padding: 0,
  },
  clearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearText: {
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    paddingHorizontal: SPACING.sm,
  },
});
