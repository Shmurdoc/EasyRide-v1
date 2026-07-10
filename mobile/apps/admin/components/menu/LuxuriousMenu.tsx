import React, { useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
  Dimensions, StatusBar, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ADMIN_COLORS } from '../../constants/theme';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MenuItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFocused: keyof typeof Ionicons.glyphMap;
  gradient: readonly [string, string];
}

const MENU_ITEMS: MenuItem[] = [
  { key: 'Dashboard', label: 'Dashboard', icon: 'grid-outline', iconFocused: 'grid', gradient: ['#6366f1', '#4f46e5'] },
  { key: 'Rides', label: 'Rides', icon: 'car-outline', iconFocused: 'car', gradient: ['#3b82f6', '#2563eb'] },
  { key: 'Drivers', label: 'Drivers', icon: 'people-outline', iconFocused: 'people', gradient: ['#16a34a', '#15803d'] },
  { key: 'Users', label: 'Users', icon: 'person-outline', iconFocused: 'person', gradient: ['#f59e0b', '#d97706'] },
  { key: 'Settings', label: 'Settings', icon: 'settings-outline', iconFocused: 'settings', gradient: ['#8b5cf6', '#7c3aed'] },
];

interface LuxuriousMenuProps {
  visible: boolean;
  activeTab: string;
  onClose: () => void;
  onTabPress: (tab: string) => void;
}

export function LuxuriousMenu({ visible, activeTab, onClose, onTabPress }: LuxuriousMenuProps) {
  const insets = useSafeAreaInsets();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;
  const itemAnims = useRef(MENU_ITEMS.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    if (visible) {
      StatusBar.setBarStyle('light-content');
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, tension: 65, friction: 9, useNativeDriver: true }),
        ...itemAnims.map((anim, i) =>
          Animated.timing(anim, { toValue: 1, duration: 250, delay: 80 + i * 60, useNativeDriver: true })
        ),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 0.9, duration: 200, useNativeDriver: true }),
        ...itemAnims.map(anim =>
          Animated.timing(anim, { toValue: 0, duration: 150, useNativeDriver: true })
        ),
      ]).start();
    }
  }, [visible]);

  const handleTabPress = (tab: string) => {
    Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() => {
      onTabPress(tab);
      onClose();
    });
  };

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
      <LinearGradient
        colors={['#0a0a0f', '#12121a', '#0a0a0f']}
        style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}
      >
        <Animated.View style={[styles.content, { transform: [{ scale: scaleAnim }] }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoCircle}>
                <Ionicons name="shield-checkmark" size={28} color="#ffffff" />
              </View>
              <View>
                <Text style={styles.brandName}>EasyRyde</Text>
                <Text style={styles.brandSub}>Admin Panel</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Menu Items */}
          <View style={styles.menuList}>
            {MENU_ITEMS.map((item, index) => {
              const isActive = activeTab === item.key;
              return (
                <Animated.View
                  key={item.key}
                  style={{
                    opacity: itemAnims[index],
                    transform: [{
                      translateX: itemAnims[index].interpolate({
                        inputRange: [0, 1],
                        outputRange: [40, 0],
                      }),
                    }],
                  }}
                >
                  <TouchableOpacity
                    style={[styles.menuItem, isActive && styles.menuItemActive]}
                    onPress={() => handleTabPress(item.key)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isActive ? item.gradient : ['transparent', 'transparent']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.menuItemGradient}
                    >
                      <View style={styles.menuItemLeft}>
                        <View style={[styles.iconCircle, isActive && { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                          <Ionicons
                            name={isActive ? item.iconFocused : item.icon}
                            size={22}
                            color={isActive ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          />
                        </View>
                        <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                          {item.label}
                        </Text>
                      </View>
                      {isActive && (
                        <View style={styles.activeIndicator}>
                          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.8)" />
                        </View>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              );
            })}
          </View>

          {/* Footer */}
          <View style={styles.divider} />
          <View style={styles.footer}>
            <Text style={styles.footerText}>EasyRyde Admin v4.0</Text>
            <Text style={styles.footerSub}>Phalaborwa, Limpopo</Text>
          </View>
        </Animated.View>
      </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    elevation: 9999,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  logoCircle: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(99, 102, 241, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(99, 102, 241, 0.4)',
  },
  brandName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSub: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.4)',
    marginTop: 1,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    marginVertical: 16,
  },
  menuList: {
    gap: 6,
  },
  menuItem: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 4,
  },
  menuItemActive: {
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuLabel: {
    fontSize: 17,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.5)',
  },
  menuLabelActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  activeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    alignItems: 'center',
    gap: 2,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.25)',
  },
  footerSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.15)',
  },
});
