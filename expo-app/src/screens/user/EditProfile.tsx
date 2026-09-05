import React, { useState } from 'react';
import { Alert, StyleSheet, Text } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Field, Header, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { patch } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { User } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'EditProfile'>;

export function EditProfileScreen({ navigation }: Props) {
  const { user, setUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName ?? '');
  const [phone, setPhone] = useState(user?.phone ?? '');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!fullName || fullName.length < 3) {
      setError('Enter a valid full name.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await patch<{ user: User }>('/api/user/profile', { fullName, phone });
      setUser(res.user);
      Alert.alert('Profile updated', 'Your changes were saved.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Edit profile" onBack={() => navigation.goBack()} />
      <Card style={styles.card}>
        <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Jane Doe" autoCapitalize="words" autoComplete="name" />
        <Field label="Phone" value={phone} onChangeText={setPhone} placeholder="08031234567" keyboardType="phone-pad" autoComplete="tel" maxLength={15} />
        <Field label="Email" value={user?.email ?? ''} onChangeText={() => {}} editable={false} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button label="Save changes" onPress={submit} loading={loading} block icon="checkmark-circle" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});