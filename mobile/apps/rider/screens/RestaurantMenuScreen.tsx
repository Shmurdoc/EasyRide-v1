import { useTheme } from '@easyryde/shared';
import React, { useState, useEffect } from 'react';
import { FlatList, TouchableOpacity, Alert, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { foodDelivery, COLORS, GRADIENTS, SPACING } from '@easyryde/shared';
import { Typography, GlowButton, GlassCard, GradientText, Badge, LoadingOverlay } from '@easyryde/shared';
import type { Restaurant, MenuItem, CartItem, RiderNav, RiderRoute } from '@easyryde/shared';

export default function RestaurantMenuScreen({ route, navigation }: { route: RiderRoute<'RestaurantMenu'>; navigation: RiderNav }) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadMenu(); }, [restaurantId]);

  async function loadMenu() { try { const data = await foodDelivery.restaurant(restaurantId); setRestaurant(data); } catch (err: any) { Alert.alert('Error', err?.message || 'Failed to load menu'); } finally { setLoading(false); setRefreshing(false); } }

  const onRefresh = React.useCallback(() => { setRefreshing(true); loadMenu(); }, [restaurantId]);

  const addToCart = (item: MenuItem) => setCart((prev) => { const e = prev.find((c) => c.menuItem.id === item.id); return e ? prev.map((c) => c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c) : [...prev, { menuItem: item, quantity: 1 }]; });
  const removeFromCart = (itemId: string) => setCart((prev) => { const e = prev.find((c) => c.menuItem.id === itemId); return e && e.quantity > 1 ? prev.map((c) => c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c) : prev.filter((c) => c.menuItem.id !== itemId); });
  const cartTotal = cart.reduce((s, i) => s + i.menuItem.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  if (loading || !restaurant) return <LoadingOverlay />;

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <FlatList
        data={restaurant.categories || []}
        keyExtractor={(item: any) => item.id}
        contentContainerStyle={{ padding: SPACING.base }}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListHeaderComponent={
          <View>
            <Typography variant="h2" style={{ marginBottom: SPACING.sm }}>{restaurant.name}</Typography>
            <Typography variant="xs" color={COLORS.textMuted} style={{ marginBottom: SPACING.base }}>{restaurant.cuisine_type || 'Restaurant'} · {restaurant.estimated_delivery_minutes}min</Typography>
          </View>
        }
        ListEmptyComponent={<Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginTop: 40 }}>No menu available</Typography>}
        renderItem={({ item: category }: any) => (
          <View style={{ marginBottom: SPACING.lg }}>
            <GradientText colors={GRADIENTS.primary} style={{ fontSize: 20, fontWeight: '600', marginBottom: SPACING.md }}>
              {category.name}
            </GradientText>
            {category.items?.map((item: MenuItem) => {
              const qty = cart.find((c) => c.menuItem.id === item.id)?.quantity || 0;
              return (
                <GlassCard key={item.id} padding={SPACING.base} style={{ marginBottom: SPACING.sm }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <View style={{ flex: 1 }}>
                      <Typography variant="body" style={{ fontWeight: '600' }}>{item.name}</Typography>
                      {item.description && <Typography variant="small" color={COLORS.textMuted} numberOfLines={2}>{item.description}</Typography>}
                      <GradientText
                        colors={GRADIENTS.primary}
                        style={{ fontSize: 16, fontWeight: '700', marginTop: SPACING.xs }}
                      >
                        R {item.price.toFixed(2)}
                      </GradientText>
                      <View style={{ flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm }}>
                        {item.is_vegetarian && <Badge label="Veg" variant="success" />}
                        {item.is_vegan && <Badge label="Vegan" variant="success" />}
                        {item.spice_level > 0 && <Badge label={`Spice ${item.spice_level}`} variant="warning" />}
                      </View>
                    </View>
                    {qty > 0 ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
                        <GlowButton title="-" onPress={() => removeFromCart(item.id)} size="sm" glowColor={COLORS.textMuted} />
                        <Typography variant="body">{qty}</Typography>
                        <GlowButton title="+" onPress={() => addToCart(item)} size="sm" />
                      </View>
                    ) : (
                      <GlowButton title="+" onPress={() => addToCart(item)} size="sm" />
                    )}
                  </View>
                </GlassCard>
              );
            })}
          </View>
        )}
      />
      {cartCount > 0 && (
        <LinearGradient
          colors={['rgba(10,10,10,0.95)', 'rgba(10,10,10,0.98)']}
          style={{ padding: SPACING.base, borderTopWidth: 1, borderTopColor: COLORS.glassBorder }}
        >
          <GlowButton
            title={`View Cart (${cartCount}) · R ${cartTotal.toFixed(2)}`}
            onPress={() => { navigation.navigate('FoodCheckout', { restaurantId: restaurant.id, restaurantName: restaurant.name, cart, subtotal: cartTotal, deliveryFee: restaurant.delivery_fee || 0 }); }}
            size="lg"
          />
        </LinearGradient>
      )}
    </View>
  );
}
