import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, ErrorState, Field, Header, Loading, Screen, SectionHeader } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { detectNetwork, fmtMoney } from '../../format';
import { post } from '../../api/client';
import { useApi } from '../../api/hooks';
import type { DataPlan, PurchaseResult } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyData'>;

const NETWORKS = ['MTN', 'Airtel', 'Glo', '9mobile'];
const KINDS = ['DATA', 'SME', 'GIFTING', 'CORP'];

const NETWORK_COLORS: Record<string, string> = {
  MTN: '#FFCC00',
  Airtel: '#ED1C24',
  Glo: '#00B140',
  '9mobile': '#00AEEF',
};

export function BuyDataScreen({ navigation }: Props) {
  const [network, setNetwork] = useState('MTN');
  const [kind, setKind] = useState('DATA');
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState<DataPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const plans = useApi<{ plans: DataPlan[] }>(`/api/data/plans?network=${encodeURIComponent(network)}`);

  const filtered = useMemo(
    () => (plans.data?.plans ?? []).filter((p) => p.kind === kind),
    [plans.data, kind]
  );

  const detected = useMemo(() => detectNetwork(phone), [phone]);

  const buy = async () => {
    if (!plan) {
      setError('Select a data plan.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<PurchaseResult>('/api/data', { network, phone, planId: plan.id });
      const m = res.providerResponse?.message ?? 'Data purchase processed.';
      navigation.navigate('Result', {
        title: 'Data',
        status: res.providerResponse?.status ?? 'PENDING',
        message: m,
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        serviceType: 'DATA',
        customerInfo: phone,
        provider: network,
        purchase: res,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Buy Data" onBack={() => navigation.goBack()} />

      <SectionHeader title="Network" />
      <View style={styles.chipRow}>
        {NETWORKS.map((n) => (
          <Chip
            key={n}
            label={n}
            color={NETWORK_COLORS[n]}
            selected={network === n}
            onPress={() => {
              setNetwork(n);
              setPlan(null);
            }}
          />
        ))}
      </View>

      <SectionHeader title="Plan type" />
      <View style={styles.chipRow}>
        {KINDS.map((k) => (
          <Chip key={k} label={k === 'DATA' ? 'Data plans' : k} selected={kind === k} onPress={() => setKind(k)} />
        ))}
      </View>

      <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="0803 123 4567" keyboardType="phone-pad" maxLength={14} />
      {detected && detected !== network ? <Text style={styles.hint}>Number appears to be {detected}.</Text> : null}

      <SectionHeader title="Choose plan" />
      {plans.loading ? <Loading label="Loading plans…" /> : null}
      {plans.error ? <ErrorState message={plans.error} onRetry={plans.refetch} /> : null}
      {filtered.length === 0 && !plans.loading ? (
        <Text style={styles.hint}>No plans available for this network/type.</Text>
      ) : null}
      {filtered.map((p) => {
        const selected = plan?.id === p.id;
        return (
          <Pressable
            key={p.id}
            style={[styles.planRow, selected && styles.planRowSel]}
            onPress={() => setPlan(selected ? null : p)}
          >
            <View style={styles.planLeft}>
              <Text style={styles.planName}>{p.planName}</Text>
              <Text style={styles.planSub}>
                {p.size} · {p.validity}
              </Text>
            </View>
            <View style={styles.planRight}>
              <Text style={styles.planPrice}>{fmtMoney(p.price)}</Text>
              {p.oldPrice ? <Text style={styles.planOld}>{fmtMoney(p.oldPrice)}</Text> : null}
            </View>
            <Ionicons
              name={selected ? 'checkmark-circle' : 'ellipse-outline'}
              size={22}
              color={selected ? palette.primary : '#C4C9D1'}
              style={{ marginLeft: 8 }}
            />
          </Pressable>
        );
      })}

      {plan ? (
        <Card style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>You will pay</Text>
            <Text style={styles.sumValue}>{fmtMoney(plan.price)}</Text>
          </View>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button
        label={plan ? `Buy ${plan.planName} for ${phone}` : 'Buy data'}
        onPress={buy}
        loading={loading}
        block
        size="lg"
        icon="wifi"
        disabled={!plan}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  hint: { color: palette.warning, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  planRowSel: { borderColor: palette.primary, backgroundColor: '#F0FBF5' },
  planLeft: { flex: 1 },
  planName: { fontSize: 14, fontWeight: '700', color: palette.text },
  planSub: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  planRight: { alignItems: 'flex-end' },
  planPrice: { fontSize: 14, fontWeight: '800', color: palette.text },
  planOld: { fontSize: 11, color: palette.textMuted, textDecorationLine: 'line-through', marginTop: 1 },
  summary: { marginBottom: spacing.lg, marginTop: spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValue: { fontSize: 22, fontWeight: '800', color: palette.text },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});