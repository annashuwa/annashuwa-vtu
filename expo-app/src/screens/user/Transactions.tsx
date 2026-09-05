import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Chip, ErrorState, EmptyState, Header, Loading, Screen, StatusBadge } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtDateTime, fmtMoney, serviceLabels } from '../../format';
import { get } from '../../api/client';
import type { TxnItem, TxnPage } from '../../types';
import type { RootStackParamList, UserTabParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<UserTabParamList, 'ActivityTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

const SERVICE_FILTERS = ['ALL', 'AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EXAM_PIN', 'WALLET_FUNDING'];
const STATUS_FILTERS = ['ALL', 'SUCCESSFUL', 'PENDING', 'PROCESSING', 'FAILED'];

export function TransactionsScreen({ navigation }: Props) {
  const [serviceType, setServiceType] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<TxnItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildPath = useCallback(
    (p: number) => {
      const params = new URLSearchParams({ page: String(p), pageSize: '20' });
      if (serviceType !== 'ALL') params.set('serviceType', serviceType);
      if (status !== 'ALL') params.set('status', status);
      return `/api/transactions?${params.toString()}`;
    },
    [serviceType, status]
  );

  const load = useCallback(
    async (p: number, replace: boolean) => {
      setError(null);
      if (replace) setLoading(true);
      try {
        const res = await get<TxnPage>(buildPath(p));
        setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Could not load transactions.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [buildPath]
  );

  useEffect(() => {
    setPage(1);
    load(1, true);
  }, [buildPath, load]);

  const refresh = () => {
    setRefreshing(true);
    load(1, true);
  };

  const loadMore = () => {
    if (page < totalPages) {
      setPage((p) => p + 1);
      load(page + 1, false);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.headerWrap}>
        <Header title="Transactions" />
      </View>

      <View style={styles.filters}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={SERVICE_FILTERS}
          keyExtractor={(x) => x}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => (
            <Chip key={item} label={item === 'ALL' ? 'All' : serviceLabels[item] ?? item} selected={serviceType === item} onPress={() => setServiceType(item)} />
          )}
        />
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={STATUS_FILTERS}
          keyExtractor={(x) => x}
          contentContainerStyle={styles.filterRow}
          renderItem={({ item }) => <Chip key={item} label={item === 'ALL' ? 'All statuses' : item} selected={status === item} onPress={() => setStatus(item)} />}
        />
      </View>

      {loading ? <Loading label="Loading transactions…" /> : null}
      {error ? <ErrorState message={error} onRetry={refresh} /> : null}

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onRefresh={refresh}
        refreshing={refreshing}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !loading && !error ? (
            <EmptyState icon="receipt-outline" title="No transactions" subtitle="Purchases and wallet movements will appear here." />
          ) : null
        }
        ListFooterComponent={
          page < totalPages && items.length > 0 ? (
            <Button label="Load more" variant="outline" onPress={loadMore} block style={{ marginTop: spacing.md }} />
          ) : null
        }
        renderItem={({ item, index }) => (
          <Pressable
            style={[styles.row, index === items.length - 1 && styles.rowLast]}
            onPress={() => navigation.navigate('TransactionDetail', { id: item.id, item })}
          >
            <View style={styles.rowLeft}>
              <Text style={styles.rowTitle}>{serviceLabels[item.serviceType] ?? item.serviceType}</Text>
              <Text style={styles.rowSub}>{item.provider}</Text>
              <Text style={styles.rowDate}>{fmtDateTime(item.createdAt)}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowAmount, item.serviceType === 'WALLET_FUNDING' ? styles.pos : null]}>
                {item.serviceType === 'WALLET_FUNDING' ? '+' : '-'}
                {fmtMoney(Number(item.amount) + Number(item.fee), { currency: false })}
              </Text>
              <StatusBadge status={item.status} />
            </View>
          </Pressable>
        )}
      />
      {total > 0 ? <Text style={styles.totalText}>{total} transaction(s)</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  filters: { marginBottom: spacing.sm, marginTop: spacing.sm },
  filterRow: { paddingHorizontal: spacing.lg, gap: spacing.sm, paddingRight: spacing.xl },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLast: {},
  rowLeft: { flex: 1 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: palette.text },
  rowSub: { fontSize: 12, color: palette.textMuted, marginTop: 1 },
  rowDate: { fontSize: 11, color: palette.textMuted, marginTop: 3 },
  rowRight: { alignItems: 'flex-end' },
  rowAmount: { fontSize: 14, fontWeight: '800', color: palette.text, marginBottom: 5 },
  pos: { color: palette.success },
  totalText: { textAlign: 'center', color: palette.textMuted, fontSize: 11, paddingBottom: spacing.lg },
});