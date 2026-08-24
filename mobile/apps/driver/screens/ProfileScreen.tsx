import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, ScrollView, Text, SafeAreaView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth, drivers, COLORS, SPACING, RADIUS, GRADIENTS, SHADOWS, Avatar } from '@easyryde/shared';

export default function ProfileScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuth();
  const [vehicleModal, setVehicleModal] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ make: '', model: '', year: '', license_plate: '', color: '', category: 'standard' });
  const [stats, setStats] = useState<{ rating: number; totalTrips: number; acceptanceRate: number } | null>(null);

  useEffect(() => {
    if (user?.id) {
      drivers.get(String(user.id)).then((data: any) => {
        setStats({
          rating: data?.rating ?? data?.driver_rating ?? 0,
          totalTrips: data?.total_trips ?? data?.completed_rides ?? 0,
          acceptanceRate: data?.acceptance_rate ?? 0,
        });
      }).catch(() => {});
    }
  }, [user?.id]);

  const driverStats = {
    rating: stats?.rating ?? 0,
    totalTrips: stats?.totalTrips ?? 0,
    vehicle: 'Toyota Corolla',
    acceptanceRate: stats?.acceptanceRate ?? 0,
    documents: { insurance: true, registration: true, license: true, profilePhoto: true },
    ratingBreakdown: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
  };

  const handleRegisterVehicle = async () => {
    try { await drivers.registerVehicle({ make: vehicleForm.make, model: vehicleForm.model, year: parseInt(vehicleForm.year, 10) || 0, color: vehicleForm.color, license_plate: vehicleForm.license_plate, category: vehicleForm.category }); Alert.alert('Success', 'Vehicle registered'); setVehicleModal(false); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  const menuItems = [
    { icon: 'person', label: 'My Profile', onPress: () => Alert.alert('Profile', 'Profile editing coming soon.') },
    { icon: 'car', label: 'Vehicle Details', onPress: () => setVehicleModal(true) },
    { icon: 'document-text', label: 'Documents', badge: 'Manage', onPress: () => navigation.navigate('Documents') },
    { icon: 'notifications', label: 'Notifications', onPress: () => Alert.alert('Notifications', 'Notification preferences coming soon.') },
    { icon: 'help-circle', label: 'Help & Support', onPress: () => navigation.navigate('Support') },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient colors={GRADIENTS.primary} style={styles.headerGradient}>
          <View style={styles.profileRow}>
            <Avatar name={user?.name || 'D'} size={68} />
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{user?.name || 'Driver'}</Text>
              <Text style={styles.profileEmail}>{user?.email || 'driver@easyryde.com'}</Text>
              <View style={styles.onlineStatusRow}><View style={styles.onlineDot} /><Text style={styles.onlineText}>Online</Text></View>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          <View style={styles.statsCard}>
            <View style={styles.statItem}><Text style={styles.statValue}>{driverStats.rating}</Text><Text style={styles.statLabel}>Rating</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statValue}>{driverStats.totalTrips}</Text><Text style={styles.statLabel}>Total Trips</Text></View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}><Text style={styles.statValue}>{driverStats.acceptanceRate}%</Text><Text style={styles.statLabel}>Acceptance</Text></View>
          </View>

          <View style={styles.ratingCard}>
            <Text style={styles.ratingTitle}>RATING BREAKDOWN</Text>
            <View style={styles.ratingMain}><Text style={styles.ratingBig}>{driverStats.rating}</Text><Ionicons name="star" size={24} color={COLORS.primary} /><Text style={styles.ratingOutOf}>/ 5.0</Text></View>
            <Text style={styles.ratingCount}>Based on {Object.values(driverStats.ratingBreakdown).reduce((a, b) => a + b, 0).toLocaleString()} rides</Text>
            <View style={styles.ratingBars}>
              {[5, 4, 3, 2, 1].map((star) => { const count = driverStats.ratingBreakdown[star as keyof typeof driverStats.ratingBreakdown]; const maxCount = Math.max(...Object.values(driverStats.ratingBreakdown)); const percentage = (count / maxCount) * 100; return (
                <View key={star} style={styles.ratingBarRow}>
                  <Text style={styles.ratingBarLabel}>{star}</Text><Ionicons name="star" size={10} color={COLORS.primary} />
                  <View style={styles.ratingBarTrack}><LinearGradient colors={GRADIENTS.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[styles.ratingBarFill, { width: `${percentage}%` }]} /></View>
                  <Text style={styles.ratingBarCount}>{count}</Text>
                </View>
              );})}
            </View>
          </View>

          <View style={styles.documentsCard}>
            <Text style={styles.documentsTitle}>DOCUMENTS</Text>
            {Object.entries(driverStats.documents).map(([key, verified]) => {
              const labels: Record<string, string> = { insurance: 'Vehicle Insurance', registration: 'Vehicle Registration', license: "Driver's License", profilePhoto: 'Profile Photo' };
              const icons: Record<string, string> = { insurance: 'shield-checkmark', registration: 'document-text', license: 'card', profilePhoto: 'camera' };
              return (
                <View key={key} style={styles.documentRow}>
                  <View style={[styles.documentIcon, verified && styles.documentIconVerified]}><Ionicons name={icons[key] as any} size={18} color={verified ? COLORS.primary : COLORS.muted} /></View>
                  <Text style={styles.documentName}>{labels[key]}</Text>
                  <View style={[styles.documentBadge, verified ? styles.documentBadgeVerified : styles.documentBadgePending]}>
                    <Ionicons name={verified ? 'checkmark-circle' : 'time'} size={12} color={verified ? COLORS.primary : COLORS.amber} />
                    <Text style={[styles.documentBadgeText, verified ? styles.documentBadgeTextVerified : styles.documentBadgeTextPending]}>{verified ? 'Verified' : 'Pending'}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={styles.sectionHeader}><Text style={styles.sectionHeaderText}>ACCOUNT</Text></View>
          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={item.onPress} activeOpacity={0.7}>
                <View style={styles.menuLeft}>
                  <View style={[styles.menuIconContainer, index === menuItems.length - 1 && styles.menuIconContainerDanger]}>
                    <Ionicons name={item.icon as any} size={20} color={index === menuItems.length - 1 ? COLORS.red : COLORS.primary} />
                  </View>
                  <Text style={[styles.menuLabel, index === menuItems.length - 1 && styles.menuLabelDanger]}>{item.label}</Text>
                </View>
                {item.badge ? <Text style={styles.menuBadge}>{item.badge}</Text> : <Ionicons name="chevron-forward" size={18} color={COLORS.muted} />}
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity style={styles.signOutBtn} onPress={() => Alert.alert('Sign Out', 'Are you sure?', [{ text: 'Cancel', style: 'cancel' }, { text: 'Sign Out', style: 'destructive', onPress: logout }])}>
            <Ionicons name="log-out" size={18} color={COLORS.red} /><Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
          <Text style={styles.version}>EasyRyde Driver v4.0.0</Text>
        </View>
      </ScrollView>

      <Modal visible={vehicleModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Vehicle Info</Text>
            {(['make', 'model', 'year', 'license_plate', 'color'] as const).map((field) => (
              <TextInput key={field} placeholder={field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ')} placeholderTextColor={COLORS.muted} value={vehicleForm[field]} onChangeText={(text) => setVehicleForm((prev) => ({ ...prev, [field]: text }))} style={styles.modalInput} />
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setVehicleModal(false)}><Text style={styles.modalCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.modalSaveBtn} onPress={handleRegisterVehicle}><LinearGradient colors={GRADIENTS.primary} style={styles.modalSaveGradient}><Text style={styles.modalSaveText}>Save</Text></LinearGradient></TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  headerGradient: { paddingHorizontal: 20, paddingTop: 30, paddingBottom: 66, borderBottomLeftRadius: RADIUS['2xl'], borderBottomRightRadius: RADIUS['2xl'] },
  profileRow: { flexDirection: 'row', alignItems: 'center' },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: '#fff' },
  profileEmail: { fontFamily: 'Inter_400Regular', fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  onlineStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  onlineDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.success },
  onlineText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.9)' },

  content: { padding: SPACING.base },
  statsCard: { flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 20, borderWidth: 1, borderColor: COLORS.line, marginBottom: 16, ...SHADOWS.subtle },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontFamily: 'Poppins_700Bold', fontSize: 22, color: COLORS.primary },
  statLabel: { fontFamily: 'Inter_400Regular', fontSize: 11, color: COLORS.muted, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: COLORS.line, marginVertical: 4 },

  ratingCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.line, marginBottom: 16, ...SHADOWS.subtle },
  ratingTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  ratingMain: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  ratingBig: { fontFamily: 'Poppins_800ExtraBold', fontSize: 36, color: COLORS.ink },
  ratingOutOf: { fontFamily: 'Inter_400Regular', fontSize: 16, color: COLORS.muted },
  ratingCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.textDim, marginBottom: 16 },
  ratingBars: { gap: 8 },
  ratingBarRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ratingBarLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: COLORS.ink, width: 10, textAlign: 'right' },
  ratingBarTrack: { flex: 1, height: 8, backgroundColor: COLORS.surfaceLight, borderRadius: 4, overflow: 'hidden' },
  ratingBarFill: { height: '100%', borderRadius: 4 },
  ratingBarCount: { fontFamily: 'Inter_400Regular', fontSize: 12, color: COLORS.muted, width: 36, textAlign: 'right' },

  documentsCard: { backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.line, marginBottom: 16, ...SHADOWS.subtle },
  documentsTitle: { fontFamily: 'Inter_700Bold', fontSize: 12, color: COLORS.muted, marginBottom: 12 },
  documentRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.surfaceLight },
  documentIcon: { width: 32, height: 32, borderRadius: 8, backgroundColor: COLORS.surfaceLight, justifyContent: 'center', alignItems: 'center' },
  documentIconVerified: { backgroundColor: COLORS.brandLightBg },
  documentName: { flex: 1, fontFamily: 'Inter_500Medium', fontSize: 14, color: COLORS.ink },
  documentBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: RADIUS.sm },
  documentBadgeVerified: { backgroundColor: COLORS.brandLightBg },
  documentBadgePending: { backgroundColor: '#FFF7E6' },
  documentBadgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  documentBadgeTextVerified: { color: COLORS.primary },
  documentBadgeTextPending: { color: COLORS.amber },

  sectionHeader: { marginBottom: 8, marginTop: 4 },
  sectionHeaderText: { fontFamily: 'Inter_700Bold', fontSize: 11, color: COLORS.muted, letterSpacing: 1.6 },
  menuSection: { gap: 8, marginBottom: 24 },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: COLORS.card, borderRadius: RADIUS.lg, padding: 16, borderWidth: 1, borderColor: COLORS.line, ...SHADOWS.subtle },
  menuLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  menuIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: COLORS.brandLightBg, justifyContent: 'center', alignItems: 'center' },
  menuIconContainerDanger: { backgroundColor: COLORS.errorGlow },
  menuLabel: { fontFamily: 'Inter_500Medium', fontSize: 16, color: COLORS.ink },
  menuLabelDanger: { color: COLORS.red },
  menuBadge: { fontFamily: 'Inter_600SemiBold', fontSize: 12, color: COLORS.primary },

  signOutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.errorGlow, borderRadius: RADIUS.lg, padding: 16, marginBottom: 16 },
  signOutText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: COLORS.red },
  version: { textAlign: 'center', fontFamily: 'Inter_400Regular', color: COLORS.textDim, fontSize: 13 },

  modalOverlay: { flex: 1, justifyContent: 'center', backgroundColor: COLORS.overlay },
  modalContent: { backgroundColor: COLORS.card, borderRadius: RADIUS.xl, padding: 24, margin: 16, borderWidth: 1, borderColor: COLORS.line, ...SHADOWS.elevated },
  modalTitle: { fontFamily: 'Poppins_700Bold', fontSize: 20, color: COLORS.ink, marginBottom: 16 },
  modalInput: { backgroundColor: COLORS.surfaceLight, borderWidth: 1, borderColor: COLORS.line, borderRadius: RADIUS.md, padding: 14, fontFamily: 'Inter_400Regular', fontSize: 16, color: COLORS.ink, marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancelBtn: { flex: 1, padding: 14, alignItems: 'center', borderRadius: RADIUS.md, backgroundColor: COLORS.surfaceLight },
  modalCancelText: { fontFamily: 'Inter_600SemiBold', fontSize: 16, color: COLORS.muted },
  modalSaveBtn: { flex: 1, borderRadius: RADIUS.md, overflow: 'hidden' },
  modalSaveGradient: { padding: 14, alignItems: 'center' },
  modalSaveText: { fontFamily: 'Poppins_700Bold', fontSize: 16, color: '#fff' },
});
