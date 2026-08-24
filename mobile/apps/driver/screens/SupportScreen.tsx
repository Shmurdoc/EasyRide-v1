import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ScrollView, Text, SafeAreaView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS } from '@easyryde/shared';

const FAQ_ITEMS = [
  {
    question: 'How do I go online/offline?',
    answer: 'Tap the toggle switch on the Dashboard screen to go online. When online, you\'ll receive ride requests in your area. Tap again to go offline — you won\'t receive new requests while offline.',
  },
  {
    question: 'How do I accept a ride?',
    answer: 'When a ride request comes in, you\'ll see a notification with the rider\'s pickup location and estimated fare. Tap "Accept" to confirm the ride or let the timer expire to decline. You have 15 seconds to respond.',
  },
  {
    question: 'How do I mark arrival and start a ride?',
    answer: 'Navigate to the rider\'s pickup location using the in-app map. When you arrive, tap "Arrived" to notify the rider. Once the rider is in the vehicle, tap "Start Ride" to begin the trip.',
  },
  {
    question: 'How do I complete a ride and get paid?',
    answer: 'When you reach the destination, tap "Complete Ride". The fare will be calculated automatically based on distance and time. Payment is processed instantly to your wallet. You can view earnings in the Earnings tab.',
  },
  {
    question: 'How do I update my vehicle documents?',
    answer: 'Go to Profile > Documents to upload or update your vehicle insurance, registration, and driver\'s license. Documents are reviewed within 24 hours. You\'ll receive a notification once verified.',
  },
  {
    question: 'What if a rider cancels?',
    answer: 'If a rider cancels before pickup, you\'ll receive a cancellation fee based on how far you\'ve traveled. Cancellation fees are added to your wallet automatically. If you need to cancel, provide a reason to avoid penalties.',
  },
  {
    question: 'How do I report an issue?',
    answer: 'Tap "Report a Problem" below or go to Profile > Help & Support. Describe the issue with as much detail as possible. For urgent safety concerns, use the SOS button on the Active Ride screen.',
  },
  {
    question: 'How do I check my earnings?',
    answer: 'Navigate to the Earnings tab in the bottom navigation bar. You can view today\'s earnings, weekly totals, and detailed trip-by-trip breakdowns. Payouts are processed weekly to your registered bank account.',
  },
];

export default function SupportScreen({ navigation }: { navigation: any }) {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const handleCall = () => {
    Linking.openURL('tel:+27123456789');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:support@easyryde.com');
  };

  const handleReportProblem = () => {
    Alert.alert(
      'Report a Problem',
      'What category best describes your issue?',
      [
        { text: 'Ride Issue', onPress: () => Alert.alert('Submitted', 'Your ride issue report has been received.') },
        { text: 'Payment Issue', onPress: () => Alert.alert('Submitted', 'Your payment issue report has been received.') },
        { text: 'Safety Concern', onPress: () => Alert.alert('Submitted', 'Your safety concern report has been received.') },
        { text: 'App Bug', onPress: () => Alert.alert('Submitted', 'Your bug report has been received.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleSos = () => {
    Alert.alert(
      'Emergency SOS',
      'This will alert our safety team and share your location. Only use in genuine emergencies. Call local emergency services (10111) for immediate danger.',
      [
        { text: 'Call Emergency Services', style: 'destructive', onPress: () => Linking.openURL('tel:10111') },
        { text: 'Alert Safety Team', onPress: () => Alert.alert('SOS Sent', 'Our safety team has been notified and will contact you shortly.') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.sectionHeader}>
          <Ionicons name="help-circle" size={16} color={COLORS.success} />
          <Text style={styles.sectionHeaderText}>FREQUENTLY ASKED QUESTIONS</Text>
        </View>
        <View style={styles.faqContainer}>
          {FAQ_ITEMS.map((item, index) => (
            <View key={index} style={styles.faqItem}>
              <TouchableOpacity
                style={styles.faqQuestion}
                onPress={() => toggleFaq(index)}
                activeOpacity={0.7}
              >
                <Text style={[styles.faqQuestionText, expandedFaq === index && styles.faqQuestionTextActive]}>
                  {item.question}
                </Text>
                <Ionicons
                  name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color={expandedFaq === index ? COLORS.success : COLORS.textMuted}
                />
              </TouchableOpacity>
              {expandedFaq === index && (
                <View style={styles.faqAnswer}>
                  <Text style={styles.faqAnswerText}>{item.answer}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="chatbubbles" size={16} color={COLORS.success} />
          <Text style={styles.sectionHeaderText}>CONTACT SUPPORT</Text>
        </View>
        <View style={styles.contactContainer}>
          <TouchableOpacity style={styles.contactItem} onPress={handleCall} activeOpacity={0.7}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="call" size={20} color={COLORS.success} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Phone</Text>
              <Text style={styles.contactValue}>+27 12 345 6789</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.contactItem} onPress={handleEmail} activeOpacity={0.7}>
            <View style={styles.contactIconContainer}>
              <Ionicons name="mail" size={20} color={COLORS.success} />
            </View>
            <View style={styles.contactInfo}>
              <Text style={styles.contactLabel}>Email</Text>
              <Text style={styles.contactValue}>support@easyryde.com</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.reportBtn} onPress={handleReportProblem} activeOpacity={0.7}>
            <Ionicons name="alert-circle" size={20} color="#fff" />
            <Text style={styles.reportBtnText}>Report a Problem</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Ionicons name="warning" size={16} color={COLORS.error} />
          <Text style={[styles.sectionHeaderText, { color: COLORS.error }]}>EMERGENCY</Text>
        </View>
        <TouchableOpacity style={styles.sosBtn} onPress={handleSos} activeOpacity={0.7}>
          <View style={styles.sosIconContainer}>
            <Ionicons name="flash" size={28} color="#fff" />
          </View>
          <Text style={styles.sosTitle}>Emergency SOS</Text>
          <Text style={styles.sosSubtitle}>Alert safety team & share your location</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  backBtn: { width: 36, height: 36, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },

  content: { padding: SPACING.base, paddingBottom: 40 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
    marginTop: 8,
  },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },

  faqContainer: { gap: 8, marginBottom: 24 },
  faqItem: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  faqQuestionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#fff', marginRight: 8 },
  faqQuestionTextActive: { color: COLORS.success },
  faqAnswer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  faqAnswerText: { fontSize: 14, color: COLORS.textMuted, lineHeight: 21, marginTop: 12 },

  contactContainer: { gap: 8, marginBottom: 24 },
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: COLORS.successGlow,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: { flex: 1 },
  contactLabel: { fontSize: 12, color: COLORS.textMuted },
  contactValue: { fontSize: 15, fontWeight: '600', color: '#fff', marginTop: 2 },

  reportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.lg,
    padding: 16,
  },
  reportBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  sosBtn: {
    alignItems: 'center',
    backgroundColor: COLORS.errorGlow,
    borderRadius: RADIUS.lg,
    padding: 24,
    borderWidth: 1,
    borderColor: COLORS.error,
  },
  sosIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.error,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  sosTitle: { fontSize: 18, fontWeight: '700', color: COLORS.error },
  sosSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 4 },
});
