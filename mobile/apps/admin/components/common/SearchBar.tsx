import React from 'react';
import { View, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ADMIN_COLORS } from '../../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onSubmitEditing?: () => void;
  placeholder?: string;
}

export function SearchBar({ value, onChangeText, onSubmitEditing, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <Ionicons name="search" size={18} color="rgba(255,255,255,0.35)" />
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmitEditing}
        placeholder={placeholder}
        placeholderTextColor="rgba(255,255,255,0.3)"
        returnKeyType="search"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: '#ffffff',
    fontSize: 15,
  },
});
