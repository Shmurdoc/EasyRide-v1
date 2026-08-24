import { useTheme } from '@easyryde/shared';
import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, TextInput, StyleSheet, Alert } from 'react-native';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { foodDelivery, COLORS, GRADIENTS, SPACING, RADIUS } from '@easyryde/shared';
import { Typography, GlassCard, GradientText, Shimmer } from '@easyryde/shared';
import type { Restaurant, RiderNav } from '@easyryde/shared';

export default function RestaurantListScreen({ navigation }: { navigation: RiderNav }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadRestaurants(); }, []);

  async function loadRestaurants() {
    try { const params: Record<string, string> = { per_page: '50' }; if (search) params.search = search; const data = await foodDelivery.restaurants(params); setRestaurants(data.data); }
    catch (err: any) { Alert.alert('Error', err?.message || 'Failed to load restaurants'); } finally { setLoading(false); setRefreshing(false); }
  }

  const onRefresh = React.useCallback(() => { setRefreshing(true); loadRestaurants(); }, []);

  if (loading) {
    return (
      <LinearGradient colors={GRADIENTS.background as unknown as string[]} style={{ flex: 1 }}>
        <Typography variant="h2" style={{ padding: SPACING.base, paddingBottom: SPACING.sm }}>Food Delivery</Typography>
        <View style={{ padding: SPACING.base, gap: SPACING.md }}>
          {[1, 2, 3].map(i => (
            <Shimmer key={i} height={100} borderRadius={RADIUS.xl} />
          ))}
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={GRADIENTS.background as unknown as string[]} style={{ flex: 1 }}>
      <Typography variant="h2" style={{ padding: SPACING.base, paddingBottom: SPACING.sm }}>Food Delivery</Typography>
      <TextInput style={styles.searchInput} placeholder="Search restaurants..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} onSubmitEditing={loadRestaurants} />
      <FlatList
        data={restaurants}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: SPACING.base }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginTop: 40 }}>No restaurants found</Typography>}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => navigation.navigate('RestaurantMenu', { restaurantId: item.id })}>
            <GlassCard padding={0} style={{ marginBottom: SPACING.md }}>
              <View style={{ flexDirection: 'row' }}>
                <LinearGradient
                  colors={GRADIENTS.surface as unknown as string[]}
                  style={styles.restaurantThumb}
                >
                  <Typography variant="h2" color={COLORS.primary}>{item.name[0]}</Typography>
                </LinearGradient>
                <View style={{ flex: 1, marginLeft: SPACING.md, paddingVertical: SPACING.base }}>
                  <Typography variant="body" style={{ fontWeight: '600' }}>{item.name}</Typography>
                  <Typography variant="xs" color={COLORS.textMuted}>{item.cuisine_type || 'Restaurant'}</Typography>
                  <View style={{ flexDirection: 'row', gap: SPACING.md, marginTop: SPACING.sm }}>
                    <GradientText colors={GRADIENTS.primary} style={{ fontSize: 13, fontWeight: '500' }}>
                      {item.rating.toFixed(1)} ★
                    </GradientText>
                    <Typography variant="xs" color={COLORS.textMuted}>{item.estimated_delivery_minutes}min</Typography>
                    <GradientText
                      colors={item.delivery_fee > 0 ? GRADIENTS.primary : [COLORS.success, COLORS.success]}
                      style={{ fontSize: 13, fontWeight: '500' }}
                    >
                      {item.delivery_fee > 0 ? `R${item.delivery_fee}` : 'Free'}
                    </GradientText>
                  </View>
                </View>
              </View>
            </GlassCard>
          </TouchableOpacity>
        )}
      />
    </LinearGradient>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  searchInput: {
    margin: SPACING.base, backgroundColor: COLORS.glass, borderRadius: RADIUS.md,
    padding: 12, fontSize: 16, borderWidth: 1, borderColor: COLORS.glassBorder, color: COLORS.text,
  },
  restaurantThumb: {
    width: 80, height: 80, borderTopLeftRadius: RADIUS.xl, borderBottomLeftRadius: RADIUS.xl,
    justifyContent: 'center', alignItems: 'center',
  },
});
