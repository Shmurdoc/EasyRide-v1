import React, { useState, useEffect } from 'react';
import {
  ScrollView, View, Text, TouchableOpacity, StyleSheet, StatusBar, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Avatar } from '../components/common/Avatar';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { api } from '../../../packages/shared/src/api/index';

interface DriverDetailParams {
  id?: string;
  driver?: {
    id: string;
    name: string;
    email: string;
    phone: string;
    is_online: boolean;
    created_at: string;
    driverProfile?: {
      rating?: number;
      total_trips?: number;
      total_earnings?: number;
      is_approved?: boolean;
      is_verified?: boolean;
      background_check?: boolean;
      approved_at?: string;
    };
    vehicle?: {
      make: string;
      model: string;
      year: number;
      color: string;
      license_plate: string;
      vehicle_type: string;
    };
  };
}

interface Props {
  route: { params: DriverDetailParams };
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

export function DriverDetailScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { id, driver: driverParam } = route.params;
  const [driver, setDriver] = useState<any>(driverParam ?? null);
  const [loading, setLoading] = useState(!driverParam);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driverParam) return;
    if (!id) { setError('No driver ID provided'); setLoading(false); return; }
    setLoading(true);
    api.get(`/drivers/${id}`)
      .then((res: any) => setDriver(res.user))
      .catch((err: any) => setError(err.message || 'Failed to load driver'))
      .finally(() => setLoading(false));
  }, [id, driverParam]);

  if (loading) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Driver</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={ADMIN_COLORS.accent} />
        </View>
      </View>
    );
  }

  if (error || !driver) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <View style={styles.headerContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <View style={styles.headerCenter}>
              <Text style={styles.headerTitle}>Driver</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>
        </LinearGradient>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ color: '#fff', fontSize: 16 }}>{error || 'Driver not found'}</Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ color: ADMIN_COLORS.accent, fontSize: 14 }}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const profile = driver.driverProfile;
  const vehicle = driver.vehicle;
  const status = driver.is_online ? 'online' : 'offline';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{driver.name}</Text>
            <Badge variant={status as any} label={status.toUpperCase()} />
          </View>
          <View style={{ width: 36 }} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.body} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }} showsVerticalScrollIndicator={false}>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.rating?.toFixed(1) || '—'}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{profile?.total_trips || 0}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>R{(profile?.total_earnings || 0).toLocaleString()}</Text>
            <Text style={styles.statLabel}>Total Earnings</Text>
          </View>
        </View>

        <Card>
          <Text style={styles.sectionTitle}>Personal Information</Text>
          <InfoRow label="Name" value={driver.name} />
          <InfoRow label="Email" value={driver.email} />
          <InfoRow label="Phone" value={driver.phone} />
          <InfoRow label="Joined" value={new Date(driver.created_at).toLocaleDateString()} />
        </Card>

        {vehicle && (
          <Card>
            <Text style={styles.sectionTitle}>Vehicle Information</Text>
            <InfoRow label="Vehicle" value={`${vehicle.make} ${vehicle.model} (${vehicle.year})`} />
            <InfoRow label="Color" value={vehicle.color} />
            <InfoRow label="Plate" value={vehicle.license_plate} />
            <InfoRow label="Type" value={vehicle.vehicle_type} />
          </Card>
        )}

        <Card>
          <Text style={styles.sectionTitle}>Performance</Text>
          <InfoRow label="Acceptance Rate" value="96%" />
          <InfoRow label="Cancellation Rate" value="2.1%" />
          <InfoRow label="Online Hours Today" value="6.5h" />
        </Card>

        {profile && (
          <Card>
            <Text style={styles.sectionTitle}>Verification</Text>
            <InfoRow label="Approved" value={profile.is_approved ? 'Yes' : 'No'} />
            <InfoRow label="Verified" value={profile.is_verified ? 'Yes' : 'No'} />
            <InfoRow label="Background Check" value={profile.background_check ? 'Passed' : 'Not done'} />
            {profile.approved_at && <InfoRow label="Approved At" value={new Date(profile.approved_at).toLocaleDateString()} />}
          </Card>
        )}

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
  headerCenter: { alignItems: 'center', gap: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' },
  statItem: { alignItems: 'center', flex: 1 },
  statValue: { fontSize: 20, fontWeight: '700', color: ADMIN_COLORS.accent },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16, marginBottom: 32 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 14, gap: 8 },
  actionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
});
