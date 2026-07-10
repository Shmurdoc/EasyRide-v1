import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

export default function LoadingSpinner() {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
});
