import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';
import { Card } from './Card';
import { Avatar } from './Avatar';
import { Rating } from './Rating';

interface DriverCardProps {
  name: string;
  rating: number;
  vehicleInfo?: string;
  licensePlate?: string;
  vehicleColor?: string;
  distance?: number;
  eta?: number;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function DriverCard({
  name,
  rating,
  vehicleInfo,
  licensePlate,
  vehicleColor,
  distance,
  eta,
  onPress,
  style,
  testID,
}: DriverCardProps) {
  const { colors, typography } = useTheme();

  return (
    <Card variant="default" onPress={onPress} style={style} testID={testID}>
      <View style={styles.container}>
        <Avatar name={name} size="lg" />

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text
              style={[typography.h3, { color: colors.text }]}
              numberOfLines={1}
            >
              {name}
            </Text>
          </View>

          <Rating score={rating} size="sm" />

          {vehicleInfo && (
            <Text
              style={[typography.small, { color: colors.textMuted, marginTop: 2 }]}
              numberOfLines={1}
            >
              {vehicleInfo}
            </Text>
          )}

          <View style={styles.metaRow}>
            {licensePlate && (
              <View
                style={[
                  styles.plateTag,
                  { backgroundColor: colors.surfaceAlt, borderColor: colors.border },
                ]}
              >
                <Text style={[typography.xs, { color: colors.text }]}>
                  {licensePlate}
                </Text>
              </View>
            )}
            {vehicleColor && (
              <Text style={[typography.small, { color: colors.textMuted }]}>
                {vehicleColor}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.rightSection}>
          {distance !== undefined && (
            <View style={styles.statItem}>
              <Text style={[typography.xs, { color: colors.textMuted }]}>
                {distance < 1
                  ? `${Math.round(distance * 1000)}m`
                  : `${distance.toFixed(1)}km`}
              </Text>
            </View>
          )}
          {eta !== undefined && (
            <View style={[styles.etaBadge, { backgroundColor: 'rgba(255, 106, 0, 0.12)' }]}>
              <Text style={[typography.xs, { color: COLORS.brand, fontWeight: '700' }]}>
                {eta} min
              </Text>
            </View>
          )}
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  plateTag: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 2,
    borderRadius: RADIUS.xs,
    borderWidth: 1,
  },
  rightSection: {
    alignItems: 'flex-end',
    gap: SPACING.xs,
  },
  statItem: {
    alignItems: 'flex-end',
  },
  etaBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
  },
});
