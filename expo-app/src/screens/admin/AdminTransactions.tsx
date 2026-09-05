import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Chip, EmptyState, ErrorState, Field, Header, Loading, Screen, StatusBadge } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtDateTime, fmtMoney, serviceLabels } from '../../format';
import { get } from '../../api/client';
import type { TxnItem } from '../../types';
import type { AdminTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AdminTransactionsTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

type Row = TxnItem & { user?: string; userEmail?: string };

export function AdminTransactionsScreen(_props: Props) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, replace: boolean, q?: string, s?: string) => {
    setError(null);
    if (replace) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '25' });
      if (q) params.set('search', q);
      if (s && s !== 'ALL') params.set('status', s);
      const res = await get<{ items: Row[]; total: number; totalPages: number }>(`/api/admin/transactions?${params.toString()}`);
      setItems((prev) => (replace ? res.items : [...prev, ...res.items]));
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load transactions.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    const id = setTimeout(() => load(1, true, search, status), 300);
    return () => clearTimeout(id);
  }, [search, status, load]);

  const loadMore = () => {
    if (page < totalPages) {
      const p = page + 1;
      setPage(p);
      load(p, false, search, status);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.headerWrap}>
        <Header title="Transactions" subtitle={total ? `${total} total` : undefined} />
      </View>
      <View style={styles.searchWrap}>
        <Field value={search} onChangeText={setSearch} placeholder="Search reference or user" />
        <View style={styles.filterRow}>
          {(['ALL', 'SUCCESSFUL', 'PENDING', 'PROCESSING', 'FAILED'] as const).map((s) => (
            <Chip key={s} label={s === 'ALL' ? 'All statuses' : s} selected={status === s} onPress={() => setStatus(s)} />
          ))}
        </View>
      </View>

      {loading ? <Loading label="Loading transactions…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => load(1, true, search, status)} /> : null}
      <FlatList
        data={items}
        keyExtractor={(t) => t.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && !error ? <EmptyState icon="swap-horizontal-outline" title="No transactions found" /> : null}
        ListFooterComponent={
          page < totalPages && items.length > 0 ? (
            <Button label="Load more" variant="outline" onPress={loadMore} block style={{ marginTop: spacing.sm }} />
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={[styles.row, index === items.length - 1 && styles.rowLast]}>
            <View style={styles.body}>
              <Text style={styles.name}>{serviceLabels[item.serviceType] ?? item.serviceType} · {item.provider}</Text>
              <Text style={styles.ref}>{item.reference}</Text>
              <Text style={styles.sub}>{item.userEmail ?? ''}</Text>
            </View>
            <View style={styles.right}>
              <Text style={styles.amount}>{fmtMoney(Number(item.amount) + Number(item.fee))}</Text>
              <StatusBadge status={item.status} />
              <Text style={styles.sub}>{fmtDateTime(item.createdAt)}</Text>
            </View>
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  filterRow: { flexDirection: 'row' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  rowLast: {},
  body: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: 14, fontWeight: '800', color: palette.text },
  ref: { fontSize: 11, color: palette.textMuted, marginTop: 3, fontFamily: 'monospace' },
  sub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  amount: { fontSize: 14, fontWeight: '800', color: palette.text, marginBottom: 4 },
});