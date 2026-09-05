import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useAuth } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { users as usersApi } from '../../../packages/shared/src/api/index';
import type { User } from '@easyryde/shared';

interface Props {
  route: { params: { id: string; user?: User } };
  navigation: any;
}

export default function UserDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { id, user: userParam } = route.params;
  const [user, setUser] = useState<User | null>(userParam ?? null);
  const [loading, setLoading] = useState(!userParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (userParam) return;
    if (!id) { setError('No user ID provided'); setLoading(false); return; }
    setLoading(true);
    usersApi.get(id)
      .then((data) => setUser(data))
      .catch((err) => setError(err.message || 'Failed to load user'))
      .finally(() => setLoading(false));
  }, [id, userParam]);

  const handleSuspend = () => {
    Alert.alert('Suspend User', 'Suspend this user account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('Success', 'User suspended') },
    ]);
  };

  const handleActivate = () => {
    Alert.alert('Activate User', 'Activate this user account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Activate', onPress: () => Alert.alert('Success', 'User activated') },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </View>
    );
  }

  if (error || !user) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>User</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={[styles.errorText, { color: COLORS.text }]}>{error || 'User not found'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.errorLink, { color: COLORS.brand }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.brand;
      case 'driver': return COLORS.info;
      case 'rider': return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  const roleColor = getRoleColor(user.role);

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Avatar name={user.name} size={48} />
            <Text style={styles.headerTitle}>{user.name}</Text>
            <Badge variant={user.is_active ? 'online' : 'offline'} label={user.is_active ? 'ACTIVE' : 'INACTIVE'} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Personal Information</Text>
          <InfoRow label="Name" value={user.name} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Email" value={user.email} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Phone" value={user.phone_number || '—'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <View style={[infoStyles.row, { borderBottomColor: COLORS.border }]}>
            <Text style={[infoStyles.label, { color: COLORS.textMuted }]}>Role</Text>
            <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
              <Text style={[styles.roleText, { color: roleColor }]}>{user.role.toUpperCase()}</Text>
            </View>
          </View>
          <InfoRow label="Joined" value={new Date(user.created_at).toLocaleDateString()} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Account Status</Text>
          <InfoRow label="Active" value={user.is_active ? 'Yes' : 'No'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Online" value={user.is_online ? 'Yes' : 'No'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Last Updated" value={new Date(user.updated_at).toLocaleDateString()} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Ride Summary</Text>
          <InfoRow label="Total Trips" value={String(user.total_trips || 0)} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Avg Rating" value={user.average_rating ? `${user.average_rating.toFixed(1)}/5` : '—'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
        </Card>

        <View style={styles.actions}>
          {user.is_active ? (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={handleSuspend}>
              <Ionicons name="ban" size={18} color="#ffffff" />
              <Text style={styles.actionText}>Suspend</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleActivate}>
              <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
              <Text style={styles.actionText}>Activate</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, textColor, mutedColor, borderColor }: { label: string; value: string; textColor: string; mutedColor: string; borderColor: string }) {
  return (
    <View style={[infoStyles.row, { borderBottomColor: borderColor }]}>
      <Text style={[infoStyles.label, { color: mutedColor }]}>{label}</Text>
      <Text style={[infoStyles.value, { color: textColor }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1 },
  label: { fontSize: 14 },
  value: { fontSize: 14, fontWeight: '500' },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { alignItems: 'center', gap: 6 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginTop: 16 },
  errorLink: { fontSize: 14, marginTop: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  roleBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  roleText: { fontSize: 9, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
