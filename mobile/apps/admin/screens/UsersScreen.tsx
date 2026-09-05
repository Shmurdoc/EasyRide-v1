import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  StatusBar, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';
import { ADMIN_COLORS } from '../constants/theme';
import { useAdminUsers } from '../hooks/useAdminUsers';
import { Card } from '../components/common/Card';
import { Avatar } from '../components/common/Avatar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';

type Nav = NativeStackNavigationProp<any>;
const ROLE_FILTERS = ['all', 'rider', 'driver', 'admin'];

export default function UsersScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const theme = useTheme();
  const { users, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminUsers();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return COLORS.brand;
      case 'driver': return COLORS.info;
      case 'rider': return COLORS.success;
      default: return COLORS.textMuted;
    }
  };

  const renderUser = ({ item }: { item: any }) => {
    const isActive = item.is_active ?? true;
    const roleColor = getRoleColor(item.role);

    return (
      <Card style={styles.userCard}>
        <TouchableOpacity
          onPress={() => navigation.navigate('AdminUserDetail', { id: item.id, user: item })}
          activeOpacity={0.7}
        >
          <View style={styles.userTop}>
            <View style={styles.userTopLeft}>
              <Avatar name={item.name || 'Unknown'} size={50} />
              <View style={styles.userMeta}>
                <Text style={[styles.userName, { color: COLORS.text }]}>{item.name}</Text>
                <Text style={[styles.userEmail, { color: COLORS.textMuted }]}>{item.email}</Text>
                <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
                  <Text style={[styles.roleText, { color: roleColor }]}>{(item.role || 'user').toUpperCase()}</Text>
                </View>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: isActive ? 'rgba(31,157,85,0.2)' : 'rgba(229,72,77,0.2)' }]}>
              <Text style={[styles.statusText, { color: isActive ? COLORS.success : COLORS.error }]}>
                {isActive ? 'ACTIVE' : 'INACTIVE'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={[styles.userActions, { borderTopColor: COLORS.border }]}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: COLORS.brand }]}
            onPress={() => navigation.navigate('AdminUserDetail', { id: item.id, user: item })}
          >
            <Text style={styles.primaryBtnText}>View Profile</Text>
          </TouchableOpacity>
        </View>
      </Card>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Users</Text>
        </View>
        <View style={styles.tabRow}>
          {ROLE_FILTERS.map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabBtn, filter === tab && styles.tabBtnActive]}
              onPress={() => setFilter(tab)}
            >
              <Text style={[styles.tabText, filter === tab && styles.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </LinearGradient>

      <View style={[styles.searchSection, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.searchInputWrap, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: COLORS.text }]}
            value={search}
            onChangeText={setSearch}
            placeholder="Search users..."
            placeholderTextColor={COLORS.textMuted}
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
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={COLORS.brand} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingBottom: 16, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#ffffff' },
  tabRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  tabBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.1)' },
  tabBtnActive: { backgroundColor: '#ffffff' },
  tabText: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.5)' },
  tabTextActive: { color: '#E25500', fontWeight: '600' },
  searchSection: { paddingHorizontal: 16, paddingVertical: 12 },
  searchInputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, gap: 8 },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14 },
  list: { padding: 16, paddingBottom: 100 },
  userCard: { marginBottom: 12 },
  userTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  userTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  userMeta: { flex: 1 },
  userName: { fontSize: 15, fontWeight: '600' },
  userEmail: { fontSize: 12, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, marginTop: 4 },
  roleText: { fontSize: 9, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 10, fontWeight: '700' },
  userActions: { flexDirection: 'row', gap: 8, paddingTop: 12, borderTopWidth: 1 },
  primaryBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  primaryBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
