import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

interface AvatarProps {
  name: string;
  size?: number;
  imageUrl?: string;
  borderColor?: string;
}

export function Avatar({ name, size = 48, imageUrl, borderColor }: AvatarProps) {
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2);
  const bgColors = ['#6366f1', '#818cf8', '#4f46e5', '#f59e0b', '#3b82f6', '#16a34a'];
  const bgColor = bgColors[name.length % bgColors.length];

  if (imageUrl) {
    return (
      <Image
        source={{ uri: imageUrl }}
        style={[styles.image, {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: borderColor || '#1a1a1e',
        }]}
      />
    );
  }

  return (
    <View style={[styles.container, {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: bgColor,
      borderColor: borderColor || ADMIN_COLORS.surface,
    }]}>
      <Text style={[styles.initials, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  image: {
    borderWidth: 2,
  },
  initials: {
    color: '#ffffff',
    fontWeight: '700',
  },
});