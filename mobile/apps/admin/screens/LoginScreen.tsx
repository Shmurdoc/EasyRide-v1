import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Alert,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth, useBusinessTheme } from '@easyryde/shared';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const { login } = useAuth();
  const { activeTheme } = useBusinessTheme();
  const { colors: biz } = activeTheme;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim().toLowerCase(), password.trim());
    } catch (error: any) {
      Alert.alert('Login Failed', error?.response?.data?.message || error.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.container, { paddingTop: insets.top + 40 }]}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.logoSection}>
            <View style={[styles.logoCircle, { backgroundColor: biz.primary, borderColor: biz.primaryLight }]}>
              <LinearGradient colors={biz.gradient} style={StyleSheet.absoluteFill} />
              <Text style={styles.logoMark}>{activeTheme.logo.mark}</Text>
            </View>
            <Text style={styles.brand}>{activeTheme.logo.text}</Text>
            <Text style={styles.subtitle}>{activeTheme.branding.tagline}</Text>
          </View>

          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Sign In</Text>
            <Text style={styles.formSub}>Access the admin dashboard</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={biz.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@easyryde.com"
                  placeholderTextColor={biz.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={biz.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter password"
                  placeholderTextColor={biz.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={biz.textMuted} />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity style={styles.loginBtn} onPress={handleLogin} disabled={loading} activeOpacity={0.8}>
              <LinearGradient colors={[biz.primaryDark, biz.primary]} style={styles.loginBtnGradient}>
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
          </View>

          <Text style={styles.footer}>EasyRyde Admin v4.0 — Phalaborwa, Limpopo</Text>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050E1A' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingBottom: 40 },
  logoSection: { alignItems: 'center', marginBottom: 40 },
  logoCircle: { width: 72, height: 72, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  logoMark: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
  brand: { fontSize: 28, fontWeight: '800', color: '#ffffff', marginTop: 14 },
  subtitle: { fontSize: 14, fontWeight: '500', color: 'rgba(255,255,255,0.5)', marginTop: 4 },
  formCard: { backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 20, padding: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' },
  formTitle: { fontSize: 20, fontWeight: '700', color: '#ffffff' },
  formSub: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 4, marginBottom: 24 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: 'rgba(255,255,255,0.6)', marginBottom: 8 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 12, paddingHorizontal: 14, height: 48, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 10 },
  input: { flex: 1, fontSize: 15, color: '#ffffff' },
  loginBtn: { marginTop: 8, borderRadius: 14, overflow: 'hidden' },
  loginBtnGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 50, gap: 8 },
  loginBtnText: { fontSize: 16, fontWeight: '700', color: '#ffffff' },
  footer: { textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.25)', marginTop: 32 },
});
