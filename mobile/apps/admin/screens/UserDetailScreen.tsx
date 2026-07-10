import React from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';

interface UserDetailParams {
  user: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role: string;
    is_active: boolean;
    created_at: string;
    last_login_at?: string;
  };
}

interface Props {
  route: { params: UserDetailParams };
  navigation: any;
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={infoStyles.row}>
      <Text style={infoStyles.label}>{label}</Text>
      <Text style={infoStyles.value}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  label: { fontSize: 14, color: 'rgba(255,255,255,0.5)' },
  value: { fontSize: 14, color: '#ffffff', fontWeight: '500' },
});

export function UserDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { user } = route.params;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Avatar name={user.name} size={48} />
            <Text style={styles.headerTitle}>{user.name}</Text>
            <Badge variant={user.is_active ? 'active' : 'offline'} label={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Name" value={user.name} />
          <InfoRow label="Email" value={user.email} />
          <InfoRow label="Phone" value={user.phone || '—'} />
          <InfoRow label="Role" value={user.role} />
          <InfoRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} />
          <InfoRow label="Last Active" value={user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'} />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Ride Summary</Text>
          <InfoRow label="Total Trips" value="247" />
          <InfoRow label="Completed" value="239 (96.8%)" />
          <InfoRow label="Cancelled" value="8 (3.2%)" />
          <InfoRow label="Avg Rating Given" value="4.8/5" />
        </Card>

        <Card>
          <Text style={styles.sectionTitle}>Spending</Text>
          <InfoRow label="Total Spent" value="R18,450" />
          <InfoRow label="This Month" value="R1,250" />
          <InfoRow label="Avg per Ride" value="R74.70" />
        </Card>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="call" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble" size={18} color="#ffffff" />
            <Text style={styles.actionText}>Message</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
