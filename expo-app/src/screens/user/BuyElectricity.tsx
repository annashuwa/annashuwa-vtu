import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, ErrorState, Field, Header, Loading, Screen, SectionHeader } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtMoney } from '../../format';
import { post } from '../../api/client';
import { useApi } from '../../api/hooks';
import type { PurchaseResult, ServiceProvider } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyElectricity'>;

const METER_TYPES = ['prepaid', 'postpaid'];
const AMOUNT_PRESETS = [1000, 2000, 3000, 5000, 10000];

export function BuyElectricityScreen({ navigation }: Props) {
  const [provider, setProvider] = useState<ServiceProvider | null>(null);
  const [meterNumber, setMeterNumber] = useState('');
  const [meterType, setMeterType] = useState('prepaid');
  const [amount, setAmount] = useState('');
  const [customer, setCustomer] = useState<{ name: string; address?: string } | null>(null);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const providers = useApi<{ providers: ServiceProvider[] }>('/api/electricity/providers');
  const amountNum = Number(amount) || 0;

  const validateMeter = async () => {
    if (!provider || meterNumber.replace(/[^\d]/g, '').length < 6) {
      setError('Enter a valid meter number.');
      return;
    }
    setError(null);
    setValidating(true);
    try {
      const res = await post<{ name: string; address?: string }>('/api/electricity/validate', {
        provider: provider.code,
        meterNumber,
        meterType,
      });
      setCustomer(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not validate meter.');
    } finally {
      setValidating(false);
    }
  };

  const buy = async () => {
    if (!provider) {
      setError('Select a provider.');
      return;
    }
    if (amountNum < 500 || amountNum > 10000000) {
      setError('Amount must be between ₦500 and ₦10,000,000.');
      return;
    }
    if (!customer) {
      await validateMeter();
      if (!customer) return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<PurchaseResult>('/api/electricity', {
        provider: provider.code,
        meterNumber,
        meterType,
        amount: amountNum,
      });
      const m = res.providerResponse?.message ?? 'Electricity purchase processed.';
      navigation.navigate('Result', {
        title: 'Electricity',
        status: res.providerResponse?.status ?? 'PENDING',
        message: m,
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        serviceType: 'ELECTRICITY',
        customerInfo: `${meterNumber} · ${customer?.name ?? ''}`,
        provider: provider.name,
        purchase: res,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <Header title="Buy Electricity" onBack={() => navigation.goBack()} />

      <SectionHeader title="Provider" />
      {providers.loading ? <Loading label="Loading providers…" /> : null}
      {providers.error ? <ErrorState message={providers.error} onRetry={providers.refetch} /> : null}
      <View style={styles.chipRow}>
        {providers.data?.providers.map((p) => (
          <Chip
            key={p.code}
            label={p.name}
            selected={provider?.code === p.code}
            onPress={() => {
              setProvider(p);
              setCustomer(null);
            }}
          />
        ))}
      </View>

      <Field label="Meter number" value={meterNumber} onChangeText={setMeterNumber} placeholder="e.g. 40012345678" keyboardType="number-pad" maxLength={30} />

      <SectionHeader title="Meter type" />
      <View style={styles.chipRow}>
        {METER_TYPES.map((t) => (
          <Chip key={t} label={t} selected={meterType === t} onPress={() => setMeterType(t)} />
        ))}
      </View>

      {meterNumber.replace(/[^\d]/g, '').length >= 6 && !customer ? (
        <Button label="Validate meter" variant="outline" onPress={validateMeter} loading={validating} block icon="search" style={{ marginBottom: spacing.md }} />
      ) : null}
      {customer ? (
        <Card style={styles.customerCard}>
          <Text style={styles.customerName}>{customer.name}</Text>
          {customer.address ? <Text style={styles.customerAddr}>{customer.address}</Text> : null}
        </Card>
      ) : null}

      <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="2000" keyboardType="number-pad" />
      <View style={styles.chipRow}>
        {AMOUNT_PRESETS.map((p) => (
          <Chip key={p} label={fmtMoney(p, { currency: false })} selected={amountNum === p} onPress={() => setAmount(String(p))} />
        ))}
      </View>

      <Card style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>Provider fee</Text>
          <Text style={styles.sumValueSm}>{fmtMoney(provider?.fee ?? '0')}</Text>
        </View>
        <View style={[styles.sumRow, { marginTop: 6 }]}>
          <Text style={styles.sumLabel}>Total</Text>
          <Text style={styles.sumValue}>{fmtMoney(amountNum + Number(provider?.fee ?? 0))}</Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Pay & buy units" onPress={buy} loading={loading} block size="lg" icon="flash" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  customerCard: { marginBottom: spacing.lg },
  customerName: { fontSize: 16, fontWeight: '800', color: palette.text },
  customerAddr: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  summary: { marginBottom: spacing.lg },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValueSm: { fontSize: 15, fontWeight: '700', color: palette.text },
  sumValue: { fontSize: 22, fontWeight: '800', color: palette.text },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});