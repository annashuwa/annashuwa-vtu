import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { useAuth } from '../../auth/AuthContext';
import { useApiFocus } from '../../api/hooks';
import { Card, EmptyState, ErrorState, Loading, Logo, SectionHeader, Screen, StatusBadge } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtMoney, fmtDateTime, serviceLabels } from '../../format';
import type { TxnPage, WalletView } from '../../types';
import type { RootStackParamList, UserTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'HomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const quickActions: {
  key: 'BuyAirtime' | 'BuyData' | 'BuyElectricity' | 'BuyCable' | 'BuyExamPins' | 'FundWallet';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
}[] = [
  { key: 'BuyAirtime', label: 'Airtime', icon: 'call', color: '#2563EB' },
  { key: 'BuyData', label: 'Data', icon: 'wifi', color: '#16A34A' },
  { key: 'BuyElectricity', label: 'Electricity', icon: 'flash', color: '#D97706' },
  { key: 'BuyCable', label: 'Cable TV', icon: 'tv', color: '#7C3AED' },
  { key: 'BuyExamPins', label: 'Exam PIN', icon: 'school', color: '#DB2777' },
  { key: 'FundWallet', label: 'Fund wallet', icon: 'add-circle', color: palette.primary },
];

export function DashboardScreen({ navigation }: Props) {
  const { user } = useAuth();
  const wallet = useApiFocus<WalletView>('/api/wallet');
  const recent = useApiFocus<TxnPage>('/api/transactions?pageSize=5');

  const firstName = (user?.fullName ?? '').split(' ')[0];

  const go = (key: (typeof quickActions)[number]['key']) => navigation.navigate(key);

  return (
    <Screen>
      {/* Header */}
      <View style={styles.headerRow}>
        <View style={styles.headerLeft}>
          <Text style={styles.hello}>Hello,</Text>
          <Text style={styles.name} numberOfLines={1}>
            {firstName || 'there'} 👋
          </Text>
        </View>
        <Pressable style={styles.bell} onPress={() => navigation.navigate('Notifications')} hitSlop={8}>
          <Ionicons name="notifications-outline" size={22} color={palette.text} />
        </Pressable>
      </View>

      {/* Wallet card */}
      <LinearGradient
        colors={['#133425', '#1B4A32', '#21603F']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.walletCard}
      >
        <View style={styles.walletTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Logo size={26} />
            <Text style={styles.walletLabel}>Wallet balance</Text>
          </View>
          <Pressable
            style={styles.fundBtn}
            onPress={() => navigation.navigate('FundWallet')}
            hitSlop={8}
          >
            <Ionicons name="add" size={16} color={palette.darkGreen} />
            <Text style={styles.fundBtnText}>Fund</Text>
          </Pressable>
        </View>
        <Text style={styles.balance}>{wallet.data ? fmtMoney(wallet.data.wallet.balance) : '—'}</Text>
        <Text style={styles.walletMeta}>NGN · updated {wallet.data ? fmtDateTime(wallet.data.wallet.updatedAt).split(' · ')[0] : ''}</Text>
      </LinearGradient>

      {/* Quick actions */}
      <View style={styles.quickGrid}>
        {quickActions.map((a) => (
          <Pressable key={a.key} style={({ pressed }) => [styles.quickItem, pressed && { opacity: 0.7 }]} onPress={() => go(a.key)}>
            <View style={[styles.quickIcon, { backgroundColor: `${a.color}18` }]}>
              <Ionicons name={a.icon} size={22} color={a.color} />
            </View>
            <Text style={styles.quickLabel}>{a.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Recent transactions */}
      <SectionHeader title="Recent activity" actionLabel="See all" onAction={() => navigation.navigate('Main', { screen: 'ActivityTab' })} />
      {recent.loading ? <Loading label="Loading transactions…" /> : null}
      {recent.error ? <ErrorState message={recent.error} onRetry={recent.refetch} /> : null}
      {recent.data && recent.data.items.length === 0 ? (
        <Card>
          <EmptyState icon="receipt-outline" title="No transactions yet" subtitle="Your purchases will appear here." />
        </Card>
      ) : null}
      {recent.data && recent.data.items.length > 0 ? (
        <Card style={styles.listCard}>
          {recent.data.items.map((t, i) => {
            const isLast = i === recent.data!.items.length - 1;
            return (
              <Pressable
                key={t.id}
                style={[styles.txnRow, !isLast && styles.txnRowBorder]}
                onPress={() => navigation.navigate('TransactionDetail', { id: t.id })}
              >
                <View style={styles.txnLeft}>
                  <Text style={styles.txnTitle}>{serviceLabels[t.serviceType] ?? t.serviceType}</Text>
                  <Text style={styles.txnSub}>
                    {fmtDateTime(t.createdAt)}
                  </Text>
                </View>
                <View style={styles.txnRight}>
                  <Text style={[styles.txnAmount, t.serviceType === 'WALLET_FUNDING' ? styles.pos : null]}>
                    {t.serviceType === 'WALLET_FUNDING' ? '+' : '-'}
                    {fmtMoney(t.amount + Number(t.fee), { currency: false })}
                  </Text>
                  <StatusBadge status={t.status} />
                </View>
              </Pressable>
            );
          })}
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, marginBottom: spacing.lg },
  headerLeft: { flex: 1 },
  hello: { fontSize: 13, color: palette.textMuted },
  name: { fontSize: 22, fontWeight: '800', color: palette.text },
  bell: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: palette.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: palette.border,
  },
  walletCard: { borderRadius: radius.xl, padding: spacing.xl, marginBottom: spacing.lg },
  walletTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  walletLabel: { color: '#D6F0E2', fontSize: 13, fontWeight: '600', marginLeft: 8 },
  fundBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.gold,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  fundBtnText: { color: palette.darkGreen, fontWeight: '800', fontSize: 12, marginLeft: 2 },
  balance: { color: '#FFFFFF', fontSize: 34, fontWeight: '900', marginTop: spacing.md, letterSpacing: 0.5 },
  walletMeta: { color: '#9CCFB4', fontSize: 11, marginTop: 4 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md, marginHorizontal: -6 },
  quickItem: { width: '33.333%', alignItems: 'center', paddingVertical: spacing.md },
  quickIcon: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  quickLabel: { marginTop: 6, fontSize: 12, fontWeight: '600', color: palette.text },
  listCard: { paddingVertical: 4 },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12 },
  txnRowBorder: { borderBottomWidth: 1, borderBottomColor: palette.border },
  txnLeft: { flex: 1 },
  txnTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
  txnSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  txnRight: { alignItems: 'flex-end' },
  txnAmount: { fontSize: 14, fontWeight: '800', color: palette.text, marginBottom: 4 },
  pos: { color: palette.success },
});