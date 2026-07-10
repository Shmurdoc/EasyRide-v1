import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { consent as consentApi } from '@easyryde/shared';
import type { ConsentType, ConsentRecord } from '@easyryde/shared';

interface Props {
  navigation: any;
  onConsentComplete?: () => void;
}

const CONSENT_ITEMS: { type: ConsentType; title: string; description: string; required: boolean }[] = [
  {
    type: 'terms_of_service',
    title: 'Terms of Service',
    description: 'Our Terms of Service govern your use of the EasyRyde platform.',
    required: true,
  },
  {
    type: 'privacy_policy',
    title: 'Privacy Policy',
    description: 'Our Privacy Policy explains how we collect, use, and protect your data.',
    required: true,
  },
  {
    type: 'location_tracking',
    title: 'Location Tracking',
    description: 'We use your location to match you with riders and navigate to destinations.',
    required: true,
  },
  {
    type: 'data_sharing_partners',
    title: 'Data Sharing with Partners',
    description: 'Share limited data with our payment and mapping partners to provide the service.',
    required: false,
  },
  {
    type: 'marketing_email',
    title: 'Email Marketing',
    description: 'Receive promotional offers and updates via email.',
    required: false,
  },
  {
    type: 'marketing_sms',
    title: 'SMS Marketing',
    description: 'Receive promotional offers and updates via SMS.',
    required: false,
  },
  {
    type: 'biometric_data',
    title: 'Biometric Data',
    description: 'Store fingerprint or face recognition for faster and more secure sign-in. Used solely for authentication, retained until you withdraw consent, and processed in compliance with applicable data protection laws.',
    required: false,
  },
];

export default function ConsentScreen({ navigation, onConsentComplete }: Props) {
  const [consents, setConsents] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConsents();
  }, []);

  const loadConsents = async () => {
    try {
      const res = await consentApi.list();
      const records = res?.data ?? (res as any)?.data?.data ?? [];
      const granted: Record<string, boolean> = {};
      CONSENT_ITEMS.forEach(item => {
        const record = records.find((r: ConsentRecord) => r.consent_type === item.type);
        granted[item.type] = record?.status === 'granted';
      });
      setConsents(granted);
    } catch (e) {
      CONSENT_ITEMS.forEach(item => {
        setConsents(prev => ({ ...prev, [item.type]: item.required }));
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = useCallback((type: ConsentType, value: boolean) => {
    setConsents(prev => ({ ...prev, [type]: value }));
  }, []);

  const handleSave = async () => {
    const requiredItems = CONSENT_ITEMS.filter(item => item.required);
    const allRequired = requiredItems.every(item => consents[item.type]);
    if (!allRequired) {
      Alert.alert('Required Consents', 'You must accept all required consents to use EasyRyde.');
      return;
    }

    setSaving(true);
    try {
      const res = await consentApi.list();
      const records = res?.data ?? (res as any)?.data?.data ?? [];
      const errors: string[] = [];

      await Promise.all(
        CONSENT_ITEMS.map(async item => {
          const wasGranted = consents[item.type];
          const existing = records.find((r: ConsentRecord) => r.consent_type === item.type);
          const isCurrentlyGranted = existing?.status === 'granted';

          try {
            if (wasGranted && !isCurrentlyGranted) {
              await consentApi.grant(item.type, '1.0');
            } else if (!wasGranted && isCurrentlyGranted) {
              await consentApi.revoke(item.type);
            }
          } catch {
            errors.push(item.title);
          }
        }),
      );

      if (errors.length > 0) {
        Alert.alert('Partial Error', `Failed to update: ${errors.join(', ')}. Please try again.`);
        return;
      }
      onConsentComplete?.();
    } catch (e) {
      Alert.alert('Error', 'Failed to save consent preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="shield-checkmark" size={48} color="#16a34a" />
        <Text style={styles.headerTitle}>Privacy & Consent</Text>
        <Text style={styles.headerSubtitle}>
          Manage your data preferences. Required consents are needed to use the app.
        </Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {CONSENT_ITEMS.map(item => (
          <View key={item.type} style={styles.consentItem}>
            <View style={styles.consentInfo}>
              <Text style={styles.consentTitle}>
                {item.title}
                {item.required && <Text style={styles.required}> *</Text>}
              </Text>
              <Text style={styles.consentDescription}>{item.description}</Text>
            </View>
            <Switch
              value={consents[item.type] ?? false}
              onValueChange={(val) => handleToggle(item.type, val)}
              trackColor={{ false: '#3a3a3c', true: '#16a34a80' }}
              thumbColor={consents[item.type] ? '#16a34a' : '#f4f3f4'}
              disabled={item.required}
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Preferences</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1c1c1e',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1c1c1e',
  },
  header: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginTop: 12,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#98989d',
    marginTop: 8,
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#242426',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
  },
  consentInfo: {
    flex: 1,
    marginRight: 12,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  required: {
    color: '#FF3B30',
    fontSize: 14,
  },
  consentDescription: {
    fontSize: 13,
    color: '#98989d',
    marginTop: 4,
    lineHeight: 18,
  },
  footer: {
    padding: 16,
    paddingBottom: 32,
  },
  saveButton: {
    backgroundColor: '#16a34a',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
});
