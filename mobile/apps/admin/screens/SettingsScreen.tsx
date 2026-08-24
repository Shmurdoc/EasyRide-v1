import React, { useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { Card } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { Avatar } from '../components/common/Avatar';

type Nav = NativeStackNavigationProp<any>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { settings, loading, error, refreshing, refresh, updateSetting } = useAdminSettings();
  const [notifications, setNotifications] = useState({ push: true, email: true, sms: false });

  const baseFare = settings?.base_fare ?? 25;
  const perKm = settings?.per_km_rate ?? 8.5;
  const perMin = settings?.per_minute_rate ?? 1.5;
  const maxSurge = settings?.max_surge ?? 3.0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>System configuration</Text>
      </LinearGradient>

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.profileSection}>
            <Avatar name="Thabo Molefe" size={60} imageUrl="https://ui-avatars.com/api/?name=Thabo+Molefe&background=6366f1&color=fff&size=120" />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>Thabo Molefe</Text>
              <Text style={styles.profileRole}>Operations Manager</Text>
            </View>
          </View>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={18} color={ADMIN_COLORS.primary} />
              <Text style={styles.sectionTitle}>Pricing Settings</Text>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={styles.settingLabel}>Base Fare</Text>
                <Text style={styles.settingValue}>R{baseFare.toFixed(0)}.00</Text>
              </View>
              <View style={styles.slider}>
                <View style={[styles.sliderFill, { width: `${(baseFare / 40) * 100}%` }]} />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={styles.settingLabel}>Per KM Rate</Text>
                <Text style={styles.settingValue}>R{perKm.toFixed(1)}</Text>
              </View>
              <View style={styles.slider}>
                <View style={[styles.sliderFill, { width: `${(perKm / 15) * 100}%` }]} />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={styles.settingLabel}>Per Minute Rate</Text>
                <Text style={styles.settingValue}>R{perMin.toFixed(1)}</Text>
              </View>
              <View style={styles.slider}>
                <View style={[styles.sliderFill, { width: `${(perMin / 3) * 100}%` }]} />
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={18} color={ADMIN_COLORS.orange} />
              <Text style={styles.sectionTitle}>Surge Pricing</Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.settingLabel}>Enable Surge Pricing</Text>
              <View style={[styles.toggleTrack, notifications.push && styles.toggleActive]}>
                <View style={[styles.toggleThumb, notifications.push && styles.toggleThumbActive]} />
              </View>
            </View>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingLabel}>Max Surge Multiplier</Text>
              <Text style={styles.settingValue}>{maxSurge.toFixed(1)}x</Text>
            </View>
            <View style={styles.settingLabelRow}>
              <Text style={styles.settingLabel}>Peak Hour Boost</Text>
              <View style={styles.peakBadge}>
                <Text style={styles.peakText}>1.4x Active</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.menuLink} onPress={() => navigation.navigate('AdminSurgePricing')}>
              <Text style={styles.menuLinkText}>Surge Pricing Overview</Text>
              <Ionicons name="chevron-forward" size={16} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuLink} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Text style={styles.menuLinkText}>Manage Surge Zones</Text>
              <Ionicons name="chevron-forward" size={16} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuLink} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Text style={styles.menuLinkText}>Manage Peak Hours</Text>
              <Ionicons name="chevron-forward" size={16} color={ADMIN_COLORS.textMuted} />
            </TouchableOpacity>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="map" size={18} color={ADMIN_COLORS.primary} />
              <Text style={styles.sectionTitle}>Service Zones</Text>
            </View>
            <View style={styles.zoneItem}>
              <View style={styles.zoneLeft}>
                <Ionicons name="location" size={16} color={ADMIN_COLORS.primary} />
                <Text style={styles.zoneName}>Phalaborwa CBD</Text>
              </View>
              <Text style={styles.zoneMultiplier}>1.4x</Text>
            </View>
            <View style={styles.zoneItem}>
              <View style={styles.zoneLeft}>
                <Ionicons name="location" size={16} color={ADMIN_COLORS.primary} />
                <Text style={styles.zoneName}>Airport Zone</Text>
              </View>
              <Text style={[styles.zoneMultiplier, { color: ADMIN_COLORS.greenLight }]}>1.0x</Text>
            </View>
            <View style={styles.zoneItem}>
              <View style={styles.zoneLeft}>
                <Ionicons name="location" size={16} color={ADMIN_COLORS.primary} />
                <Text style={styles.zoneName}>Township Areas</Text>
              </View>
              <Text style={[styles.zoneMultiplier, { color: ADMIN_COLORS.greenLight }]}>1.0x</Text>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={18} color={ADMIN_COLORS.primary} />
              <Text style={styles.sectionTitle}>System Settings</Text>
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="notifications" size={18} color={ADMIN_COLORS.primary} />
                <Text style={styles.settingLabel}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications.push}
                onValueChange={(v) => setNotifications(prev => ({ ...prev, push: v }))}
                trackColor={{ false: ADMIN_COLORS.surfaceBorder, true: ADMIN_COLORS.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="mail" size={18} color={ADMIN_COLORS.primary} />
                <Text style={styles.settingLabel}>Email Alerts</Text>
              </View>
              <Switch
                value={notifications.email}
                onValueChange={(v) => setNotifications(prev => ({ ...prev, email: v }))}
                trackColor={{ false: ADMIN_COLORS.surfaceBorder, true: ADMIN_COLORS.primary }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="shield-checkmark" size={18} color={ADMIN_COLORS.primary} />
                <Text style={styles.settingLabel}>Two-Factor Auth</Text>
              </View>
              <Switch
                value={notifications.sms}
                onValueChange={(v) => setNotifications(prev => ({ ...prev, sms: v }))}
                trackColor={{ false: ADMIN_COLORS.surfaceBorder, true: ADMIN_COLORS.primary }}
                thumbColor="#ffffff"
              />
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={18} color={ADMIN_COLORS.blue} />
              <Text style={styles.sectionTitle}>App Information</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Version</Text>
              <Text style={styles.infoValue}>4.0.0</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Build</Text>
              <Text style={styles.infoValue}>2024.03.21.1</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Region</Text>
              <Text style={[styles.infoValue, { color: ADMIN_COLORS.greenLight }]}>Phalaborwa, Limpopo</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Environment</Text>
              <Text style={[styles.infoValue, { color: ADMIN_COLORS.greenLight }]}>Production</Text>
            </View>
          </Card>

          <TouchableOpacity style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  body: { flex: 1 },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700', color: '#ffffff' },
  profileRole: { fontSize: 12, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  settingRow: { marginBottom: 16 },
  settingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  settingLabel: { fontSize: 14, color: '#ffffff', fontWeight: '500' },
  settingValue: { fontSize: 14, fontWeight: '700', color: ADMIN_COLORS.primary },
  slider: { height: 6, backgroundColor: ADMIN_COLORS.surfaceBorder, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', backgroundColor: ADMIN_COLORS.primary, borderRadius: 3 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceBorder },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  toggleTrack: { width: 48, height: 24, borderRadius: 12, backgroundColor: ADMIN_COLORS.surfaceBorder, justifyContent: 'center', paddingHorizontal: 2 },
  toggleActive: { backgroundColor: ADMIN_COLORS.primary },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#ffffff' },
  toggleThumbActive: { alignSelf: 'flex-end' },
  peakBadge: { backgroundColor: 'rgba(245,158,11,0.2)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 999 },
  peakText: { fontSize: 11, fontWeight: '600', color: ADMIN_COLORS.orangeLight },
  menuLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: ADMIN_COLORS.surfaceBorder },
  menuLinkText: { fontSize: 14, color: ADMIN_COLORS.primary, fontWeight: '600' },
  zoneItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 12, marginBottom: 8 },
  zoneLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  zoneName: { fontSize: 14, color: '#ffffff' },
  zoneMultiplier: { fontSize: 14, fontWeight: '700', color: ADMIN_COLORS.orangeLight },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: ADMIN_COLORS.surfaceBorder },
  infoLabel: { fontSize: 14, color: ADMIN_COLORS.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  logoutBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 8 },
  logoutText: { fontSize: 15, fontWeight: '700', color: ADMIN_COLORS.red },
});