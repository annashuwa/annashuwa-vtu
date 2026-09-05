import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field, Header, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { post } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'ChangePassword'>;

export function ChangePasswordScreen({ navigation }: Props) {
  const { logout } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!currentPassword) {
      setError('Enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await post<{ message: string }>('/api/user/password', {
        currentPassword,
        newPassword,
        confirmPassword,
      });
      Alert.alert('Password changed', 'You’ll be signed out. Sign in again with your new password.', [
        { text: 'OK', onPress: () => logout() },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not change password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Change password" onBack={() => navigation.goBack()} />
      <Card style={styles.card}>
        <Field label="Current password" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" secureTextEntry autoComplete="password" />
        <Field label="New password" value={newPassword} onChangeText={setNewPassword} placeholder="Minimum 8 characters" secureTextEntry autoComplete="new-password" />
        <Field label="Confirm new password" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Repeat new password" secureTextEntry autoComplete="new-password" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Update password" onPress={submit} loading={loading} block icon="lock-closed" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});