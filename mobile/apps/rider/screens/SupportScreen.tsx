import { useTheme } from '@easyryde/shared';
import React, { useState } from 'react';
import {
  View, StyleSheet, Text, TouchableOpacity, ScrollView, Linking,
  TextInput, Alert, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, SHADOWS } from '@easyryde/shared';
import { GlowButton } from '@easyryde/shared';
import type { RiderNav } from '@easyryde/shared';

const FAQ_ITEMS = [
  {
    question: 'How do I book a ride?',
    answer: '1. Open the app and enter your destination\n2. Choose your ride type (Economy, Standard, Premium, XL)\n3. Confirm your pickup location on the map\n4. Tap "Book Ride" to request a driver\n5. Wait for your driver to arrive\n6. Track your ride in real-time on the map',
  },
  {
    question: 'How do I pay?',
    answer: 'EasyRyde supports multiple payment methods:\n\n• Cash — Pay your driver directly in cash at the end of the ride\n• Wallet — Use your EasyRyde wallet balance (top up from the Wallet screen)\n• Card — Visa or Mastercard linked to your account\n• Ozow — Instant EFT from your South African bank account\n\nPayment is processed automatically when your ride ends.',
  },
  {
    question: 'How do I apply a promo code?',
    answer: '1. Go to your Profile and tap "Promo Codes"\n2. Enter your code in the text field and tap "Apply"\n3. Once validated, tap "Use on Next Ride"\n4. The discount will automatically apply to your next eligible ride\n\nYou can also browse available promotions in the Promo Codes screen.',
  },
  {
    question: 'How do I report an issue?',
    answer: 'For ride-related issues:\n1. Go to your Ride History and select the ride\n2. Tap "Report a Problem"\n3. Describe the issue and submit\n\nFor urgent safety concerns during a ride, use the SOS button in the Support screen or the in-ride SOS button.\n\nYou can also contact us directly by phone or email.',
  },
  {
    question: 'How do I rate my driver?',
    answer: 'After each ride ends:\n1. You will be prompted to rate your driver\n2. Select a star rating (1-5 stars)\n3. Optionally add a comment about your experience\n4. Tap "Submit Rating"\n\nYou can also rate past rides from your Ride History.',
  },
  {
    question: 'Where is my refund?',
    answer: 'Refund timelines depend on the payment method:\n\n• Wallet — Refunded instantly to your wallet balance\n• Card — 3-5 business days to appear on your statement\n• Ozow — 1-2 business days\n• Cash — No refund applicable; report for investigation\n\nIf you have not received your refund within the expected timeframe, please contact support.',
  },
];

