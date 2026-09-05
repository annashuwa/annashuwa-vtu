import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, ErrorState, Field, Header, Loading, Screen, SectionHeader } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtMoney } from '../../format';
import { post } from '../../api/client';
import { useApi } from '../../api/hooks';
import type { CableProvider, PurchaseResult, ServicePackage } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyCable'>;

export function BuyCableScreen({ navigation }: Props) {
  const [provider, setProvider] = useState<CableProvider | null>(null);
  const [smartCard, setSmartCard] = useState('');
  const [customer, setCustomer] = useState<{ name: string } | null>(null);
  const [pkg, setPkg] = useState<ServicePackage | null>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);

  const providers = useApi<{ providers: CableProvider[] }>('/api/cable/providers');

  const validateCard = async () => {
    if (!provider || smartCard.replace(/[^\d]/g, '').length < 6) {
      setError('Enter a valid smart card number.');
      return;
    }
    setError(null);
    setValidating(true);
    try {
      const res = await post<{ name: string }>('/api/cable/validate', {
        provider: provider.code,
        smartCard,
      });
      setCustomer(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not validate smart card.');
    } finally {
      setValidating(false);
    }
  };

  const buy = async () => {
    if (!provider || !pkg) {
      setError('Select a provider and package.');
      return;
    }
    if (smartCard.replace(/[^\d]/g, '').length < 6) {
      setError('Enter a valid smart card number.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<PurchaseResult>('/api/cable', {
        provider: provider.code,
        smartCard,
        packageId: pkg.id,
        phone: phone || undefined,
      });
      const m = res.providerResponse?.message ?? 'Subscription processed.';
      navigation.navigate('Result', {
        title: 'Cable TV',
        status: res.providerResponse?.status ?? 'PENDING',
        message: m,
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        serviceType: 'CABLE',
        customerInfo: `${smartCard} · ${customer?.name ?? ''}`,
        provider: provider.name,
        purchase: res,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  };

  const total = Number(pkg?.price ?? 0) + Number(provider?.fee ?? 0);

  return (
    <Screen scroll>
      <Header title="Cable TV Subscription" onBack={() => navigation.goBack()} />

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
              setPkg(null);
              setCustomer(null);
            }}
          />
        ))}
      </View>

      <Field label="Smart card number" value={smartCard} onChangeText={setSmartCard} placeholder="e.g. 7030123456" keyboardType="number-pad" maxLength={20} />
      <Field label="Phone number (optional)" value={phone} onChangeText={setPhone} placeholder="For SMS tokens" keyboardType="phone-pad" maxLength={14} />

      {smartCard.replace(/[^\d]/g, '').length >= 6 && !customer ? (
        <Button label="Validate smart card" variant="outline" onPress={validateCard} loading={validating} block icon="search" style={{ marginBottom: spacing.md }} />
      ) : null}
      {customer ? (
        <Card style={styles.customerCard}>
          <Text style={styles.customerName}>{customer.name}</Text>
        </Card>
      ) : null}

      {provider?.packages.length ? (
        <>
          <SectionHeader title="Choose package" />
          {provider.packages.filter((p) => p) .sort((a, b) => Number(a.price) - Number(b.price)).map((p) => {
            const selected = pkg?.id === p.id;
            return (
              <Pressable
                key={p.id}
                style={[styles.pkgRow, selected && styles.pkgRowSel]}
                onPress={() => setPkg(selected ? null : p)}
              >
                <View style={styles.pkgLeft}>
                  <Text style={styles.pkgName}>{p.name}</Text>
                  {p.duration ? <Text style={styles.pkgSub}>{p.duration}</Text> : null}
                </View>
                <View style={styles.pkgRight}>
                  <Text style={styles.pkgPrice}>{fmtMoney(p.price)}</Text>
                  {p.oldPrice ? <Text style={styles.pkgOld}>{fmtMoney(p.oldPrice)}</Text> : null}
                </View>
                <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? palette.primary : '#C4C9D1'} style={{ marginLeft: 8 }} />
              </Pressable>
            );
          })}
        </>
      ) : null}

      {pkg ? (
        <Card style={styles.summary}>
          <View style={styles.sumRow}>
            <Text style={styles.sumLabel}>Subscription</Text>
            <Text style={styles.sumValueSm}>{fmtMoney(pkg.price)}</Text>
          </View>
          <View style={[styles.sumRow, { marginTop: 6 }]}>
            <Text style={styles.sumLabel}>Provider fee</Text>
            <Text style={styles.sumValueSm}>{fmtMoney(provider?.fee ?? '0')}</Text>
          </View>
          <View style={[styles.sumRow, { marginTop: 8 }]}>
            <Text style={styles.sumLabel}>Total</Text>
            <Text style={styles.sumValue}>{fmtMoney(total)}</Text>
          </View>
        </Card>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Subscribe" onPress={buy} loading={loading} block size="lg" icon="tv" disabled={!pkg} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.md },
  customerCard: { marginBottom: spacing.lg },
  customerName: { fontSize: 16, fontWeight: '800', color: palette.text },
  pkgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  pkgRowSel: { borderColor: palette.primary, backgroundColor: '#F0FBF5' },
  pkgLeft: { flex: 1 },
  pkgName: { fontSize: 14, fontWeight: '700', color: palette.text },
  pkgSub: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  pkgRight: { alignItems: 'flex-end' },
  pkgPrice: { fontSize: 14, fontWeight: '800', color: palette.text },
  pkgOld: { fontSize: 11, color: palette.textMuted, textDecorationLine: 'line-through', marginTop: 1 },
  summary: { marginBottom: spacing.lg, marginTop: spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValueSm: { fontSize: 15, fontWeight: '700', color: palette.text },
  sumValue: { fontSize: 22, fontWeight: '800', color: palette.text },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});