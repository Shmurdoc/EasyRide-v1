import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, Alert, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '@easyryde/shared';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('driver@easyryde.com');
  const [password, setPassword] = useState('password');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <Text style={styles.logoIcon}>🚗</Text>
          </View>
        </View>

        <Text style={styles.title}>EasyRyde Driver</Text>
        <Text style={styles.tagline}>Start Earning Today</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="driver@easyryde.com"
          placeholderTextColor="#666"
          testID="email-input"
        />

        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Enter your password"
          placeholderTextColor="#666"
          testID="password-input"
        />

        <TouchableOpacity style={styles.forgotPassword}>
          <Text style={styles.forgotText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.signInBtn, loading && styles.disabledBtn]}
          onPress={handleLogin}
          disabled={loading}
          activeOpacity={0.8}
          testID="login-button"
        >
          <LinearGradient colors={['#16a34a', '#22c55e']} style={styles.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.signInText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity>
          <Text style={styles.registerText}>
            Don't have an account? <Text style={styles.registerLink}>Apply as Driver</Text>
          </Text>
        </TouchableOpacity>

        <Text style={styles.version}>EasyRyde Driver v4.0.0 • Phalaborwa, Limpopo</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1c1c1e' },
  inner: { flex: 1, justifyContent: 'center', padding: 20, maxWidth: 400, alignSelf: 'center', width: '100%' },
  logoContainer: { alignItems: 'center', marginBottom: 24 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  logoIcon: { fontSize: 36 },
  title: { fontSize: 32, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: '#16a34a' },
  tagline: { fontSize: 16, color: '#98989d', textAlign: 'center', marginBottom: 40 },
  label: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: {
    width: '100%', padding: 14, backgroundColor: '#242426', borderWidth: 1, borderColor: '#3a3a3c',
    borderRadius: 12, color: '#fff', fontSize: 16, marginBottom: 16, minHeight: 50,
  },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#16a34a', fontSize: 14 },
  signInBtn: { borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
  disabledBtn: { opacity: 0.6 },
  gradientBtn: { padding: 16, alignItems: 'center', borderRadius: 12 },
  signInText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  registerText: { textAlign: 'center', color: '#98989d', fontSize: 15 },
  registerLink: { color: '#16a34a', fontWeight: '600' },
  version: { textAlign: 'center', color: '#666', fontSize: 13, marginTop: 30 },
});
