import React, { useCallback, useEffect, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Chip, EmptyState, ErrorState, Field, Header, Loading, Screen, Tag } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtDateTime, fmtMoney } from '../../format';
import { get } from '../../api/client';
import type { AdminUserRow } from '../../types';
import type { AdminTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AdminUsersTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

export function AdminUsersScreen(_props: Props) {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (p: number, replace: boolean, q?: string, r?: string) => {
    setError(null);
    if (replace) setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: '25' });
      if (q) params.set('search', q);
      if (r && r !== 'ALL') params.set('role', r);
      const res = await get<{ users: AdminUserRow[]; total: number; totalPages: number }>(`/api/admin/users?${params.toString()}`);
      setUsers((prev) => (replace ? res.users : [...prev, ...res.users]));
      setTotal(res.total);
      setTotalPages(res.totalPages);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setPage(1);
    const id = setTimeout(() => load(1, true, search, role), 300);
    return () => clearTimeout(id);
  }, [search, role, load]);

  const loadMore = () => {
    if (page < totalPages) {
      const p = page + 1;
      setPage(p);
      load(p, false, search, role);
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.headerWrap}>
        <Header title="Users" subtitle={total ? `${total} registered` : undefined} />
      </View>
      <View style={styles.searchWrap}>
        <Field value={search} onChangeText={setSearch} placeholder="Search name, email or phone" keyboardType="default" right={<Ionicons name="search" size={18} color={palette.textMuted} />} />
        <View style={styles.filterRow}>
          {(['ALL', 'USER', 'ADMIN'] as const).map((r) => (
            <Chip key={r} label={r === 'ALL' ? 'All roles' : r} selected={role === r} onPress={() => setRole(r)} />
          ))}
        </View>
      </View>

      {loading ? <Loading label="Loading users…" /> : null}
      {error ? <ErrorState message={error} onRetry={() => load(1, true, search, role)} /> : null}
      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={!loading && !error ? <EmptyState icon="people-outline" title="No users found" /> : null}
        ListFooterComponent={
          page < totalPages && users.length > 0 ? (
            <Button label="Load more" variant="outline" onPress={loadMore} block style={{ marginTop: spacing.sm }} />
          ) : null
        }
        renderItem={({ item, index }) => (
          <View style={[styles.row, index === users.length - 1 && styles.rowLast]}>
            <View style={styles.avatar}>
              <Ionicons name="person" size={20} color={palette.primary} />
            </View>
            <View style={styles.body}>
              <Text style={styles.name}>{item.fullName}</Text>
              <Text style={styles.email}>{item.email}</Text>
              <Text style={styles.sub}>{item.phone}</Text>
            </View>
            <View style={styles.right}>
              <View style={styles.tags}>
                <Tag label={item.role} color={item.role === 'ADMIN' ? palette.gold : palette.info} />
                <Tag label={item.status} color={item.status === 'ACTIVE' ? palette.success : palette.danger} />
              </View>
              <Text style={styles.balance}>{fmtMoney(item.walletBalance)}</Text>
              <Text style={styles.sub}>joined {fmtDateTime(item.createdAt)}</Text>
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
  filterRow: { flexDirection: 'row', marginBottom: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: {
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    flexDirection: 'row',
  },
  rowLast: {},
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#E7F6EE',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  body: { flex: 1, marginRight: spacing.sm },
  name: { fontSize: 14, fontWeight: '800', color: palette.text },
  email: { fontSize: 12, color: palette.textMuted, marginTop: 1 },
  sub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  right: { alignItems: 'flex-end' },
  tags: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  balance: { fontSize: 13, fontWeight: '800', color: palette.text, marginTop: 2 },
});