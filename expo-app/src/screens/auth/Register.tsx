import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { Button, Field } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Register'>;

export function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    const { fullName, email, phone, password, confirmPassword } = form;
    if (!fullName || !email || !phone || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await register({ fullName, email, phone, password, confirmPassword });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Create account</Text>
        <Text style={styles.subtitle}>Start buying airtime, data and more instantly</Text>

        <View style={styles.card}>
          <Field label="Full name" value={form.fullName} onChangeText={set('fullName')} placeholder="Jane Doe" autoCapitalize="words" autoComplete="name" />
          <Field label="Email" value={form.email} onChangeText={set('email')} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" />
          <Field label="Phone" value={form.phone} onChangeText={set('phone')} placeholder="08031234567" keyboardType="phone-pad" autoComplete="tel" maxLength={15} />
          <Field label="Password" value={form.password} onChangeText={set('password')} placeholder="Minimum 8 characters" secureTextEntry autoComplete="new-password" />
          <Field label="Confirm password" value={form.confirmPassword} onChangeText={set('confirmPassword')} placeholder="Repeat password" secureTextEntry autoComplete="new-password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Create account" onPress={submit} loading={loading} block icon="person-add-outline" />
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <Text style={styles.footerLink} onPress={() => navigation.goBack()}>
            Sign in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  subtitle: { color: palette.textMuted, marginTop: 4, marginBottom: spacing.lg },
  card: { backgroundColor: palette.card, borderRadius: radius.lg, padding: spacing.lg },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: palette.textMuted },
  footerLink: { color: palette.primary, fontWeight: '700' },
});