import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ADMIN_COLORS } from '../../constants/theme';

interface FilterTabsProps {
  tabs: string[];
  activeTab: string;
  onTabPress: (tab: string) => void;
}

export default function FilterTabs({ tabs, activeTab, onTabPress }: FilterTabsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={[styles.tab, activeTab === tab && styles.activeTab]}
          onPress={() => onTabPress(tab)}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 8 },
  content: { paddingHorizontal: 16 },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  activeTab: {
    backgroundColor: ADMIN_COLORS.accent,
    borderColor: ADMIN_COLORS.accent,
  },
  tabText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
});
