import React, { useState, useEffect, useRef } from 'react';
import {
  View, StyleSheet, KeyboardAvoidingView, Platform, Alert, TouchableOpacity, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { COLORS, SPACING, RADIUS, auth } from '@easyryde/shared';
import { Typography, Input, Button, GradientText } from '@easyryde/shared';

const DRIVER_COLORS = {
  bg: '#1c1c1e',
  surface: '#242426',
  surfaceBorder: '#3a3a3c',
  accent: COLORS.brand,
  text: '#ffffff',
  textMuted: '#a1a1aa',
  textDim: '#666666',
};

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<any>();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (resendCooldown > 0) {
      timerRef.current = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }
  }, [resendCooldown]);

  const handleSend = async () => {
    if (!email) { Alert.alert('Error', 'Please enter your email address'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { Alert.alert('Error', 'Please enter a valid email address'); return; }
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setSent(true);
      setResendCooldown(60);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || loading) return;
    setLoading(true);
    try {
      await auth.forgotPassword(email);
      setResendCooldown(60);
      Alert.alert('Sent', 'A new reset link has been sent to your email.');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={DRIVER_COLORS.text} />
        </TouchableOpacity>

        <GradientText colors={[COLORS.brand, COLORS.brandDark]} style={{ fontSize: 24, fontWeight: '700', textAlign: 'center' }}>
          Reset Password
        </GradientText>
        <Typography variant="body" color={DRIVER_COLORS.textMuted} style={styles.subtitle}>
          Enter your email address and we'll send you a link to reset your password.
        </Typography>

        {sent ? (
          <View style={styles.sentContainer}>
            <View style={styles.sentIconWrap}>
              <Ionicons name="mail-open-outline" size={48} color={DRIVER_COLORS.accent} />
            </View>
            <Typography variant="h3" color={DRIVER_COLORS.text} style={{ textAlign: 'center', marginTop: SPACING.lg }}>
              Check Your Email
            </Typography>
            <Typography variant="bodySmall" color={DRIVER_COLORS.textMuted} style={{ textAlign: 'center', marginTop: SPACING.sm, lineHeight: 20 }}>
              We sent a password reset link to{'\n'}
              <Typography variant="bodySmall" color={DRIVER_COLORS.text} style={{ fontWeight: '600' }}>{email}</Typography>
            </Typography>

            <TouchableOpacity
              style={[styles.resendBtn, resendCooldown > 0 && styles.resendBtnDisabled]}
              onPress={handleResend}
              disabled={resendCooldown > 0 || loading}
              activeOpacity={0.7}
            >
              {loading ? (
                <Typography variant="bodySmall" color={DRIVER_COLORS.textMuted}>Sending...</Typography>
              ) : resendCooldown > 0 ? (
                <Typography variant="bodySmall" color={DRIVER_COLORS.textDim}>Resend in {resendCooldown}s</Typography>
              ) : (
                <Typography variant="bodySmall" color={DRIVER_COLORS.accent} style={{ fontWeight: '600' }}>
                  Resend Email
                </Typography>
              )}
            </TouchableOpacity>

            <Button
              title="Back to Login"
              onPress={() => navigation.navigate('Login')}
              variant="secondary"
              size="lg"
              style={{ marginTop: SPACING.lg }}
            />
          </View>
        ) : (
          <>
            <View style={styles.iconWrap}>
              <Ionicons name="key-outline" size={32} color={DRIVER_COLORS.accent} />
            </View>

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={{ marginBottom: SPACING.base }}
            />

            <Button
              title={loading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleSend}
              disabled={loading}
              size="lg"
              style={{ marginBottom: SPACING.base }}
            />

            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.backToLogin}>
              <Ionicons name="arrow-back" size={16} color={DRIVER_COLORS.textMuted} />
              <Typography variant="bodySmall" color={DRIVER_COLORS.textMuted}>Back to Login</Typography>
            </TouchableOpacity>
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: DRIVER_COLORS.bg },
  inner: { flex: 1, justifyContent: 'center', padding: SPACING.lg },
  backBtn: { position: 'absolute', top: SPACING.xl, left: SPACING.base, zIndex: 1 },
  subtitle: { textAlign: 'center', marginBottom: SPACING.xl, lineHeight: 22 },
  sentContainer: { alignItems: 'center' },
  sentIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    justifyContent: 'center', alignItems: 'center',
  },
  resendBtn: {
    marginTop: SPACING.lg, paddingVertical: SPACING.sm, paddingHorizontal: SPACING.base,
    borderRadius: RADIUS.full, backgroundColor: DRIVER_COLORS.surface,
    borderWidth: 1, borderColor: DRIVER_COLORS.surfaceBorder,
  },
  resendBtnDisabled: { opacity: 0.5 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: 'rgba(22, 163, 74, 0.12)',
    justifyContent: 'center', alignItems: 'center',
    alignSelf: 'center', marginBottom: SPACING.lg,
  },
  backToLogin: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.md,
  },
});
