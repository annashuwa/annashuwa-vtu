import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, EmptyState, ErrorState, Header, Loading, ListItem, Screen, StatusBadge, SectionHeader } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtDateTime, fmtMoney } from '../../format';
import { useApiFocus } from '../../api/hooks';
import type { WalletTxn, WalletView } from '../../types';
import type { RootStackParamList, UserTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'WalletTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const typeMeta: Record<string, [string, string]> = {
  DEPOSIT: ['arrow-down-circle', palette.success],
  WALLET_FUNDING: ['arrow-down-circle', palette.success],
  WITHDRAWAL: ['arrow-up-circle', palette.danger],
  AIRTIME_PURCHASE: ['call-outline', '#2563EB'],
  DATA_PURCHASE: ['wifi-outline', '#16A34A'],
  ELECTRICITY_PAYMENT: ['flash-outline', '#D97706'],
  CABLE_SUBSCRIPTION: ['tv-outline', '#7C3AED'],
  EXAM_PIN_PURCHASE: ['key-outline', '#DB2777'],
  REFUND: ['refresh-circle-outline', palette.warning],
  ADJUSTMENT: ['settings-outline', palette.textMuted],
};

export function WalletScreen({ navigation }: Props) {
  const wallet = useApiFocus<WalletView>('/api/wallet');

  return (
    <Screen>
      <Header title="Wallet" />

      <LinearGradient colors={['#133425', '#1B4A32', '#21603F']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text style={styles.balance}>{wallet.data ? fmtMoney(wallet.data.wallet.balance) : '—'}</Text>
        <Pressable style={styles.fundBtn} onPress={() => navigation.navigate('FundWallet')}>
          <Text style={styles.fundBtnText}>Fund wallet</Text>
        </Pressable>
      </LinearGradient>

      <SectionHeader title="Statement" />
      {wallet.loading ? <Loading label="Loading statement…" /> : null}
      {wallet.error ? <ErrorState message={wallet.error} onRetry={wallet.refetch} /> : null}
      {wallet.data && wallet.data.transactions.length === 0 ? (
        <Card>
          <EmptyState icon="wallet-outline" title="No activity yet" subtitle="Movements on your wallet will show here." />
        </Card>
      ) : null}
      {wallet.data && wallet.data.transactions.length > 0 ? (
        <Card style={{ paddingHorizontal: spacing.lg, paddingVertical: 4 }}>
          {wallet.data.transactions.map((t: WalletTxn, i: number) => {
            const [icon, color] = typeMeta[t.type] ?? ['ellipse-outline', palette.textMuted];
            const negative = !['DEPOSIT', 'WALLET_FUNDING', 'REFUND', 'ADJUSTMENT'].includes(t.type);
            return (
              <ListItem
                key={t.id}
                last={i === wallet.data!.transactions.length - 1}
                icon={icon as never}
                iconColor={color}
                title={t.description ?? t.type.replace(/_/g, ' ')}
                subtitle={fmtDateTime(t.createdAt)}
                right={
                  <View style={styles.rightCol}>
                    <Text style={[styles.amount, negative ? styles.neg : styles.pos]}>{negative ? '-' : '+'}{fmtMoney(t.amount, { currency: false })}</Text>
                    <StatusBadge status={t.status} />
                  </View>
                }
              />
            );
          })}
        </Card>
      ) : null}

      <Card style={styles.infoCard}>
        <Text style={styles.infoText}>
          Wallet top-up uses the demo payment gateway in test mode. Choose Fund wallet to simulate a deposit.
        </Text>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceCard: { borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  balanceLabel: { color: '#D6F0E2', fontSize: 13, fontWeight: '600' },
  balance: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: spacing.sm, letterSpacing: 0.5 },
  fundBtn: {
    alignSelf: 'flex-start',
    backgroundColor: palette.gold,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: spacing.md,
  },
  fundBtnText: { color: palette.darkGreen, fontWeight: '800', fontSize: 14 },
  rightCol: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '800', marginBottom: 4 },
  neg: { color: palette.text },
  pos: { color: palette.success },
  infoCard: { marginTop: spacing.lg, backgroundColor: '#FFF8E7' },
  infoText: { color: '#8A6D1D', fontSize: 12, lineHeight: 18 },
});