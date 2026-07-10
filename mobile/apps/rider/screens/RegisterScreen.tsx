import React, { useState } from 'react';
import {
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
  Alert, ScrollView, View, StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, COLORS, GRADIENTS, SPACING, RADIUS } from '@easyryde/shared';
import { Typography, Input, Button, GradientText } from '@easyryde/shared';
import type { RiderAuthNav } from '@easyryde/shared';

export default function RegisterScreen({ navigation }: { navigation: RiderAuthNav }) {
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const e: Record<string, string> = {};

    if (!name.trim()) e.name = 'Full name is required';
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address';

    if (!phone.trim()) e.phone = 'Phone number is required';
    else if (phone.replace(/\D/g, '').length < 10) e.phone = 'Enter a valid phone number (min 10 digits)';

    if (!password) e.password = 'Password is required';
    else if (password.length < 8) e.password = 'Password must be at least 8 characters';
    else if (!/(?=.*[A-Z])/.test(password)) e.password = 'Password must contain an uppercase letter';
    else if (!/(?=.*[0-9])/.test(password)) e.password = 'Password must contain a number';

    if (!confirmPassword) e.confirmPassword = 'Please confirm your password';
    else if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';

    if (!agreedToTerms) e.terms = 'You must agree to the terms';

    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const handleRegister = async () => {
    if (!validate()) return;
    setLoading(true);
    try {
      await register({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phone.replace(/\D/g, ''),
        password,
        password_confirmation: confirmPassword,
      });
    } catch (err: any) {
      Alert.alert('Registration Failed', err.message || 'Please try again');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <ScrollView contentContainerStyle={styles.inner} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>

        <GradientText colors={GRADIENTS.primary} style={{ fontSize: 26, fontWeight: '700', textAlign: 'center' }}>
          Create Account
        </GradientText>
        <Typography variant="body" color={COLORS.textMuted} style={{ textAlign: 'center', marginBottom: SPACING.xl }}>
          Join EasyRyde and start riding today
        </Typography>

        {/* Name */}
        <View style={styles.fieldWrap}>
          <Input
            label="Full Name"
            value={name}
            onChangeText={(v: string) => { setName(v); setErrors(p => ({ ...p, name: '' })); }}
            style={[styles.input, errors.name && styles.inputError]}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
        </View>

        {/* Email */}
        <View style={styles.fieldWrap}>
          <Input
            label="Email"
            value={email}
            onChangeText={(v: string) => { setEmail(v); setErrors(p => ({ ...p, email: '' })); }}
            keyboardType="email-address"
            autoCapitalize="none"
            style={[styles.input, errors.email && styles.inputError]}
          />
          {errors.email ? <Text style={styles.errorText}>{errors.email}</Text> : null}
        </View>

        {/* Phone */}
        <View style={styles.fieldWrap}>
          <Input
            label="Phone Number"
            value={phone}
            onChangeText={(v: string) => { setPhone(v); setErrors(p => ({ ...p, phone: '' })); }}
            keyboardType="phone-pad"
            placeholder="+27..."
            style={[styles.input, errors.phone && styles.inputError]}
          />
          {errors.phone ? <Text style={styles.errorText}>{errors.phone}</Text> : null}
        </View>

        {/* Password */}
        <View style={styles.fieldWrap}>
          <Input
            label="Password"
            value={password}
            onChangeText={(v: string) => { setPassword(v); setErrors(p => ({ ...p, password: '' })); }}
            secureTextEntry
            style={[styles.input, errors.password && styles.inputError]}
          />
          {errors.password ? <Text style={styles.errorText}>{errors.password}</Text> : null}
        </View>

        {/* Confirm Password */}
        <View style={styles.fieldWrap}>
          <Input
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={(v: string) => { setConfirmPassword(v); setErrors(p => ({ ...p, confirmPassword: '' })); }}
            secureTextEntry
            style={[styles.input, errors.confirmPassword && styles.inputError]}
          />
          {errors.confirmPassword ? <Text style={styles.errorText}>{errors.confirmPassword}</Text> : null}
        </View>

        {/* Terms */}
        <TouchableOpacity
          style={styles.termsRow}
          onPress={() => { setAgreedToTerms(!agreedToTerms); setErrors(p => ({ ...p, terms: '' })); }}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreedToTerms && styles.checkboxActive]}>
            {agreedToTerms && <Ionicons name="checkmark" size={14} color={COLORS.bg} />}
          </View>
          <Typography variant="small" color={COLORS.textMuted} style={{ flex: 1 }}>
            I agree to the{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Privacy Policy</Text>
          </Typography>
        </TouchableOpacity>
        {errors.terms ? <Text style={[styles.errorText, { marginLeft: SPACING.xl }]}>{errors.terms}</Text> : null}

        {/* Register Button */}
        <Button
          title={loading ? 'Creating Account...' : 'Create Account'}
          onPress={handleRegister}
          disabled={loading}
          size="lg"
          style={styles.registerBtn}
        />

        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.loginLink}>
          <Typography variant="body" color={COLORS.textMuted}>
            Already have an account?{' '}
            <Text style={{ color: COLORS.primary, fontWeight: '600' }}>Sign In</Text>
          </Typography>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Text({ style, children }: { style?: any; children: React.ReactNode }) {
  return <Typography variant="small" color={COLORS.error} style={style}>{children}</Typography>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inner: { padding: SPACING.lg, paddingTop: 60 },
  backBtn: { marginBottom: SPACING.lg },
  fieldWrap: { marginBottom: SPACING.md },
  input: { marginBottom: 0 },
  inputError: { borderColor: COLORS.error },
  errorText: { color: COLORS.error, fontSize: 12, marginTop: 4, marginLeft: 4 },
  termsRow: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.sm,
    marginTop: SPACING.sm, marginBottom: SPACING.lg,
  },
  checkbox: {
    width: 20, height: 20, borderRadius: RADIUS.xs,
    borderWidth: 1.5, borderColor: COLORS.surfaceBorder,
    justifyContent: 'center', alignItems: 'center',
    marginTop: 1,
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  registerBtn: { marginBottom: SPACING.base },
  loginLink: { alignItems: 'center', paddingVertical: SPACING.md },
});
