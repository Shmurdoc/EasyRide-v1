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
import { usePeakHours } from '../hooks/usePeakHours';
import { Card } from '../components/common/Card';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import type { PeakHour } from '../api/types';

type Nav = NativeStackNavigationProp<any>;

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const DAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function PeakHoursScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { hours, loading, error, refreshing, refresh, add, update, remove, toggle, dayFilter, setDayFilter } = usePeakHours();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingHour, setEditingHour] = useState<PeakHour | null>(null);
  const [form, setForm] = useState({ name: '', day_of_week: '1', start_time: '07:00', end_time: '09:00', multiplier: '1.5' });
  const [saving, setSaving] = useState(false);

  const DAY_FILTERS = [
    { label: 'All', value: undefined },
    ...DAY_SHORT.map((d, i) => ({ label: d, value: i })),
  ];

  const openAdd = useCallback(() => {
    setEditingHour(null);
    setForm({ name: '', day_of_week: '1', start_time: '07:00', end_time: '09:00', multiplier: '1.5' });
    setModalVisible(true);
  }, []);

  const openEdit = useCallback((hour: PeakHour) => {
    setEditingHour(hour);
    setForm({
      name: hour.name,
      day_of_week: String(hour.day_of_week),
      start_time: hour.start_time,
      end_time: hour.end_time,
      multiplier: String(hour.multiplier),
    });
    setModalVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Name is required');
      return;
    }
    const mult = parseFloat(form.multiplier);
    if (isNaN(mult) || mult < 1.0 || mult > 2.5) {
      Alert.alert('Error', 'Multiplier must be between 1.0 and 2.5');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        day_of_week: parseInt(form.day_of_week, 10),
        start_time: form.start_time,
        end_time: form.end_time,
        multiplier: mult,
      };
      if (editingHour) {
        await update(editingHour.id, payload);
      } else {
        await add(payload);
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  }, [form, editingHour, add, update]);

  const handleDelete = useCallback((hour: PeakHour) => {
    Alert.alert('Delete Peak Hour', `Delete "${hour.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try { await remove(hour.id); } catch (err: any) { Alert.alert('Error', err.message); }
      }},
    ]);
  }, [remove]);

  const handleToggle = useCallback(async (hour: PeakHour) => {
    try { await toggle(hour.id); } catch (err: any) { Alert.alert('Error', err.message); }
  }, [toggle]);

  const renderItem = useCallback(({ item }: { item: PeakHour }) => (
    <Card style={styles.hourCard}>
      <View style={styles.hourHeader}>
        <View style={styles.hourHeaderLeft}>
          <View style={[styles.statusDot, { backgroundColor: item.is_active ? '#16a34a' : '#666' }]} />
          <View>
            <Text style={styles.hourName}>{item.name}</Text>
            <Text style={styles.hourDay}>{DAY_NAMES[item.day_of_week]}</Text>
          </View>
        </View>
        <View style={[styles.multiplierBadge, { backgroundColor: item.multiplier >= 2.0 ? '#dc2626' : item.multiplier >= 1.5 ? '#f59e0b' : '#16a34a' }]}>
          <Text style={styles.multiplierText}>{item.multiplier.toFixed(1)}x</Text>
        </View>
      </View>
      <View style={styles.hourDetails}>
        <View style={styles.hourDetailItem}>
          <Ionicons name="time-outline" size={14} color="rgba(255,255,255,0.5)" />
          <Text style={styles.hourDetailText}>{item.start_time} - {item.end_time}</Text>
        </View>
        <View style={styles.hourDetailItem}>
          <Ionicons name={item.is_active ? 'checkmark-circle' : 'close-circle'} size={14} color={item.is_active ? '#16a34a' : '#666'} />
          <Text style={styles.hourDetailText}>{item.is_active ? 'Active' : 'Inactive'}</Text>
        </View>
      </View>
      <View style={styles.hourActions}>
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
            <Text style={styles.headerTitle}>Peak Hours</Text>
          </View>
          <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
            <Ionicons name="add" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Day Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {DAY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.label}
            style={[styles.filterTab, dayFilter === f.value && styles.filterTabActive]}
            onPress={() => setDayFilter(f.value)}
          >
            <Text style={[styles.filterText, dayFilter === f.value && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={hours}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<EmptyState icon="time" message="No peak hours" subtitle="Tap + to create one" />}
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
              <Text style={styles.modalTitle}>{editingHour ? 'Edit Peak Hour' : 'New Peak Hour'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.fieldLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={form.name}
                onChangeText={(t) => setForm(p => ({ ...p, name: t }))}
                placeholder="e.g. Morning Rush"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <Text style={styles.fieldLabel}>Day of Week</Text>
              <View style={styles.dayRow}>
                {DAY_SHORT.map((d, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayOption, parseInt(form.day_of_week) === i && styles.dayOptionActive]}
                    onPress={() => setForm(p => ({ ...p, day_of_week: String(i) }))}
                  >
                    <Text style={[styles.dayText, parseInt(form.day_of_week) === i && styles.dayTextActive]}>{d}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.fieldLabel}>Start Time</Text>
              <TextInput
                style={styles.input}
                value={form.start_time}
                onChangeText={(t) => setForm(p => ({ ...p, start_time: t }))}
                placeholder="07:00"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />

              <Text style={styles.fieldLabel}>End Time</Text>
              <TextInput
                style={styles.input}
                value={form.end_time}
                onChangeText={(t) => setForm(p => ({ ...p, end_time: t }))}
                placeholder="09:00"
                placeholderTextColor="rgba(255,255,255,0.3)"
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
                <Text style={styles.saveBtnText}>{saving ? 'Saving...' : editingHour ? 'Update' : 'Create'}</Text>
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
  filterScroll: { marginBottom: 4 },
  filterContent: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  filterTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  filterTabActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accent },
  filterText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  filterTextActive: { color: '#ffffff' },
  list: { padding: 16, paddingBottom: 100 },
  hourCard: { marginBottom: 12 },
  hourHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  hourHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  hourName: { fontSize: 15, fontWeight: '700', color: '#ffffff' },
  hourDay: { fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 },
  multiplierBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  multiplierText: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  hourDetails: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  hourDetailItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  hourDetailText: { fontSize: 12, color: 'rgba(255,255,255,0.5)' },
  hourActions: { flexDirection: 'row', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1a1a1e', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#ffffff' },
  modalClose: { width: 32, height: 32, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#ffffff', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dayRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dayOption: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  dayOptionActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accent },
  dayText: { fontSize: 12, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  dayTextActive: { color: '#ffffff' },
  sliderRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  sliderOption: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  sliderOptionActive: { backgroundColor: ADMIN_COLORS.accent, borderColor: ADMIN_COLORS.accent },
  sliderText: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.5)' },
  sliderTextActive: { color: '#ffffff' },
  saveBtn: { backgroundColor: ADMIN_COLORS.accent, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
});
