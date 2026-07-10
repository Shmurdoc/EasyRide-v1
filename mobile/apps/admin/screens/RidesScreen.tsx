import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, StyleSheet, RefreshControl, TouchableOpacity,
  TextInput, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ADMIN_COLORS, ADMIN_GRADIENTS } from '../constants/theme';
import { useAdminRides } from '../hooks/useAdminRides';
import RideCard from '../components/rides/RideCard';
import FilterTabs from '../components/common/FilterTabs';
import { SearchBar } from '../components/common/SearchBar';
import EmptyState from '../components/common/EmptyState';
import LoadingSpinner from '../components/common/LoadingSpinner';
import ErrorState from '../components/common/ErrorState';

type Nav = NativeStackNavigationProp<any>;

const STATUS_FILTERS = ['all', 'pending', 'active', 'completed', 'cancelled'];

export default function RidesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();
  const { rides, loading, error, refreshing, refresh, loadMore, filter, setFilter, search, setSearch, hasMore } = useAdminRides();
  const [searchOpen, setSearchOpen] = useState(false);

  const handleSearchSubmit = useCallback(() => {
    setSearch(search);
  }, [search, setSearch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={ADMIN_GRADIENTS.header} style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={22} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Rides</Text>
          </View>
          <TouchableOpacity onPress={() => setSearchOpen(!searchOpen)} style={styles.iconBtn}>
            <Ionicons name={searchOpen ? 'close' : 'search'} size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {searchOpen && (
        <View style={styles.searchWrap}>
          <SearchBar
            value={search}
            onChangeText={setSearch}
            onSubmitEditing={handleSearchSubmit}
            placeholder="Search by ride ID, rider, driver..."
          />
        </View>
      )}

      <FilterTabs
        tabs={STATUS_FILTERS}
        activeTab={filter}
        onTabPress={setFilter}
      />

      {loading && !refreshing ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <FlatList
          data={rides}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <RideCard
              ride={item}
              onPress={() => navigation.navigate('AdminRideDetail', { id: item.id })}
            />
          )}
          ListEmptyComponent={<EmptyState icon="car" message="No rides found" />}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ADMIN_COLORS.accent} />}
          onEndReached={() => { if (hasMore) loadMore(); }}
          onEndReachedThreshold={0.3}
          showsVerticalScrollIndicator={false}
        />
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
  iconBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  searchWrap: { paddingHorizontal: 16, paddingTop: 12 },
  list: { padding: 16, paddingBottom: 100 },
});
