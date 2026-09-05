import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, Field, Header, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtMoney } from '../../format';
import { post } from '../../api/client';
import { useAuth } from '../../auth/AuthContext';
import type { FundConfirm, FundInit } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'FundWallet'>;

const PRESETS = [500, 1000, 2000, 5000, 10000, 25000];
const GATEWAYS = ['TEST', 'PAYSTACK', 'FLUTTERWAVE', 'MONNIFY'];

export function FundWalletScreen({ navigation }: Props) {
  const { refreshUser } = useAuth();
  const [amount, setAmount] = useState('');
  const [gateway, setGateway] = useState('TEST');
  const [init, setInit] = useState<FundInit | null>(null);
  const [phase, setPhase] = useState<'amount' | 'confirm'>('amount');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const amountNum = Number(amount) || 0;
  const isTestGateway = init?.gateway === 'TEST';
  const canSimulate = !init || isTestGateway;

  const start = async () => {
    if (amountNum < 100 || amountNum > 10000000) {
      setError('Amount must be between ₦100 and ₦10,000,000.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<FundInit>('/api/wallet/fund', { amount: amountNum, gateway });
      setInit(res);
      setPhase('confirm');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not initialize payment.');
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (simulate: 'success' | 'decline' | undefined) => {
    if (!init) return;
    setError(null);
    setLoading(true);
    try {
      const res = await post<FundConfirm>('/api/wallet/fund/confirm', {
        reference: init.reference,
        ...(canSimulate && simulate ? { simulate } : {}),
      });
      await refreshUser();
      Alert.alert(res.status === 'SUCCESSFUL' ? 'Funding successful' : 'Funding declined', `Balance: ${res.balance !== undefined ? fmtMoney(res.balance) : 'unchanged'}`, [
        {
          text: 'OK',
          onPress: () => {
            setInit(null);
            setPhase('amount');
            setAmount('');
            if (res.status === 'SUCCESSFUL') navigation.goBack();
          },
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not confirm payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Header title="Fund wallet" onBack={() => navigation.goBack()} />

      {phase === 'amount' ? (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>How much do you want to add?</Text>
            <Field label="Amount" value={amount} onChangeText={setAmount} placeholder="2000" keyboardType="number-pad" />
            <View style={styles.chipRow}>
              {PRESETS.map((p) => (
                <Chip key={p} label={fmtMoney(p, { currency: false })} selected={amountNum === p} onPress={() => setAmount(String(p))} />
              ))}
            </View>
            <Text style={styles.label}>Payment method</Text>
            <View style={styles.chipRow}>
              {GATEWAYS.map((g) => (
                <Chip key={g} label={g} selected={gateway === g} onPress={() => setGateway(g)} />
              ))}
            </View>
            <Text style={styles.gatewayNote}>
              In test mode the demo gateway is used regardless of selection. No real money moves.
            </Text>
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button label={`Continue with ${fmtMoney(amountNum)}`} onPress={start} loading={loading} block size="lg" icon="arrow-forward" />
        </>
      ) : (
        <>
          <Card style={styles.card}>
            <Text style={styles.cardTitle}>Payment summary</Text>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Amount</Text>
              <Text style={styles.sumValue}>{fmtMoney(init?.message || amount)}</Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Reference</Text>
              <Text style={styles.sumRef} selectable>
                {init?.reference}
              </Text>
            </View>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Gateway</Text>
              <Text style={styles.sumValue}>{init?.gateway ?? gateway}</Text>
            </View>
            {init?.authUrl ? (
              <Text style={styles.gatewayNote}>
                Complete payment at the secure page ({init.authUrl}).
              </Text>
            ) : null}
            {init?.message ? <Text style={styles.gatewayNote}>{init.message}</Text> : null}
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {canSimulate ? (
            <>
              <Button label="Approve payment (simulate success)" onPress={() => confirm('success')} loading={loading} block size="lg" icon="checkmark-circle" />
              <View style={{ height: spacing.sm }} />
              <Button label="Decline (simulate failure)" variant="outline" onPress={() => confirm('decline')} loading={loading} block />
            </>
          ) : (
            <Button label="I’ve completed payment" onPress={() => confirm(undefined)} loading={loading} block size="lg" />
          )}
          <Button label="Cancel" variant="ghost" onPress={() => { setInit(null); setPhase('amount'); }} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.lg },
  cardTitle: { fontSize: 16, fontWeight: '800', color: palette.text, marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: '600', color: palette.text, marginBottom: 6 },
  gatewayNote: { fontSize: 12, color: palette.textMuted, marginTop: spacing.xs, lineHeight: 17 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValue: { fontSize: 16, fontWeight: '800', color: palette.text },
  sumRef: { fontSize: 12, fontWeight: '600', color: palette.text, flexShrink: 1, textAlign: 'right', marginLeft: spacing.md },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});