import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Avatar } from '../common/Avatar';
import { Badge } from '../common/Badge';
import { ADMIN_COLORS } from '../../constants/theme';

interface TopDriver {
  id: string;
  name: string;
  trips: number;
  status: 'online' | 'busy' | 'offline';
}

interface TopDriversProps {
  drivers: TopDriver[];
}

export default function TopDrivers({ drivers }: TopDriversProps) {
  return (
    <Card>
      <Text style={styles.title}>Top Drivers Today</Text>
      {drivers.slice(0, 5).map((driver, idx) => (
        <View key={driver.id} style={styles.item}>
          <Text style={styles.rank}>#{idx + 1}</Text>
          <Avatar name={driver.name} size={36} />
          <View style={styles.info}>
            <Text style={styles.name}>{driver.name}</Text>
            <Text style={styles.trips}>{driver.trips} trips</Text>
          </View>
          <Badge variant={driver.status} label={driver.status} />
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  rank: { fontSize: 13, fontWeight: '700', color: ADMIN_COLORS.accent, width: 28 },
  info: { flex: 1, marginLeft: 10 },
  name: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  trips: { fontSize: 11, color: 'rgba(255,255,255,0.45)' },
});
