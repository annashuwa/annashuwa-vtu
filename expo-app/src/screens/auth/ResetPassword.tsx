import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Field, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { post } from '../../api/client';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ResetPassword'>;

export function ResetPasswordScreen({ navigation, route }: Props) {
  const devToken = route.params?.devToken ?? '';
  const [token, setToken] = useState(devToken);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!token || token.length < 10) {
      setError('Enter the reset token from your email.');
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
      await post<{ message: string }>(
        '/api/auth/reset-password',
        { token, password, confirmPassword },
        false
      );
      setError(null);
      navigation.popToTop();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Text style={styles.title}>Set new password</Text>
      <Text style={styles.subtitle}>Enter the reset token and choose a new password.</Text>
      <View style={styles.card}>
        <Field label="Reset token" value={token} onChangeText={setToken} placeholder="Paste token here" />
        <Field label="New password" value={password} onChangeText={setPassword} placeholder="Minimum 8 characters" secureTextEntry autoComplete="new-password" />
        <Field label="Confirm password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat password" secureTextEntry autoComplete="new-password" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Reset password" onPress={submit} loading={loading} block icon="key-outline" />
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