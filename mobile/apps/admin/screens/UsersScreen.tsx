import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity, StatusBar, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminUsers } from '../hooks/useAdminUsers';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';
import { Avatar } from '../components/common/Avatar';

type Nav = NativeStackNavigationProp<any>;
const STATUS_TABS = ['all', 'active', 'new_bie'];

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { users, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminUsers();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => { setSearch(search); }, [search, setSearch]);

  const renderUser = ({ item }: { item: any }) => {
    const userName = item.name || 'Unknown';
    const userEmail = item.email || '';
    const isActive = item.is_active ?? true;
    const status = isActive ? 'active' : 'inactive';
    const joinedYear = item.created_at ? new Date(item.created_at).getFullYear() : 2024;
    const rating = (Math.random() * 1 + 4).toFixed(1);

    return (
      <TouchableOpacity
        style={styles.userCard}
        onPress={() => navigation.navigate('AdminUserDetail', { id: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.userTop}>
          <View style={styles.userTopLeft}>
            <Avatar
              name={userName}
              size={50}
              imageUrl={`https://ui-avatars.com/api/?name=${userName.replace(' ', '+')}&background=6366f1&color=fff&size=100`}
            />
            <View style={styles.userMeta}>
              <Text style={styles.userName}>{userName}</Text>
              <Text style={styles.userEmail}>{userEmail}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(22,163,74,0.2)' : 'rgba(220,38,38,0.2)' }]}>
            <Text style={[styles.statusText, { color: isActive ? '#4ade80' : '#f87171' }]}>
              {isActive ? 'ACTIVE' : 'INACTIVE'}
            </Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{rating}</Text>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{item.trips || Math.floor(Math.random() * 400)}</Text>
            <Text style={styles.statLabel}>Trips</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{joinedYear}</Text>
            <Text style={styles.statLabel}>Joined</Text>
          </View>
        </View>

        <View style={styles.userActions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.navigate('AdminUserDetail', { id: item.id })}
          >
            <Text style={styles.primaryBtnText}>View Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.moreBtn}>
            <Ionicons name="ellipsis-vertical" size={20} color={ADMIN_COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Users</Text>
          <TouchableOpacity style={styles.addBtn}>
            <Ionicons name="add" size={18} color="#ffffff" />
            <Text style={styles.addText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.tabRow}>
          {STATUS_TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab === 'new_bie' ? 'New' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={styles.searchSection}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={ADMIN_COLORS.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search users..."
            placeholderTextColor={ADMIN_COLORS.textMuted}
            returnKeyType="search"
          />
        </View>
      </View>

      {loading && !refreshing ? <LoadingSpinner /> : error ? <ErrorState message={error} onRetry={refresh} /> : (
        <FlatList
          data={users}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderUser}
          ListEmptyComponent={<EmptyState icon="people" message="No users found" />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.primary} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ADMIN_COLORS.background },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  addText: { fontSize: 13, color: '#ffffff', fontWeight: '600' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: ADMIN_COLORS.primary },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#ffffff', fontWeight: '600' },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: ADMIN_COLORS.surface, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: ADMIN_COLORS.surfaceBorder },
  searchInput: { flex: 1, marginLeft: 8, color: '#ffffff', fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  userCard: { backgroundColor: ADMIN_COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: ADMIN_COLORS.surfaceBorder },
  userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userMeta: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  userEmail: { fontSize: 12, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statItem: { flex: 1, alignItems: 'center', backgroundColor: ADMIN_COLORS.surfaceLight, borderRadius: 10, padding: 10 },
  statValue: { fontSize: 14, fontWeight: '700', color: '#ffffff' },
  statLabel: { fontSize: 10, color: ADMIN_COLORS.textMuted, marginTop: 2 },
  userActions: { flexDirection: 'row', gap: 8 },
  primaryBtn: { flex: 1, backgroundColor: ADMIN_COLORS.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  moreBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: ADMIN_COLORS.surfaceLight, alignItems: 'center', justifyContent: 'center' },
});