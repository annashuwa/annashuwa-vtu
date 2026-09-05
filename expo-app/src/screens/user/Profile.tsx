import React from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, ListItem, Screen, Logo } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtDate } from '../../format';
import { useAuth } from '../../auth/AuthContext';
import type { RootStackParamList, UserTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'MoreTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function ProfileScreen({ navigation }: Props) {
  const { user, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: () => logout() },
    ]);
  };

  return (
    <Screen>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Logo size={52} />
        </View>
        <Text style={styles.name}>{user?.fullName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.metaRow}>
          <View style={styles.metaChip}>
            <Text style={styles.metaText}>{user?.role}</Text>
          </View>
          <View style={styles.metaChip2}>
            <Text style={styles.metaText2}>{user?.status}</Text>
          </View>
        </View>
        <Text style={styles.since}>Member since {user ? fmtDate(user.createdAt) : ''}</Text>
      </View>

      <Card style={styles.menu}>
        <ListItem icon="person-outline" title="Edit profile" subtitle="Update your name and phone number" onPress={() => navigation.navigate('EditProfile')} />
        <ListItem icon="lock-closed-outline" title="Change password" subtitle="Keep your account secure" onPress={() => navigation.navigate('ChangePassword')} />
        <ListItem icon="notifications-outline" title="Notifications" subtitle="Transaction alerts" onPress={() => navigation.navigate('Notifications')} />
        <ListItem icon="receipt-outline" title="Transactions" subtitle="Full history & receipts" onPress={() => navigation.navigate('Main', { screen: 'ActivityTab' })} />
        <ListItem icon="wallet-outline" title="Wallet" subtitle="Balance & statement" last onPress={() => navigation.navigate('Main', { screen: 'WalletTab' })} />
      </Card>

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          This demo app talks to your ANNASHUWA VTU server. Purchases use the mock provider in test mode and no real money moves.
        </Text>
      </Card>

      <Button label="Sign out" variant="outline" icon="log-out-outline" onPress={confirmLogout} block style={{ marginTop: spacing.md, borderColor: '#F3CDCD' }} textStyle={{ color: palette.danger }} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { backgroundColor: palette.darkGreen, borderRadius: 22, padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg },
  avatar: { marginBottom: spacing.md },
  name: { color: '#FFFFFF', fontSize: 20, fontWeight: '800' },
  email: { color: '#9CCFB4', fontSize: 13, marginTop: 2 },
  metaRow: { flexDirection: 'row', marginTop: spacing.md, gap: spacing.sm },
  metaChip: { backgroundColor: 'rgba(245,181,70,0.2)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  metaText: { color: palette.gold, fontSize: 11, fontWeight: '800' },
  metaChip2: { backgroundColor: 'rgba(54,240,125,0.15)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 4 },
  metaText2: { color: palette.primaryBright, fontSize: 11, fontWeight: '800' },
  since: { color: '#6FA08A', fontSize: 11, marginTop: spacing.md },
  menu: { paddingHorizontal: spacing.lg, paddingVertical: 4 },
  infoCard: { marginTop: spacing.lg, backgroundColor: '#EFF7F2' },
  infoText: { color: '#4C7A63', fontSize: 12, lineHeight: 18 },
});