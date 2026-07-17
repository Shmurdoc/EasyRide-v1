import React, { useState, useEffect, useCallback } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, FlatList, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { notifications, COLORS, SPACING, RADIUS } from '@easyryde/shared';
import { GlowButton } from '@easyryde/shared';
import type { Notification } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

type FilterTab = 'all' | 'unread' | 'rides' | 'promotions';

const FILTER_TABS: { key: FilterTab; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'rides', label: 'Rides' },
  { key: 'promotions', label: 'Promos' },
];

function getNotificationIcon(data?: any): string {
  if (!data) return 'notifications-outline';
  if (data.type === 'ride_completed' || data.type === 'ride_started') return 'car-sport-outline';
  if (data.type === 'payment') return 'card-outline';
  if (data.type === 'promo') return 'pricetag-outline';
  if (data.type === 'sos') return 'alert-circle-outline';
  return 'notifications-outline';
}

function getNotificationColor(data?: any): string {
  if (!data) return COLORS.textDim;
  if (data.type === 'ride_completed') return COLORS.success;
  if (data.type === 'ride_started') return COLORS.primary;
  if (data.type === 'payment') return COLORS.primaryLight;
  if (data.type === 'promo') return COLORS.warning;
  if (data.type === 'sos') return COLORS.error;
  return COLORS.textDim;
}

function getTimeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

export default function NotificationScreen() {
  const navigation = useNavigation<RiderNav>();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [markingAll, setMarkingAll] = useState(false);

  useEffect(() => { fetchNotifications(); }, []);

  async function fetchNotifications() {
    try {
      if (!refreshing) setLoading(true);
      setError(null);
      const response = await notifications.list();
      setNotifs(response.data);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  const onRefresh = useCallback(() => { setRefreshing(true); fetchNotifications(); }, []);

  async function markAsRead(id: string) {
    try {
      await notifications.markAsRead(id);
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch {}
  }

  async function markAllAsRead() {
    setMarkingAll(true);
    try {
      await notifications.markAllAsRead();
      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
    } finally {
      setMarkingAll(false);
    }
  }

  function getFilteredNotifs(): Notification[] {
    switch (activeFilter) {
      case 'unread':
        return notifs.filter(n => !n.read);
      case 'rides':
        return notifs.filter(n => n.data?.type?.includes('ride'));
      case 'promotions':
        return notifs.filter(n => n.data?.type?.includes('promo'));
      default:
        return notifs;
    }
  }

  const filtered = getFilteredNotifs();
  const unreadCount = notifs.filter(n => !n.read).length;

  function renderNotification({ item }: { item: Notification }) {
    const icon = getNotificationIcon(item.data);
    const color = getNotificationColor(item.data);
    return (
      <TouchableOpacity
        style={[styles.notifCard, !item.read && styles.notifCardUnread]}
        onPress={() => markAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={[styles.notifIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon as any} size={20} color={color} />
        </View>
        <View style={styles.notifInfo}>
          <View style={styles.notifTitleRow}>
            <Text style={styles.notifTitle} numberOfLines={1}>{item.title}</Text>
            {!item.read && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notifBody} numberOfLines={2}>{item.body}</Text>
          <Text style={styles.notifTime}>{getTimeAgo(item.created_at)}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllAsRead} disabled={markingAll}>
            <Text style={styles.markAllText}>{markingAll ? 'Marking...' : 'Mark all read'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {FILTER_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.filterTab, activeFilter === tab.key && styles.filterTabActive]}
            onPress={() => setActiveFilter(tab.key)}
          >
            <Text style={[styles.filterText, activeFilter === tab.key && styles.filterTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {error ? (
        <View style={styles.errorWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={COLORS.textDim} />
          <Text style={{ color: COLORS.textMuted, marginTop: SPACING.md }}>{error}</Text>
          <GlowButton title="Retry" onPress={fetchNotifications} size="sm" style={{ marginTop: SPACING.base }} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={64} color={COLORS.textDim} />
              <Text style={styles.emptyText}>No notifications yet</Text>
              <Text style={styles.emptySubtext}>You'll see ride updates, promotions, and more here</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: SPACING.base, paddingTop: SPACING.lg + 40, paddingBottom: SPACING.md,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.surface,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { color: COLORS.text, fontSize: 18, fontWeight: '600' },
  markAllText: { color: COLORS.primary, fontSize: 13, fontWeight: '600' },
  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  filterRow: {
    flexDirection: 'row', paddingHorizontal: SPACING.base,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  filterTab: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: COLORS.bg },

  listContent: { padding: SPACING.base, paddingTop: 0, paddingBottom: 40 },

  notifCard: {
    flexDirection: 'row', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  notifCardUnread: { borderColor: COLORS.primary + '40' },
  notifIconWrap: {
    width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  notifInfo: { flex: 1 },
  notifTitleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  notifTitle: { color: COLORS.text, fontSize: 14, fontWeight: '600', flex: 1 },
  unreadDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.primary,
  },
  notifBody: { color: COLORS.textDim, fontSize: 13, lineHeight: 18, marginTop: 4 },
  notifTime: { color: COLORS.textMuted, fontSize: 11, marginTop: 4 },

  emptyWrap: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyText: { color: COLORS.textMuted, fontSize: 16, fontWeight: '600', marginTop: SPACING.md },
  emptySubtext: { color: COLORS.textDim, fontSize: 13, marginTop: SPACING.xs, textAlign: 'center' },

  errorWrap: { alignItems: 'center', paddingVertical: SPACING['2xl'] },
});