export default function SupportScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const navigation = useNavigation<RiderNav>();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [showReportForm, setShowReportForm] = useState(false);
  const [reportText, setReportText] = useState('');

  function toggleFaq(index: number) {
    setExpandedFaq(expandedFaq === index ? null : index);
  }

  async function handleCall() {
    try {
      await Linking.openURL('tel:0150000000');
    } catch {
      Alert.alert('Error', 'Could not open phone dialer.');
    }
  }

  async function handleEmail() {
    try {
      await Linking.openURL('mailto:support@easyryde.com?subject=Rider Support Request');
    } catch {
      Alert.alert('Error', 'Could not open email app.');
    }
  }

  function handleSOS() {
    Alert.alert(
      'Emergency SOS',
      'This will alert our safety team and share your location. Only use in genuine emergencies.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send SOS', style: 'destructive', onPress: () => Alert.alert('SOS Sent', 'Our safety team has been notified.') },
      ],
    );
  }

  function handleReportSubmit() {
    if (!reportText.trim()) { Alert.alert('Describe the issue', 'Please enter details about your problem.'); return; }
    Alert.alert('Report Submitted', 'Our team will review your report and get back to you within 24 hours.');
    setReportText('');
    setShowReportForm(false);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Support</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* FAQ Section */}
        <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
        {FAQ_ITEMS.map((item, index) => (
          <View key={index} style={styles.faqItem}>
            <TouchableOpacity
              style={styles.faqHeader}
              onPress={() => toggleFaq(index)}
              activeOpacity={0.7}
            >
              <Text style={styles.faqQuestion}>{item.question}</Text>
              <Ionicons
                name={expandedFaq === index ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={COLORS.textDim}
              />
            </TouchableOpacity>
            {expandedFaq === index && (
              <View style={styles.faqAnswer}>
                <Text style={styles.faqAnswerText}>{item.answer}</Text>
              </View>
            )}
          </View>
        ))}

        {/* Contact Support */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Contact Support</Text>

        <TouchableOpacity style={styles.contactRow} onPress={handleCall} activeOpacity={0.7}>
          <View style={styles.contactIconWrap}>
            <Ionicons name="call-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Phone</Text>
            <Text style={styles.contactValue}>015 000 0000</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.contactRow} onPress={handleEmail} activeOpacity={0.7}>
          <View style={styles.contactIconWrap}>
            <Ionicons name="mail-outline" size={20} color={COLORS.primary} />
          </View>
          <View style={styles.contactInfo}>
            <Text style={styles.contactLabel}>Email</Text>
            <Text style={styles.contactValue}>support@easyryde.com</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.textDim} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => setShowReportForm(!showReportForm)}
          activeOpacity={0.7}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={COLORS.primary} />
          <Text style={styles.reportBtnText}>Report a Problem</Text>
          <Ionicons
            name={showReportForm ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={COLORS.textDim}
          />
        </TouchableOpacity>

        {showReportForm && (
          <View style={styles.reportForm}>
            <TextInput
              style={styles.reportInput}
              placeholder="Describe your issue..."
              placeholderTextColor={COLORS.textDim}
              value={reportText}
              onChangeText={setReportText}
              multiline
              numberOfLines={5}
              textAlignVertical="top"
            />
            <GlowButton title="Submit Report" onPress={handleReportSubmit} size="md" />
          </View>
        )}

        {/* Emergency */}
        <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Emergency</Text>
        <TouchableOpacity style={styles.sosBtn} onPress={handleSOS} activeOpacity={0.7}>
          <View style={styles.sosIconWrap}>
            <Ionicons name="alert-circle" size={24} color="#fff" />
          </View>
          <View style={styles.sosInfo}>
            <Text style={styles.sosTitle}>Emergency SOS</Text>
            <Text style={styles.sosSubtitle}>Alert safety team & share location</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.6)" />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
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
  content: { padding: SPACING.base, paddingBottom: 40 },

  sectionTitle: {
    color: COLORS.textMuted, fontSize: 13, fontWeight: '600',
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: SPACING.md,
  },

  faqItem: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    marginBottom: SPACING.sm, borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden',
  },
  faqHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: SPACING.md,
  },
  faqQuestion: { color: COLORS.text, fontSize: 15, fontWeight: '600', flex: 1, marginRight: SPACING.sm },
  faqAnswer: {
    paddingHorizontal: SPACING.md, paddingBottom: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  faqAnswerText: {
    color: COLORS.textDim, fontSize: 13, lineHeight: 20, paddingTop: SPACING.md,
  },

  contactRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border,
  },
  contactIconWrap: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primaryGlow,
    justifyContent: 'center', alignItems: 'center', marginRight: SPACING.md,
  },
  contactInfo: { flex: 1 },
  contactLabel: { color: COLORS.textMuted, fontSize: 12 },
  contactValue: { color: COLORS.text, fontSize: 15, fontWeight: '500', marginTop: 2 },

  reportBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md, padding: SPACING.md, marginBottom: SPACING.sm,
    borderWidth: 1, borderColor: COLORS.border, gap: SPACING.md,
  },
  reportBtnText: { color: COLORS.text, fontSize: 15, fontWeight: '500', flex: 1 },

  reportForm: {
    backgroundColor: COLORS.surface, borderRadius: RADIUS.md,
    padding: SPACING.md, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  reportInput: {
    backgroundColor: COLORS.bg, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.border, padding: SPACING.md,
    fontSize: 14, color: COLORS.text, minHeight: 120, marginBottom: SPACING.md,
  },

  sosBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.error, borderRadius: RADIUS.lg,
    padding: SPACING.md, gap: SPACING.md,
  },
  sosIconWrap: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center', alignItems: 'center',
  },
  sosInfo: { flex: 1 },
  sosTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sosSubtitle: { color: 'rgba(255,255,255,0.7)', fontSize: 12, marginTop: 2 },
});
