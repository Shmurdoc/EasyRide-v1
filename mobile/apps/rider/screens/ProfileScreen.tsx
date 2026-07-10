import React, { useState } from 'react';
import {
  TouchableOpacity, StyleSheet, Alert, View, Text, ScrollView, Modal, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, COLORS, GRADIENTS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import { Avatar, GradientText } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

const MENU_ITEMS = [
  { icon: 'person-outline' as const, label: 'Personal Info', route: 'Profile' as const, color: COLORS.info },
  { icon: 'card-outline' as const, label: 'Payment Methods', route: 'Payment' as const, color: COLORS.primary },
  { icon: 'location-outline' as const, label: 'Saved Places', route: 'BookRide' as const, color: COLORS.success },
  { icon: 'time-outline' as const, label: 'Ride History', route: 'RideHistory' as const, color: COLORS.primaryLight },
  { icon: 'help-circle-outline' as const, label: 'Help & Support', route: 'help' as const, color: COLORS.warning },
  { icon: 'settings-outline' as const, label: 'Settings', route: 'settings' as const, color: COLORS.textMuted },
  { icon: 'document-text-outline' as const, label: 'Legal', route: 'legal' as const, color: COLORS.textDim },
];

const SUPPORT_INFO = {
  email: 'support@easyryde.com',
  phone: '015 000 0000',
  hours: 'Mon-Sun, 06:00-22:00',
};

export default function ProfileScreen({ navigation }: { navigation: RiderNav }) {
  const { user, logout } = useAuth();
  const [showHelpModal, setShowHelpModal] = useState(false);

  const memberSince = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
    : 'N/A';

  const handleMenuPress = (item: typeof MENU_ITEMS[number]) => {
    if (item.route === 'help') {
      setShowHelpModal(true);
    } else if (item.route === 'settings') {
      Alert.alert('Settings', 'Settings will be available in a future update.');
    } else if (item.route === 'legal') {
      Alert.alert('Legal', 'EasyRyde Terms of Service & Privacy Policy\n\nBy using EasyRyde you agree to our terms. Full documents available on our website.');
    } else if (item.route === 'Payment') {
      Alert.alert('Payment Methods', 'Manage your payment methods from the ride payment screen.');
    } else if (item.route === 'BookRide') {
      navigation.navigate('BookRide');
    } else if (item.route === 'RideHistory') {
      navigation.navigate('RideHistory');
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Profile Header */}
      <LinearGradient
        colors={GRADIENTS.primary as unknown as string[]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.headerGradient}
      >
        <View style={styles.avatarWrap}>
          <Avatar name={user?.name || ''} size={72} />
        </View>
        <Text style={styles.userName}>{user?.name || 'Rider'}</Text>
        <Text style={styles.userEmail}>{user?.email || ''}</Text>
      </LinearGradient>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Ionicons name="star" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{user?.average_rating?.toFixed(1) ?? '5.0'}</Text>
          <Text style={styles.statLabel}>Rating</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Ionicons name="car-sport-outline" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{user?.total_trips ?? 0}</Text>
          <Text style={styles.statLabel}>Trips</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statCard}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.primary} />
          <Text style={styles.statValue}>{memberSince}</Text>
          <Text style={styles.statLabel}>Member Since</Text>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {MENU_ITEMS.map((item, i) => (
          <TouchableOpacity
            key={i}
            style={styles.menuRow}
            onPress={() => handleMenuPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.menuIcon, { backgroundColor: item.color + '18' }]}>
              <Ionicons name={item.icon} size={20} color={item.color} />
            </View>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
          </TouchableOpacity>
        ))}
      </View>

      {/* Earn by Driving */}
      <TouchableOpacity
        style={styles.driverBtn}
        onPress={() => Alert.alert('Driver App', 'Download the EasyRyde Driver app from the app store to start earning.')}
        activeOpacity={0.7}
      >
        <Ionicons name="car-sport" size={20} color={COLORS.primary} />
        <View style={styles.driverBtnText}>
          <Text style={styles.driverBtnTitle}>Earn by Driving</Text>
          <Text style={styles.driverBtnSub}>Make money with EasyRyde</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
      </TouchableOpacity>

      {/* Sign Out */}
      <TouchableOpacity
        style={styles.signOutBtn}
        onPress={() => {
          Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: logout },
          ]);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Version */}
      <Text style={styles.version}>EasyRyde v1.0.0</Text>

      {/* Help Modal */}
      <Modal visible={showHelpModal} transparent animationType="slide" onRequestClose={() => setShowHelpModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setShowHelpModal(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={20} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpIconWrap}>
                <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.helpInfo}>
                <Text style={styles.helpLabel}>Email</Text>
                <Text style={styles.helpValue}>{SUPPORT_INFO.email}</Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpIconWrap}>
                <Ionicons name="call-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.helpInfo}>
                <Text style={styles.helpLabel}>Phone</Text>
                <Text style={styles.helpValue}>{SUPPORT_INFO.phone}</Text>
              </View>
            </View>

            <View style={styles.helpItem}>
              <View style={styles.helpIconWrap}>
                <Ionicons name="time-outline" size={20} color={COLORS.primary} />
              </View>
              <View style={styles.helpInfo}>
                <Text style={styles.helpLabel}>Hours</Text>
                <Text style={styles.helpValue}>{SUPPORT_INFO.hours}</Text>
              </View>
            </View>

            <Text style={styles.helpNote}>
              For urgent ride issues, contact your driver directly through the in-app chat during your ride.
            </Text>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { paddingBottom: 48 },

  headerGradient: {
    paddingTop: 64, paddingBottom: SPACING.lg + 20,
    alignItems: 'center',
    borderBottomLeftRadius: RADIUS['2xl'],
    borderBottomRightRadius: RADIUS['2xl'],
  },
  avatarWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)',
    marginBottom: SPACING.md,
  },
  userName: { color: '#121212', fontSize: 22, fontWeight: '700' },
  userEmail: { color: 'rgba(18,18,18,0.6)', fontSize: 14, marginTop: 2 },

  statsRow: {
    flexDirection: 'row', marginHorizontal: SPACING.base,
    backgroundColor: COLORS.surface, borderRadius: RADIUS.lg,
    padding: SPACING.base, marginTop: -20,
    borderWidth: 1, borderColor: COLORS.surfaceBorder,
    ...SHADOWS.moderate,
  },
  statCard: { flex: 1, alignItems: 'center', gap: 4 },
  statValue: { color: COLORS.text, fontSize: 18, fontWeight: '700' },
  statLabel: { color: COLORS.textMuted, fontSize: 11, fontWeight: '500' },
  statDivider: { width: 1, backgroundColor: COLORS.surfaceBorder, marginVertical: 4 },

  menuSection: { marginTop: SPACING.lg, paddingHorizontal: SPACING.base },
  menuRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: SPACING.md, gap: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder,
  },
  menuIcon: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    justifyContent: 'center', alignItems: 'center',
  },
  menuLabel: { color: COLORS.text, fontSize: 15, flex: 1, fontWeight: '500' },

  driverBtn: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: SPACING.base, marginTop: SPACING.lg,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.primary,
    gap: SPACING.md,
  },
  driverBtnText: { flex: 1 },
  driverBtnTitle: { color: COLORS.primary, fontSize: 15, fontWeight: '600' },
  driverBtnSub: { color: COLORS.textMuted, fontSize: 12, marginTop: 1 },

  signOutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.base, marginTop: SPACING.md,
    padding: SPACING.md, backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.error,
  },
  signOutText: { color: COLORS.error, fontSize: 15, fontWeight: '600' },

  version: { color: COLORS.textDim, fontSize: 12, textAlign: 'center', marginTop: SPACING.lg },

  modalOverlay: {
    flex: 1, backgroundColor: COLORS.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl, borderTopRightRadius: RADIUS.xl,
    padding: SPACING.lg, paddingBottom: 48,
  },
  modalHandle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: COLORS.surfaceBorder,
    alignSelf: 'center', marginBottom: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: SPACING.lg,
  },
  modalTitle: { color: COLORS.text, fontSize: 20, fontWeight: '700' },
  modalCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: 'center', alignItems: 'center',
  },

  helpItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.surfaceBorder,
  },
  helpIconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 173, 122, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  helpInfo: { flex: 1 },
  helpLabel: { color: COLORS.textMuted, fontSize: 12, marginBottom: 2 },
  helpValue: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  helpNote: {
    color: COLORS.textDim, fontSize: 12, lineHeight: 18,
    marginTop: SPACING.lg,
  },
});
