import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch, StatusBar, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme, useAuth } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { ADMIN_COLORS } from '../constants/theme';
import { useAdminSettings } from '../hooks/useAdminSettings';
import { Card } from '../components/common/Card';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { Avatar } from '../components/common/Avatar';

type Nav = NativeStackNavigationProp<any>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { logout } = useAuth();
  const { settings, loading, error, refreshing, refresh, updateSetting } = useAdminSettings();
  const [notifications, setNotifications] = useState({
    push: settings?.push_notifications ?? true,
    email: settings?.email_notifications ?? true,
    sms: settings?.sms_notifications ?? false,
  });

  const baseFare = settings?.base_fare ?? 25;
  const perKm = settings?.per_km_rate ?? 8.5;
  const perMin = settings?.per_minute_rate ?? 1.5;
  const maxSurge = settings?.max_surge ?? 3.0;

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  const handleToggleNotification = async (key: string, value: boolean) => {
    setNotifications(prev => ({ ...prev, [key]: value }));
    try {
      await updateSetting(`notifications_${key}`, value);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update setting');
      setNotifications(prev => ({ ...prev, [key]: !value }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Settings</Text>
        <Text style={styles.headerSub}>Platform configuration</Text>
      </LinearGradient>

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 100 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.profileSection, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            <Avatar name="Admin" size={60} />
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: COLORS.text }]}>Admin</Text>
              <Text style={[styles.profileRole, { color: COLORS.textMuted }]}>Operations Manager</Text>
            </View>
          </View>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={18} color={COLORS.brand} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Pricing Settings</Text>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Base Fare</Text>
                <Text style={[styles.settingValue, { color: COLORS.brand }]}>R{baseFare.toFixed(0)}.00</Text>
              </View>
              <View style={[styles.slider, { backgroundColor: COLORS.surfaceBorder }]}>
                <View style={[styles.sliderFill, { width: `${(baseFare / 40) * 100}%`, backgroundColor: COLORS.brand }]} />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Per KM Rate</Text>
                <Text style={[styles.settingValue, { color: COLORS.brand }]}>R{perKm.toFixed(1)}</Text>
              </View>
              <View style={[styles.slider, { backgroundColor: COLORS.surfaceBorder }]}>
                <View style={[styles.sliderFill, { width: `${(perKm / 15) * 100}%`, backgroundColor: COLORS.brand }]} />
              </View>
            </View>
            <View style={styles.settingRow}>
              <View style={styles.settingLabelRow}>
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Per Minute Rate</Text>
                <Text style={[styles.settingValue, { color: COLORS.brand }]}>R{perMin.toFixed(1)}</Text>
              </View>
              <View style={[styles.slider, { backgroundColor: COLORS.surfaceBorder }]}>
                <View style={[styles.sliderFill, { width: `${(perMin / 3) * 100}%`, backgroundColor: COLORS.brand }]} />
              </View>
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={18} color={COLORS.warning} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>Surge Pricing</Text>
            </View>
            <View style={[styles.settingLabelRow, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.settingLabel, { color: COLORS.text }]}>Max Surge Multiplier</Text>
              <Text style={[styles.settingValue, { color: COLORS.brand }]}>{maxSurge.toFixed(1)}x</Text>
            </View>
            <TouchableOpacity style={[styles.menuLink, { borderTopColor: COLORS.border }]} onPress={() => navigation.navigate('AdminSurgePricing')}>
              <Text style={[styles.menuLinkText, { color: COLORS.brand }]}>Surge Pricing Overview</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuLink, { borderTopColor: COLORS.border }]} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Text style={[styles.menuLinkText, { color: COLORS.brand }]}>Manage Surge Zones</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.menuLink, { borderTopColor: COLORS.border }]} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Text style={[styles.menuLinkText, { color: COLORS.brand }]}>Manage Peak Hours</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </TouchableOpacity>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={18} color={COLORS.brand} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>System Settings</Text>
            </View>
            <View style={[styles.toggleRow, { borderBottomColor: COLORS.border }]}>
              <View style={styles.toggleLeft}>
                <Ionicons name="notifications" size={18} color={COLORS.brand} />
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Push Notifications</Text>
              </View>
              <Switch
                value={notifications.push}
                onValueChange={(v) => handleToggleNotification('push', v)}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.brand }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={[styles.toggleRow, { borderBottomColor: COLORS.border }]}>
              <View style={styles.toggleLeft}>
                <Ionicons name="mail" size={18} color={COLORS.brand} />
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Email Alerts</Text>
              </View>
              <Switch
                value={notifications.email}
                onValueChange={(v) => handleToggleNotification('email', v)}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.brand }}
                thumbColor="#ffffff"
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleLeft}>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.brand} />
                <Text style={[styles.settingLabel, { color: COLORS.text }]}>Two-Factor Auth</Text>
              </View>
              <Switch
                value={notifications.sms}
                onValueChange={(v) => handleToggleNotification('sms', v)}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.brand }}
                thumbColor="#ffffff"
              />
            </View>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={18} color={COLORS.info} />
              <Text style={[styles.sectionTitle, { color: COLORS.text }]}>App Information</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.infoLabel, { color: COLORS.textMuted }]}>Version</Text>
              <Text style={[styles.infoValue, { color: COLORS.text }]}>4.0.0</Text>
            </View>
            <View style={[styles.infoRow, { borderBottomColor: COLORS.border }]}>
              <Text style={[styles.infoLabel, { color: COLORS.textMuted }]}>Region</Text>
              <Text style={[styles.infoValue, { color: COLORS.success }]}>Phalaborwa, Limpopo</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: COLORS.textMuted }]}>Environment</Text>
              <Text style={[styles.infoValue, { color: COLORS.success }]}>Production</Text>
            </View>
          </Card>

          <TouchableOpacity style={[styles.logoutBtn, { backgroundColor: 'rgba(229,72,77,0.12)' }]} onPress={handleLogout}>
            <Ionicons name="log-out" size={18} color={COLORS.error} />
            <Text style={[styles.logoutText, { color: COLORS.error }]}>Log Out</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 24, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, paddingHorizontal: 20 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  body: { flex: 1 },
  profileSection: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, borderRadius: 16, padding: 16, borderWidth: 1 },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 17, fontWeight: '700' },
  profileRole: { fontSize: 12, marginTop: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700' },
  settingRow: { marginBottom: 16 },
  settingLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 8, borderBottomWidth: 1 },
  settingLabel: { fontSize: 14, fontWeight: '500' },
  settingValue: { fontSize: 14, fontWeight: '700' },
  slider: { height: 6, borderRadius: 3, overflow: 'hidden' },
  sliderFill: { height: '100%', borderRadius: 3 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1 },
  toggleLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  menuLink: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1 },
  menuLinkText: { fontSize: 14, fontWeight: '600' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 8, borderRadius: 12 },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
