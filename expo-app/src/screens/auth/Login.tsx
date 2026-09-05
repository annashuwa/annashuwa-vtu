import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAuth } from '../../auth/AuthContext';
import { Button, Field, Logo } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { DEMO_CREDENTIALS } from '../../config';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

export function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) {
      setError('Enter your email and password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.brand}>
          <Logo size={68} />
          <Text style={styles.brandName}>ANNASHUWA VTU</Text>
          <Text style={styles.brandTag}>Recharge. Pay. Go.</Text>
        </View>

        <Text style={styles.title}>Welcome back</Text>
        <Text style={styles.subtitle}>Sign in to continue to your account</Text>

        <View style={styles.card}>
          <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="••••••••" secureTextEntry autoComplete="password" />
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label="Sign in" onPress={submit} loading={loading} block icon="log-in-outline" />
          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={styles.forgotWrap}>
            <Text style={styles.forgot}>Forgot password?</Text>
          </Pressable>
        </View>

        <View style={styles.demoWrap}>
          <Text style={styles.demoLabel}>Demo accounts</Text>
          <View style={styles.demoRow}>
            <Pressable
              style={styles.demoChip}
              onPress={() => {
                setEmail(DEMO_CREDENTIALS.user.email);
                setPassword(DEMO_CREDENTIALS.user.password);
              }}
            >
              <Text style={styles.demoChipTitle}>User</Text>
              <Text style={styles.demoChipSub}>{DEMO_CREDENTIALS.user.email}</Text>
            </Pressable>
            <Pressable
              style={styles.demoChip}
              onPress={() => {
                setEmail(DEMO_CREDENTIALS.admin.email);
                setPassword(DEMO_CREDENTIALS.admin.password);
              }}
            >
              <Text style={styles.demoChipTitle}>Admin</Text>
              <Text style={styles.demoChipSub}>{DEMO_CREDENTIALS.admin.email}</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don’t have an account? </Text>
          <Pressable onPress={() => navigation.navigate('Register')}>
            <Text style={styles.footerLink}>Create one</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: palette.background },
  container: { flexGrow: 1, padding: spacing.xl, justifyContent: 'center' },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  brandName: { marginTop: 12, fontSize: 18, fontWeight: '800', color: palette.text, letterSpacing: 1 },
  brandTag: { marginTop: 2, color: palette.textMuted, fontSize: 13 },
  title: { fontSize: 24, fontWeight: '800', color: palette.text },
  subtitle: { color: palette.textMuted, marginTop: 4, marginBottom: spacing.lg },
  card: { backgroundColor: palette.card, borderRadius: radius.lg, padding: spacing.lg },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
  forgotWrap: { alignItems: 'center', marginTop: spacing.md },
  forgot: { color: palette.primary, fontWeight: '700', fontSize: 13 },
  demoWrap: { marginTop: spacing.lg },
  demoLabel: { fontSize: 12, color: palette.textMuted, marginBottom: spacing.sm },
  demoRow: { flexDirection: 'row', gap: spacing.sm },
  demoChip: { flex: 1, backgroundColor: palette.card, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: palette.border },
  demoChipTitle: { fontSize: 13, fontWeight: '700', color: palette.primary },
  demoChipSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: spacing.xl },
  footerText: { color: palette.textMuted },
  footerLink: { color: palette.primary, fontWeight: '700' },
});