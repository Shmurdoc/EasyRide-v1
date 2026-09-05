import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { drivers as driversApi } from '../../../packages/shared/src/api/index';
import { approveDriver, rejectDriver } from '../api/admin';
import type { User } from '@easyryde/shared';

interface Props {
  route: { params: { id: string; driver?: any } };
  navigation: any;
}

export default function DriverDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { id, driver: driverParam } = route.params;
  const [driver, setDriver] = useState<any>(driverParam ?? null);
  const [loading, setLoading] = useState(!driverParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driverParam) return;
    if (!id) { setError('No driver ID provided'); setLoading(false); return; }
    setLoading(true);
    driversApi.get(id)
      .then((data) => setDriver(data))
      .catch((err) => setError(err.message || 'Failed to load driver'))
      .finally(() => setLoading(false));
  }, [id, driverParam]);

  const handleApprove = async () => {
    Alert.alert('Approve Driver', 'Approve this driver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: async () => {
        try { await approveDriver(id); navigation.goBack(); } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const handleReject = async () => {
    Alert.alert('Reject Driver', 'Reject this driver?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Reject', style: 'destructive', onPress: async () => {
        try { await rejectDriver(id); navigation.goBack(); } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  };

  const handleSuspend = () => {
    Alert.alert('Suspend Driver', 'Suspend this driver account?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Suspend', style: 'destructive', onPress: () => Alert.alert('Success', 'Driver suspended') },
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
            <Text style={styles.headerTitle}>Driver</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.brand} />
        </View>
      </View>
    );
  }

  if (error || !driver) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Driver</Text>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={48} color={COLORS.error} />
          <Text style={[styles.errorText, { color: COLORS.text }]}>{error || 'Driver not found'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[styles.errorLink, { color: COLORS.brand }]}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const profile = driver.driverProfile;
  const vehicle = driver.vehicle;
  const status = driver.is_online ? 'online' : 'offline';
  const isApproved = profile?.is_approved;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{driver.name}</Text>
            <Badge variant={isApproved ? (status === 'online' ? 'online' : 'offline') : 'pending'} label={isApproved ? status.toUpperCase() : 'PENDING'} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.statsRow, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.brand }]}>{profile?.rating?.toFixed(1) || '—'}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: COLORS.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.text }]}>{profile?.total_trips || 0}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Total Trips</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: COLORS.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: COLORS.success }]}>R{(profile?.total_earnings || 0).toLocaleString()}</Text>
            <Text style={[styles.statLabel, { color: COLORS.textMuted }]}>Earnings</Text>
          </View>
        </View>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Personal Information</Text>
          <InfoRow label="Name" value={driver.name} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Email" value={driver.email} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Phone" value={driver.phone_number || '—'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Joined" value={new Date(driver.created_at).toLocaleDateString()} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
        </Card>

        {vehicle && (
          <Card>
            <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Vehicle Information</Text>
            <InfoRow label="Vehicle" value={`${vehicle.make} ${vehicle.model} (${vehicle.year})`} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
            <InfoRow label="Color" value={vehicle.color} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
            <InfoRow label="Plate" value={vehicle.license_plate} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
            <InfoRow label="Category" value={vehicle.category} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          </Card>
        )}

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Document Verification</Text>
          <InfoRow label="Approved" value={profile?.is_approved ? 'Yes' : 'No'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Verified" value={profile?.is_verified ? 'Yes' : 'No'} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          {profile?.license_number && <InfoRow label="License" value={profile.license_number} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />}
          {profile?.license_expiry && <InfoRow label="License Expiry" value={new Date(profile.license_expiry).toLocaleDateString()} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />}
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Earnings Summary</Text>
          <InfoRow label="Total Earnings" value={`R${(profile?.total_earnings || 0).toLocaleString()}`} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Total Trips" value={String(profile?.total_trips || 0)} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
          <InfoRow label="Avg per Trip" value={`R${profile?.total_trips ? ((profile.total_earnings || 0) / profile.total_trips).toFixed(0) : '0'}`} textColor={COLORS.text} mutedColor={COLORS.textMuted} borderColor={COLORS.border} />
        </Card>

        <View style={styles.actions}>
          {!isApproved && (
            <>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success }]} onPress={handleApprove}>
                <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                <Text style={styles.actionText}>Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error }]} onPress={handleReject}>
                <Ionicons name="close-circle" size={18} color="#ffffff" />
                <Text style={styles.actionText}>Reject</Text>
              </TouchableOpacity>
            </>
          )}
          {isApproved && (
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning }]} onPress={handleSuspend}>
              <Ionicons name="ban" size={18} color="#ffffff" />
              <Text style={styles.actionText}>Suspend</Text>
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
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  errorText: { fontSize: 16, marginTop: 16 },
  errorLink: { fontSize: 14, marginTop: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, borderRadius: 16, padding: 16, borderWidth: 1 },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700' },
  statLabel: { fontSize: 11, marginTop: 4 },
  statDivider: { width: 1, marginVertical: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
