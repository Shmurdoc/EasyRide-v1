import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../theme';
import { SPACING, RADIUS, COLORS } from '../constants';
import { Card } from './Card';
import { RideStatusBadge } from './RideStatusBadge';
import { PriceDisplay } from './PriceDisplay';

interface RideCardProps {
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  category?: string;
  distance?: number;
  fare?: number;
  driverName?: string;
  time?: string;
  onPress?: () => void;
  style?: ViewStyle;
  testID?: string;
}

export function RideCard({
  pickupAddress,
  dropoffAddress,
  status,
  category,
  distance,
  fare,
  driverName,
  time,
  onPress,
  style,
  testID,
}: RideCardProps) {
  const { colors, typography } = useTheme();

  return (
    <Card variant="default" onPress={onPress} style={style} testID={testID}>
      <View style={styles.header}>
        <RideStatusBadge status={status} />
        {time && (
          <Text style={[typography.caption, { color: colors.textMuted }]}>
            {time}
          </Text>
        )}
      </View>

      <View style={styles.routeContainer}>
        <View style={styles.routeLine}>
          <View style={[styles.dot, { backgroundColor: COLORS.brand }]} />
          <View style={[styles.line, { backgroundColor: colors.border }]} />
          <View style={[styles.dot, { backgroundColor: COLORS.success }]} />
        </View>

        <View style={styles.addresses}>
          <Text
            style={[typography.bodyMedium, { color: colors.text }]}
            numberOfLines={1}
          >
            {pickupAddress}
          </Text>
          <View style={{ height: SPACING.md }} />
          <Text
            style={[typography.bodyMedium, { color: colors.text }]}
            numberOfLines={1}
          >
            {dropoffAddress}
          </Text>
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <View style={styles.footerLeft}>
          {category && (
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {category}
            </Text>
          )}
          {distance && (
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {distance.toFixed(1)} km
            </Text>
          )}
          {driverName && (
            <Text style={[typography.small, { color: colors.textMuted }]}>
              {driverName}
            </Text>
          )}
        </View>
        {fare !== undefined && (
          <PriceDisplay amount={fare} size="sm" />
        )}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  routeContainer: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  routeLine: {
    alignItems: 'center',
    paddingVertical: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  line: {
    width: 1.5,
    flex: 1,
    marginVertical: 4,
    borderRadius: 0.75,
  },
  addresses: {
    flex: 1,
    justifyContent: 'space-between',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
  },
  footerLeft: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
});
