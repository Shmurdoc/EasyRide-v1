import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, StatusBar, Alert, Modal, ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useSurgeZones } from '../hooks/useSurgePricing';
import { Card } from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import type { SurgeZone } from '../api/types';

type Nav = NativeStackNavigationProp<any>;

export default function SurgeZonesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { zones, loading, error, refreshing, refresh, add, update, remove, toggle } = useSurgeZones();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingZone, setEditingZone] = useState<SurgeZone | null>(null);
  const [form, setForm] = useState({ name: '', center_lat: '', center_lng: '', radius_meters: '', multiplier: '1.5' });
  const [saving, setSaving] = useState(false);

  const openAdd = useCallback(() => {
    setEditingZone(null);
    setForm({ name: '', center_lat: '', center_lng: '', radius_meters: '1000', multiplier: '1.5' });
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((zone: SurgeZone) => {
    setEditingZone(zone);
    setForm({
      name: zone.name,
      center_lat: String(zone.center_lat),
      center_lng: String(zone.center_lng),
      radius_meters: String(zone.radius_meters),
      multiplier: String(zone.multiplier),
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    const lat = parseFloat(form.center_lat);
    const lng = parseFloat(form.center_lng);
    const radius = parseInt(form.radius_meters, 10);
    const mult = parseFloat(form.multiplier);
    if (isNaN(lat) || isNaN(lng) || isNaN(radius) || isNaN(mult)) {
      Alert.alert('Error', 'Please enter valid numeric values');
      return;
    }
    if (mult < 1.0 || mult > 2.5) {
      Alert.alert('Error', 'Multiplier must be between 1.0 and 2.5');
      return;
    }
    setSaving(true);
    try {
      if (editingZone) {
        await update(editingZone.id, { name: form.name.trim(), center_lat: lat, center_lng: lng, radius_meters: radius, multiplier: mult });
      } else {
        await add({ name: form.name.trim(), center_lat: lat, center_lng: lng, radius_meters: radius, multiplier: mult });
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [form, editingZone, add, update]);

  const handleDelete = useCallback((zone: SurgeZone) => {
    Alert.alert('Delete Zone', `Delete "${zone.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await remove(zone.id); } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }, [remove]);

  const handleToggle = useCallback(async (zone: SurgeZone) => {
    try { await toggle(zone.id); } catch (err: any) { Alert.alert('Error', err.message); }
  }, [toggle]);

  const renderItem = useCallback(({ item }: { item: SurgeZone }) => (
    <Card style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <View style={styles.zoneHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#16a34a' : '#666' }]} />
          <View>
            <Text style={styles.zoneName}>{item.name}</Text>
            <Text style={styles.zoneCoords}>{item.center_lat.toFixed(4)}, {item.center_lng.toFixed(4)}</Text>
          </View>
        </View>
        <View style={[styles.multiplierBadge, { backgroundColor: item.multiplier >= 2.0 ? '#dc2626' : item.multiplier >= 1.5 ? '#f59e0b' : '#16a34a' }]}>
          <Text style={styles.multiplierText}>{item.multiplier.toFixed(1)}x</Text>
        </View>
      </View>
      <View style={styles.zoneDetails}>
        <View style={styles.zoneDetailItem}>
          <Ionicons name="resize-outline" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.zoneDetailText}>{item.radius_meters}m radius</Text>
        </View>
        <View style={styles.zoneDetailItem}>
          <Ionicons name={item.is_active ? 'checkmark-circle' : 'close-circle'} size={14} color={item.is_active ? '#16a34a' : '#666'} />
          <Text style={styles.zoneDetailText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <View style={styles.zoneActions}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggle(item)}>
          <Ionicons name={item.is_active ? 'pause' : 'play'} size={16} color={item.is_active ? '#f59e0b' : '#16a34a'} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openEdit(item)}>
          <Ionicons name="pencil" size={16} color={ADMIN_COLORS.accent} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => handleDelete(item)}>
          <Ionicons name="trash" size={16} color={ADMIN_COLORS.red} />
        </TouchableOpacity>
      </View>
    </Card>
  ), [handleToggle, openEdit, handleDelete]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Surge Zones</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={zones}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState icon="location" message="No surge zones" subtitle="Tap + to create one" />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.accent} />}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingZone ? 'Edit Zone' : 'New Zone'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Zone Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm(p => ({ ...p, name: t }))}
                placeholder="e.g. CBD Surge"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <Text style={styles.fieldLabel}>Center Latitude</Text>
              <TextInput
                style={styles.input}
                value={form.center_lat}
                onChangeText={(t) => setForm(p => ({ ...p, center_lat: t }))}
                placeholder="-23.9045"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Center Longitude</Text>
              <TextInput
                style={styles.input}
                value={form.center_lng}
                onChangeText={(t) => setForm(p => ({ ...p, center_lng: t }))}
                placeholder="29.4688"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Radius (meters)</Text>
              <TextInput
                style={styles.input}
                value={form.radius_meters}
                onChangeText={(t) => setForm(p => ({ ...p, radius_meters: t }))}
                placeholder="1000"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
              />

              <Text style={styles.fieldLabel}>Multiplier ({form.multiplier}x)</Text>
              <View style={styles.sliderRow}>
                {[1.0, 1.2, 1.5, 1.8, 2.0, 2.5].map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.sliderOption, parseFloat(form.multiplier) === m && styles.sliderOptionActive]}
                    onPress={() => setForm(p => ({ ...p, multiplier: String(m) }))}
                  >
                    <Text style={[styles.sliderText, parseFloat(form.multiplier) === m && styles.sliderTextActive]}>{m}x</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
              >
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editingZone ? 'Update Zone' : 'Create Zone'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, paddingBottom: 100 },
  zoneCard: { marginBottom: 12 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  zoneHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  zoneName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  zoneCoords: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  multiplierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  multiplierText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  zoneDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  zoneDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  zoneDetailText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  zoneActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  modalClose: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#ffffff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sliderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  sliderOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sliderOptionActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accent },
  sliderText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  sliderTextActive: { color: '#ffffff' },
  saveBtn: { backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
