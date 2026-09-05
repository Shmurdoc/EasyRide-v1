import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useTheme } from '@easyryde/shared';
import { COLORS } from '@easyryde/shared';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const theme = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requires2FA, setRequires2FA] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password.trim());
    } catch (error: any) {
      const msg = error?.response?.data?.message || error.message || 'Invalid credentials';
      if (msg.toLowerCase().includes('2fa') || msg.toLowerCase().includes('totp')) {
        setRequires2FA(true);
      } else {
        Alert.alert('Login Failed', msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!totpCode.trim() || totpCode.length < 6) {
      Alert.alert('Error', 'Enter a valid 6-digit code');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password.trim());
    } catch (error: any) {
      Alert.alert('Verification Failed', error?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { backgroundColor: COLORS.bg, paddingTop: insets.top + 40 }]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: COLORS.brand, borderColor: COLORS.brandLight }]}>
              <Text style={styles.logoMark}>ER</Text>
            </View>
            <Text style={[styles.brand, { color: COLORS.text }]}>EasyRyde</Text>
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>ADMIN</Text>
            </View>
            <Text style={[styles.subtitle, { color: COLORS.textMuted }]}>Platform Management Console</Text>
          </View>

          <View style={[styles.formCard, { backgroundColor: COLORS.surface, borderColor: COLORS.border }]}>
            {!requires2FA ? (
              <>
                <Text style={[styles.formTitle, { color: COLORS.text }]}>Sign In</Text>
                <Text style={[styles.formSub, { color: COLORS.textMuted }]}>Access the admin dashboard</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: COLORS.textMuted }]}>Email</Text>
                  <View style={[styles.inputWrap, { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border }]}>
                    <Ionicons name="mail-outline" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      placeholder="admin@easyryde.com"
                      placeholderTextColor={COLORS.textMuted}
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: COLORS.textMuted }]}>Password</Text>
                  <View style={[styles.inputWrap, { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border }]}>
                    <Ionicons name="lock-closed-outline" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={[styles.input, { color: COLORS.text }]}
                      placeholder="Enter password"
                      placeholderTextColor={COLORS.textMuted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                    />
                    <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                      <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textMuted} />
                    </TouchableOpacity>
                  </View>
                </View>

                <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={styles.loginBtnGradient}>
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.loginBtnText}>Sign In</Text>
                        <Ionicons name="arrow-forward" size={18} color="#ffffff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={[styles.formTitle, { color: COLORS.text }]}>Two-Factor Authentication</Text>
                <Text style={[styles.formSub, { color: COLORS.textMuted }]}>Enter the 6-digit code from your authenticator app</Text>

                <View style={styles.inputGroup}>
                  <Text style={[styles.label, { color: COLORS.textMuted }]}>TOTP Code</Text>
                  <View style={[styles.inputWrap, { backgroundColor: COLORS.surfaceLight, borderColor: COLORS.border }]}>
                    <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.textMuted} />
                    <TextInput
                      style={[styles.input, { color: COLORS.text, letterSpacing: 4, fontSize: 20, textAlign: 'center' }]}
                      placeholder="000000"
                      placeholderTextColor={COLORS.textMuted}
                      value={totpCode}
                      onChangeText={setTotpCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <TouchableOpacity style={styles.loginBtn} onPress={handleVerify2FA} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient colors={[COLORS.brandDark, COLORS.brand]} style={styles.loginBtnGradient}>
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <>
                        <Text style={styles.loginBtnText}>Verify</Text>
                        <Ionicons name="checkmark-circle" size={18} color="#ffffff" />
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setRequires2FA(false)} style={styles.backLink}>
                  <Text style={[styles.backLinkText, { color: COLORS.brand }]}>Back to Login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          <Text style={[styles.footer, { color: COLORS.textMuted }]}>EasyRyde Admin v4.0 — Phalaborwa, Limpopo</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  logoMark: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  brand: { fontSize: 28, fontWeight: '800', marginTop: 14 },
  adminBadge: {
    backgroundColor: 'rgba(255,106,0,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 999,
    marginTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,106,0,0.3)',
  },
  adminBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF6A00', letterSpacing: 2 },
  subtitle: { fontSize: 14, fontWeight: '500', marginTop: 4 },
  formCard: { borderRadius: 20, padding: 24, borderWidth: 1 },
  formTitle: { fontSize: 20, fontWeight: '700' },
  formSub: { fontSize: 13, marginTop: 4, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, gap: 10 },
  input: { flex: 1, fontSize: 15 },
  loginBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  loginBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, gap: 8 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { fontSize: 14, fontWeight: '600' },
  footer: { textAlign: 'center', fontSize: 11, marginTop: 32 },
});
