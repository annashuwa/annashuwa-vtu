import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, Chip, ErrorState, Field, Header, Loading, Screen, SectionHeader } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtMoney } from '../../format';
import { post } from '../../api/client';
import { useApi } from '../../api/hooks';
import type { ExamProduct, PurchaseResult } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'BuyExamPins'>;

const PRODUCT_COLORS: Record<string, string> = {
  WAEC: '#2563EB',
  NECO: '#16A34A',
  NABTEB: '#D97706',
  JAMB: '#DB2777',
};

export function BuyExamPinsScreen({ navigation }: Props) {
  const [product, setProduct] = useState<ExamProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const products = useApi<{ products: ExamProduct[] }>('/api/exam-pins');

  const buy = async () => {
    if (!product) {
      setError('Select a product.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await post<PurchaseResult & { pins?: string[]; serials?: string[] }>('/api/exam-pins/purchase', {
        productId: product.id,
        quantity,
        phone: phone || undefined,
      });
      const m = res.providerResponse?.message ?? 'Pins generated.';
      navigation.navigate('Result', {
        title: 'Exam PIN',
        status: res.providerResponse?.status ?? 'PENDING',
        message: m,
        reference: res.transaction.reference,
        amount: res.transaction.amount,
        serviceType: 'EXAM_PIN',
        customerInfo: `${product.name} ×${quantity}`,
        provider: product.name,
        purchase: res as PurchaseResult,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Purchase failed.');
    } finally {
      setLoading(false);
    }
  };

  const total = product ? Number(product.price) * quantity : 0;

  return (
    <Screen>
      <Header title="Exam PINs" onBack={() => navigation.goBack()} />
      <Text style={styles.subtitle}>WAEC, NECO, NABTEB & JAMB scratch cards in seconds.</Text>

      <SectionHeader title="Choose product" />
      {products.loading ? <Loading label="Loading products…" /> : null}
      {products.error ? <ErrorState message={products.error} onRetry={products.refetch} /> : null}
      {products.data?.products.map((p) => {
        const selected = product?.id === p.id;
        const color = PRODUCT_COLORS[p.category] ?? palette.primary;
        return (
          <Pressable
            key={p.id}
            style={[styles.prodRow, selected && { borderColor: color }]}
            onPress={() => setProduct(selected ? null : p)}
          >
            <View style={[styles.prodIcon, { backgroundColor: `${color}18` }]}>
              <Ionicons name="school" size={20} color={color} />
            </View>
            <View style={styles.prodLeft}>
              <Text style={styles.prodName}>{p.name}</Text>
              {p.description ? <Text style={styles.prodSub}>{p.description}</Text> : null}
            </View>
            <View style={styles.prodRight}>
              <Text style={styles.prodPrice}>{fmtMoney(p.price)}</Text>
              <Text style={styles.prodCount}>{p.soldCount} sold</Text>
            </View>
            <Ionicons name={selected ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={selected ? color : '#C4C9D1'} style={{ marginLeft: 8 }} />
          </Pressable>
        );
      })}

      {product ? (
        <>
          <SectionHeader title="Quantity" />
          <View style={styles.qtyRow}>
            {[1, 2, 3, 4, 5].map((q) => (
              <Chip key={q} label={String(q)} selected={quantity === q} onPress={() => setQuantity(q)} />
            ))}
          </View>

          <Field label="Phone (optional)" value={phone} onChangeText={setPhone} placeholder="Where to send pins" keyboardType="phone-pad" maxLength={14} />

          <Card style={styles.summary}>
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>
                Total ({quantity} × {fmtMoney(product?.price ?? '0', { currency: false })})
              </Text>
              <Text style={styles.sumValue}>{fmtMoney(total)}</Text>
            </View>
          </Card>
        </>
      ) : null}

      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button label="Buy PINs" onPress={buy} loading={loading} block size="lg" icon="key" disabled={!product} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: { color: palette.textMuted, fontSize: 13, marginBottom: spacing.lg },
  prodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: palette.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderWidth: 1.5,
    borderColor: palette.border,
  },
  prodIcon: { width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  prodLeft: { flex: 1 },
  prodName: { fontSize: 14, fontWeight: '700', color: palette.text },
  prodSub: { fontSize: 11, color: palette.textMuted, marginTop: 2 },
  prodRight: { alignItems: 'flex-end' },
  prodPrice: { fontSize: 14, fontWeight: '800', color: palette.text },
  prodCount: { fontSize: 10, color: palette.textMuted, marginTop: 2 },
  qtyRow: { flexDirection: 'row', marginBottom: spacing.md },
  summary: { marginBottom: spacing.lg, marginTop: spacing.sm },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sumLabel: { color: palette.textMuted, fontSize: 14 },
  sumValue: { fontSize: 22, fontWeight: '800', color: palette.text },
  error: { color: palette.danger, fontSize: 13, marginBottom: spacing.md },
});