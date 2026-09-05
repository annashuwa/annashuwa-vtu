import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, ErrorState, Header, Loading, Screen, SectionHeader, StatusBadge } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtDateTime, fmtMoney, serviceLabels } from '../../format';
import { useApi } from '../../api/hooks';
import type { TxnPage } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'TransactionDetail'>;

export function TransactionDetailScreen({ navigation, route }: Props) {
  const { item } = route.params;
  const fetched = useApi<TxnPage>(item ? null : `/api/transactions?pageSize=50`);
  const txn = item ?? fetched.data?.items.find((x) => x.id === route.params.id);

  if (!route.params.item && fetched.loading) {
    return (
      <Screen>
        <Header title="Transaction" onBack={() => navigation.goBack()} />
        <Loading />
      </Screen>
    );
  }
  if (!txn) {
    return (
      <Screen>
        <Header title="Transaction" onBack={() => navigation.goBack()} />
        <ErrorState message="Could not find this transaction." onRetry={fetched.refetch} />
      </Screen>
    );
  }

  const statusColor = txn.status === 'SUCCESSFUL' ? palette.success : txn.status === 'FAILED' ? palette.danger : txn.status === 'PROCESSING' ? palette.info : palette.warning;
  let metadata: Record<string, unknown> | null = null;
  try {
    metadata = txn.metadata ? JSON.parse(txn.metadata) : null;
  } catch {
    metadata = null;
  }

  return (
    <Screen>
      <Header title="Transaction details" onBack={() => navigation.goBack()} />

      <View style={styles.statusHero}>
        <Ionicons
          name={txn.status === 'SUCCESSFUL' ? 'checkmark-circle' : txn.status === 'FAILED' ? 'close-circle' : 'time'}
          size={56}
          color={statusColor}
        />
        <Text style={styles.reference} selectable>
          {txn.reference}
        </Text>
        <StatusBadge status={txn.status} />
      </View>

      <Card style={styles.card}>
        <Row label="Service" value={serviceLabels[txn.serviceType] ?? txn.serviceType} />
        <Row label="Provider" value={txn.provider} />
        {txn.customerInfo ? <Row label="Beneficiary" value={txn.customerInfo} /> : null}
        <Row label="Amount" value={fmtMoney(txn.amount)} />
        {Number(txn.fee) > 0 ? <Row label="Fee" value={fmtMoney(txn.fee)} /> : null}
        <Row
          label="Total"
          value={fmtMoney(Number(txn.amount) + Number(txn.fee))}
          strong
        />
        {txn.paymentMethod ? <Row label="Paid via" value={txn.paymentMethod} /> : null}
        <Row label="Channel" value={txn.channel ?? '—'} />
        <Row label="Date" value={fmtDateTime(txn.createdAt)} />
        {txn.description ? <Row label="Note" value={txn.description} /> : null}
      </Card>

      {metadata && Object.keys(metadata).length > 0 ? (
        <>
          <SectionHeader title="Details" />
          <Card style={styles.card}>
            {Object.entries(metadata).map(([k, v]) =>
              typeof v === 'string' || typeof v === 'number' ? (
                <Row key={k} label={k.charAt(0).toUpperCase() + k.slice(1)} value={String(v)} />
              ) : null
            )}
          </Card>
        </>
      ) : null}

      {txn.apiResponse && txn.status !== 'SUCCESSFUL' ? (
        <>
          <SectionHeader title="Provider response" />
          <Card style={styles.card}>
            <Text style={styles.raw} selectable>
              {txn.apiResponse}
            </Text>
          </Card>
        </>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, strong && styles.rowValueStrong]} selectable>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  statusHero: { alignItems: 'center', paddingVertical: spacing.xl },
  reference: { fontSize: 14, fontWeight: '700', color: palette.text, marginVertical: spacing.sm },
  card: { marginBottom: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: palette.border },
  rowLast: { borderBottomWidth: 0 },
  rowLabel: { color: palette.textMuted, fontSize: 13 },
  rowValue: { color: palette.text, fontSize: 13, fontWeight: '600', flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  rowValueStrong: { fontWeight: '800', fontSize: 14 },
  raw: { fontFamily: 'monospace', fontSize: 11, color: palette.textMuted },
});