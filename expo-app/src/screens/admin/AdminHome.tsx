import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, ErrorState, Header, Loading, Screen, SectionHeader, StatusBadge } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtDateTime, fmtMoney, serviceLabels } from '../../format';
import { useApiFocus } from '../../api/hooks';
import type { AdminStats } from '../../types';
import type { AdminTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AdminHomeTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function AdminHomeScreen({ navigation }: Props) {
  const stats = useApiFocus<AdminStats>('/api/admin/stats');

  return (
    <Screen>
      <Header title="Admin overview" />
      {stats.loading ? <Loading label="Loading stats…" /> : null}
      {stats.error ? <ErrorState message={stats.error} onRetry={stats.refetch} /> : null}
      {stats.data ? (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.cards}>
            <StatCard label="Users" value={String(stats.data.totalUsers)} sub={`${stats.data.activeUsers} active · ${stats.data.suspendedUsers} suspended`} color={palette.primary} />
            <StatCard label="Transactions" value={String(stats.data.totalTransactions)} sub={`${stats.data.successfulTransactions} successful`} color={palette.info} />
            <StatCard label="Revenue" value={fmtMoney(stats.data.totalRevenue)} sub={`${stats.data.failedTransactions} failed`} color={palette.gold} />
          </View>

          {stats.data.volumeByService.length > 0 ? (
            <>
              <SectionHeader title="Volume by service" />
              <Card>
                {stats.data.volumeByService.map((s, i) => (
                  <View key={s.serviceType} style={[styles.barRow, i > 0 && styles.barBorder]}>
                    <Text style={styles.barLabel}>{serviceLabels[s.serviceType] ?? s.serviceType}</Text>
                    <Text style={styles.barVal}>
                      {fmtMoney(s.total)} · {s.count}
                    </Text>
                  </View>
                ))}
              </Card>
            </>
          ) : null}

          <SectionHeader title="Recent transactions" actionLabel="View all" onAction={() => navigation.navigate('Main', { screen: 'AdminTransactionsTab' })} />
          <Card style={{ paddingVertical: 4 }}>
            {stats.data.recentTransactions.map((t, i) => (
              <View key={t.id} style={[styles.txnRow, i > 0 && styles.barBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{serviceLabels[t.serviceType] ?? t.serviceType} · {t.user}</Text>
                  <Text style={styles.txnSub}>{fmtDateTime(t.createdAt)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.txnAmt}>{fmtMoney(t.amount)}</Text>
                  <StatusBadge status={t.status} />
                </View>
              </View>
            ))}
          </Card>

          <SectionHeader title="Recent sign-ups" />
          <Card style={{ paddingVertical: 4 }}>
            {stats.data.recentUsers.map((u, i) => (
              <View key={u.id} style={[styles.txnRow, i > 0 && styles.barBorder]}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.txnTitle}>{u.fullName}</Text>
                  <Text style={styles.txnSub}>{u.email}</Text>
                </View>
                <Text style={styles.txnSub}>{fmtDateTime(u.createdAt)}</Text>
              </View>
            ))}
          </Card>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Card style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  cards: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  statCard: { flex: 1, padding: spacing.md },
  statValue: { fontSize: 18, fontWeight: '900' },
  statLabel: { fontSize: 12, fontWeight: '700', color: palette.text, marginTop: 2 },
  statSub: { fontSize: 10, color: palette.textMuted, marginTop: 2 },
  barRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  barBorder: { borderTopWidth: 1, borderTopColor: palette.border },
  barLabel: { fontSize: 13, fontWeight: '600', color: palette.text },
  barVal: { fontSize: 13, fontWeight: '800', color: palette.text },
  txnRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  txnTitle: { fontSize: 13, fontWeight: '700', color: palette.text },
  txnSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  txnAmt: { fontSize: 13, fontWeight: '800', color: palette.text, marginBottom: 3 },
});