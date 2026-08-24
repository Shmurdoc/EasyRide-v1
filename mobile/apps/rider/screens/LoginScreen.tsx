import { useTheme } from '@easyryde/shared';
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, Text, TextInput } from 'react-native';
import { useAuth, COLORS, SPACING } from '@easyryde/shared';
import type { RiderAuthNav } from '@easyryde/shared';
import { LinearGradient } from 'expo-linear-gradient';

type Role = 'rider' | 'driver' | 'admin';

export default function LoginScreen({ navigation }: { navigation: RiderAuthNav }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { login } = useAuth();
  const [selectedRole, setSelectedRole] = useState<Role>('rider');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const handleContinue = () => {
    setEmail('');
    setPassword('');
    setShowForm(true);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    console.log('LOGIN ATTEMPT:', email);
    try {
      const result = await login(email, password);
      console.log('LOGIN SUCCESS:', JSON.stringify(result));
    } catch (err: any) {
      console.log('LOGIN ERROR:', err.message, err.status, err.stack);
      Alert.alert('Login Failed', err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (showForm) {
    return (
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={styles.inner}>
          <TouchableOpacity onPress={() => setShowForm(false)} style={styles.backBtn}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>

          <Text style={styles.formTitle}>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} Login</Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            testID="email-input"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            testID="password-input"
          />

          <TouchableOpacity style={styles.forgotPassword}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.signInBtn, loading && styles.disabledBtn]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            <LinearGradient colors={['#FF6A00', '#E25500']} style={styles.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.signInText}>{loading ? 'Signing In...' : 'Sign In'}</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.navigate('Register')}>
            <Text style={styles.registerText}>
              Don't have an account? <Text style={styles.registerLink}>Sign Up</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.inner}>
        <Text style={styles.title}>EasyRyde</Text>
        <Text style={styles.tagline}>Premium Mobility</Text>

        <TouchableOpacity
          style={[styles.roleBtn, selectedRole === 'rider' && styles.roleBtnSelected]}
          onPress={() => setSelectedRole('rider')}
        >
          <Text style={styles.roleIcon}>🚗</Text>
          <Text style={[styles.roleText, selectedRole === 'rider' && styles.roleTextSelected]}>Rider</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleBtn, selectedRole === 'driver' && styles.roleBtnSelected]}
          onPress={() => setSelectedRole('driver')}
        >
          <Text style={styles.roleIcon}>🚙</Text>
          <Text style={[styles.roleText, selectedRole === 'driver' && styles.roleTextSelected]}>Driver</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.roleBtn, selectedRole === 'admin' && styles.roleBtnSelected]}
          onPress={() => setSelectedRole('admin')}
        >
          <Text style={styles.roleIcon}>⚙️</Text>
          <Text style={[styles.roleText, selectedRole === 'admin' && styles.roleTextSelected]}>Admin</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.continueBtn} onPress={handleContinue}>
          <LinearGradient colors={['#FF6A00', '#E25500']} style={styles.gradientBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Text style={styles.continueText}>Continue</Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.guestBtn}>
          <Text style={styles.guestText}>Continue as Guest</Text>
        </TouchableOpacity>

        <Text style={styles.version}>EasyRyde v4.0.0 • Phalaborwa, Limpopo</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (colors: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  inner: { flex: 1, justifyContent: 'center', padding: 20, maxWidth: 400, alignSelf: 'center', width: '100%' },
  title: { fontSize: 40, fontWeight: '800', textAlign: 'center', marginBottom: 8, color: '#FF6A00' },
  tagline: { fontSize: 16, color: '#98989d', textAlign: 'center', marginBottom: 40 },
  roleBtn: {
    flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 10,
    backgroundColor: '#1e1e1e', borderWidth: 2, borderColor: '#333',
    borderRadius: 12, minHeight: 56,
  },
  roleBtnSelected: { borderColor: '#FF6A00', backgroundColor: 'rgba(255, 173, 122, 0.1)' },
  roleIcon: { fontSize: 24, marginRight: 12 },
  roleText: { fontSize: 17, fontWeight: '600', color: '#fff' },
  roleTextSelected: { color: '#FF6A00' },
  continueBtn: { marginTop: 20, borderRadius: 8, overflow: 'hidden' },
  gradientBtn: { padding: 16, alignItems: 'center', borderRadius: 8 },
  continueText: { fontSize: 18, fontWeight: '700', color: '#121212' },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#333' },
  dividerText: { marginHorizontal: 16, color: '#666', fontSize: 14 },
  guestBtn: { padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#333', borderRadius: 8 },
  guestText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  version: { textAlign: 'center', color: '#666', fontSize: 13, marginTop: 30 },
  backBtn: { marginBottom: 20 },
  backText: { color: '#FF6A00', fontSize: 16, fontWeight: '600' },
  formTitle: { fontSize: 24, fontWeight: '700', color: '#fff', marginBottom: 24 },
  label: { fontSize: 14, fontWeight: '600', color: '#fff', marginBottom: 8 },
  input: {
    width: '100%', padding: 14, backgroundColor: '#1e1e1e', borderWidth: 2, borderColor: '#333',
    borderRadius: 8, color: '#fff', fontSize: 16, marginBottom: 16, minHeight: 50,
  },
  forgotPassword: { alignSelf: 'flex-end', marginBottom: 20 },
  forgotText: { color: '#FF6A00', fontSize: 14 },
  signInBtn: { borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  disabledBtn: { opacity: 0.6 },
  signInText: { fontSize: 18, fontWeight: '700', color: '#121212' },
  registerText: { textAlign: 'center', color: '#98989d', fontSize: 15 },
  registerLink: { color: '#FF6A00', fontWeight: '600' },
});
