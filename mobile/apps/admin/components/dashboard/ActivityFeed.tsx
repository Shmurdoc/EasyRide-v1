import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { ADMIN_COLORS } from '../../constants/theme';

interface Activity {
  type: string;
  message: string;
  time: string;
}

interface ActivityFeedProps {
  items: Activity[];
}

const ACTIVITY_COLORS: Record<string, string> = {
  ride_completed: ADMIN_COLORS.green,
  driver_online: ADMIN_COLORS.blue,
  new_user: ADMIN_COLORS.accent,
  surge_active: ADMIN_COLORS.orange,
  ride_request: ADMIN_COLORS.accent,
};

export default function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <Card>
      <Text style={styles.title}>Recent Activity</Text>
      {items.slice(0, 5).map((activity, idx) => (
        <View key={idx} style={styles.item}>
          <View style={[styles.dot, { backgroundColor: ACTIVITY_COLORS[activity.type] || ADMIN_COLORS.accent }]} />
          <View style={styles.content}>
            <Text style={styles.message}>{activity.message}</Text>
            <Text style={styles.time}>{activity.time}</Text>
          </View>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 12 },
  item: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 4, marginRight: 10 },
  content: { flex: 1 },
  message: { fontSize: 14, color: '#ffffff' },
  time: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
});
