import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Avatar } from '../common/Avatar';
import { ADMIN_COLORS } from '../../constants/theme';
import type { AdminUser } from '../../api/types';

interface UserCardProps {
  user: AdminUser;
  onPress?: () => void;
}

export default function UserCard({ user, onPress }: UserCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      <Card style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Avatar name={user.name} size={48} />
            <View style={styles.info}>
              <Text style={styles.name}>{user.name}</Text>
              <Text style={styles.email}>{user.email}</Text>
            </View>
          </View>
          <Badge variant={user.is_active ? 'active' : 'offline'} label={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user.role}</Text>
            <Text style={styles.statLabel}>Role</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{new Date(user.created_at).getFullYear()}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statValue}>{user.phone || '—'}</Text>
            <Text style={styles.statLabel}>Phone</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.viewBtn} onPress={onPress}>
          <Text style={styles.viewBtnText}>View Profile</Text>
        </TouchableOpacity>
      </Card>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  info: { marginLeft: 10, flex: 1 },
  name: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  email: { fontSize: 12, color: 'rgba(255,255,255,0.45)' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 10 },
  stat: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 13, fontWeight: '600', color: '#ffffff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  viewBtn: { backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  viewBtnText: { color: '#ffffff', fontWeight: '700', fontSize: 14 },
});
