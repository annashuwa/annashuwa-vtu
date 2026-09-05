import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { post } from '../../api/client';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ForgotPassword'>;

interface ForgotResponse {
  message: string;
  devResetLink?: string;
}

export function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email) {
      setError('Enter your email address.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<ForgotResponse>('/api/auth/forgot-password', { email }, false);
      const devToken = res.devResetLink ? res.devResetLink.split('token=')[1] : undefined;
      Alert.alert('Check your email', res.message, [
        {
          text: 'OK',
          onPress: () => {
            if (devToken) {
              navigation.replace('ResetPassword', { devToken });
            }
          },
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Reset password</Text>
      <Text style={styles.subtitle}>Enter the email linked to your account and we’ll send you a reset link.</Text>
      <View style={styles.card}>
        <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address" autoComplete="email" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Send reset link" onPress={submit} loading={loading} block icon="mail-outline" />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: 24, fontWeight: '800', color: palette.text, marginTop: spacing.lg },
  subtitle: { color: palette.textMuted, marginTop: 4, marginBottom: spacing.lg },
  card: { backgroundColor: palette.card, borderRadius: 16, padding: spacing.lg },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});