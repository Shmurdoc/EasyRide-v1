import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, Switch,
  Alert, StatusBar,
} from 'react-native';
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

type Nav = NativeStackNavigationProp<any>;

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { settings, loading, error, refreshing, refresh, updateSetting } = useAdminSettings();

  const baseFare = settings?.base_fare ?? 25;
  const perKm = settings?.per_km_rate ?? 8;
  const perMin = settings?.per_minute_rate ?? 1.5;
  const surgeMultiplier = settings?.surge_multiplier ?? 1;
  const maxSurge = settings?.max_surge ?? 2.5;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <ScrollView
          style={styles.body}
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Pricing */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color={ADMIN_COLORS.accent} />
              <Text style={styles.sectionTitle}>Pricing</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Base Fare (ZAR)</Text>
              <Text style={styles.settingValue}>R {baseFare.toFixed(0)}</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Per KM Rate</Text>
              <Text style={styles.settingValue}>R {perKm.toFixed(1)}</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Per Minute Rate</Text>
              <Text style={styles.settingValue}>R {perMin.toFixed(1)}</Text>
            </View>
          </Card>

          {/* Surge */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="trending-up" size={20} color="#f59e0b" />
              <Text style={styles.sectionTitle}>Surge Pricing</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Current Multiplier</Text>
              <Text style={styles.settingValue}>{surgeMultiplier}x</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Max Surge</Text>
              <Text style={styles.settingValue}>{maxSurge}x</Text>
            </View>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminSurgePricing')}>
              <Text style={styles.menuItemText}>Surge Pricing Overview</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminSurgeZones')}>
              <Text style={styles.menuItemText}>Manage Surge Zones</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('AdminPeakHours')}>
              <Text style={styles.menuItemText}>Manage Peak Hours</Text>
              <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.3)" />
            </TouchableOpacity>
          </Card>

          {/* Notifications */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="notifications" size={20} color="#16a34a" />
              <Text style={styles.sectionTitle}>Notifications</Text>
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.settingLabel}>Push Notifications</Text>
              <Switch value={settings?.push_notifications ?? true} onValueChange={(v) => updateSetting('push_notifications', v)} trackColor={{ false: '#2a2a3e', true: '#16a34a' }} thumbColor="#ffffff" />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.settingLabel}>Email Notifications</Text>
              <Switch value={settings?.email_notifications ?? false} onValueChange={(v) => updateSetting('email_notifications', v)} trackColor={{ false: '#2a2a3e', true: '#16a34a' }} thumbColor="#ffffff" />
            </View>
            <View style={styles.toggleRow}>
              <Text style={styles.settingLabel}>SMS Notifications</Text>
              <Switch value={settings?.sms_notifications ?? false} onValueChange={(v) => updateSetting('sms_notifications', v)} trackColor={{ false: '#2a2a3e', true: '#16a34a' }} thumbColor="#ffffff" />
            </View>
          </Card>

          {/* App Info */}
          <Card style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#6366f1" />
              <Text style={styles.sectionTitle}>App Info</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Version</Text>
              <Text style={styles.settingValue}>4.0.0</Text>
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>Region</Text>
              <Text style={styles.settingValue}>Phalaborwa</Text>
            </View>
          </Card>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0a0f' },
  header: { paddingBottom: 16, borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  backBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  body: { flex: 1 },
  sectionCard: { marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  settingLabel: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.7)' },
  settingValue: { fontSize: 14, fontWeight: '600', color: '#ffffff' },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.04)' },
  menuItemText: { fontSize: 14, fontWeight: '600', color: '#6366f1' },
});
