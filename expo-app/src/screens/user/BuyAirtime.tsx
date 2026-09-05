import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, Field, Header, Screen, SectionHeader } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { detectNetwork, fmtMoney } from '../../format';
import { post } from '../../api/client';
import type { PurchaseResult } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyAirtime'>;

const NETWORKS: { name: string; color: string; textColor: string }[] = [
  { name: 'MTN', color: '#FFCC00', textColor: '#0B1220' },
  { name: 'Airtel', color: '#ED1C24', textColor: '#FFFFFF' },
  { name: 'Glo', color: '#00B140', textColor: '#FFFFFF' },
  { name: '9mobile', color: '#00AEEF', textColor: '#FFFFFF' },
];

const PRESETS = [50, 100, 200, 500, 1000, 2000, 5000];

export function BuyAirtimeScreen({ navigation }: Props) {
  const [network, setNetwork] = useState<string>('MTN');
  const [phone, setPhone] = useState('');
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = Number(amount) || 0;
  const detected = useMemo(() => detectNetwork(phone), [phone]);

  const buy = async () => {
    if (amountNum < 50 || amountNum > 100000) {
      setError('Airtime amount must be between ₦50 and ₦100,000.');
      return;
    }
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<PurchaseResult>('/api/airtime', { network, phone, amount: amountNum });
      const m = res.providerResponse?.message ?? 'Airtime request processed.';
      navigation.navigate('Result', {
        title: 'Airtime',
        status: res.providerResponse?.status ?? 'PENDING',
        message: m,
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        serviceType: 'AIRTIME',
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
      <Header title="Buy Airtime" onBack={() => navigation.goBack()} />
      <SectionHeader title="Network" />
      <View style={styles.chipRow}>
        {NETWORKS.map((n) => (
          <Chip
            key={n.name}
            label={n.name}
            color={n.color}
            textColor={network === n.name ? n.textColor : undefined}
            selected={network === n.name}
            onPress={() => setNetwork(n.name)}
          />
        ))}
      </View>

      <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="0803 123 4567" keyboardType="phone-pad" maxLength={14} />
      {detected && detected !== network ? (
        <Text style={styles.hint}>
          Looks like a {detected} number — switch network to {detected} for best delivery.
        </Text>
      ) : null}

      <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="500" keyboardType="number-pad" />

      <View style={styles.presetRow}>
        {PRESETS.map((p) => (
          <Chip key={p} label={fmtMoney(p, { currency: false })} selected={amountNum === p} onPress={() => setAmount(String(p))} />
        ))}
      </View>

      <Card style={styles.summary}>
        <View style={styles.sumRow}>
          <Text style={styles.sumLabel}>You will pay</Text>
          <Text style={styles.sumValue}>{fmtMoney(amountNum)}</Text>
        </View>
      </Card>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label={`Buy ${fmtMoney(amountNum, { currency: false })} airtime`} onPress={buy} loading={loading} block size="lg" icon="flash" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  presetRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.lg },
  hint: { color: palette.warning, fontSize: 12, marginTop: -spacing.sm, marginBottom: spacing.md },
  summary: { marginBottom: spacing.lg },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValue: { fontSize: 22, fontWeight: '800', color: palette.text },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});