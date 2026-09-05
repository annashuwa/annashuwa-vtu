import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Header, InfoRow, Screen } from '../../components/ui';
import { palette, radius, spacing } from '../../theme';
import { fmtDateTime, fmtMoney } from '../../format';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Result'>;

export function ResultScreen({ navigation, route }: Props) {
  const { title, status, message, reference, amount, serviceType, customerInfo, provider, purchase } = route.params;

  const isSuccess = status === 'SUCCESSFUL';
  const isPending = status === 'PROCESSING' || status === 'PENDING';
  const icon = isSuccess ? 'checkmark-circle' : isPending ? 'time' : 'close-circle';
  const color = isSuccess ? palette.success : isPending ? palette.warning : palette.danger;

  const pins = purchase?.pins ?? purchase?.providerResponse?.pins ?? [];
  const serials = purchase?.serials ?? purchase?.providerResponse?.serials ?? [];
  const electricityToken = (purchase?.providerResponse?.data as Record<string, unknown> | undefined)?.token as string | undefined;

  return (
    <Screen style={{ backgroundColor: '#F2FDF7' }}>
      <Header title="Purchase complete" transparent />
      <View style={styles.center}>
        <Ionicons name={icon} size={84} color={color} />
        <Text style={styles.statusTitle}>
          {isSuccess ? 'Successful' : isPending ? 'Processing' : 'Failed'}
        </Text>
        <Text style={styles.message} numberOfLines={2}>
          {message}
        </Text>
      </View>

      <View style={styles.card}>
        <InfoRow label="Service" value={title} />
        <InfoRow label="Reference" value={reference} mono />
        <InfoRow label="Amount" value={fmtMoney(amount)} />
        {provider ? <InfoRow label="Provider" value={provider} /> : null}
        {customerInfo ? <InfoRow label="Beneficiary" value={customerInfo} /> : null}
        <InfoRow label="Date" value={fmtDateTime(new Date().toISOString())} />
      </View>

      {electricityToken ? (
        <View style={styles.tokenCard}>
          <Text style={styles.tokenLabel}>Vending token</Text>
          <Text style={styles.tokenValue}>{String(electricityToken)}</Text>
        </View>
      ) : null}

      {pins.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.pinsHeader}>
            {serviceType === 'EXAM_PIN' ? 'Your PINs' : 'Pins'}
          </Text>
          {pins.map((pin, i) => (
            <View key={`${pin}-${i}`} style={styles.pinRow}>
              <Text style={styles.pinText} selectable>
                {pin}
              </Text>
              {serials[i] ? <Text style={styles.pinSub}>{serials[i]}</Text> : null}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.actions}>
        <View style={styles.actionBtn}>
          <Button label="Done" onPress={() => navigation.popToTop()} />
        </View>
        <View style={styles.actionBtn}>
          <Button label="View transactions" variant="outline" onPress={() => navigation.navigate('Main', { screen: 'ActivityTab' })} />
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', paddingTop: spacing.xxl, marginBottom: spacing.xl },
  statusTitle: { fontSize: 24, fontWeight: '900', color: palette.text, marginTop: spacing.md },
  message: { color: palette.textMuted, fontSize: 14, marginTop: 6, textAlign: 'center', paddingHorizontal: spacing.lg },
  card: { backgroundColor: palette.card, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.md },
  tokenCard: {
    backgroundColor: palette.darkGreen,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  tokenLabel: { color: '#9CCFB4', fontSize: 12, fontWeight: '600' },
  tokenValue: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: 2, marginTop: 6, textAlign: 'center' },
  pinsHeader: { fontSize: 15, fontWeight: '800', color: palette.text, marginBottom: spacing.sm },
  pinRow: {
    backgroundColor: palette.inputBg,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  pinText: { fontSize: 15, fontWeight: '700', color: palette.text, letterSpacing: 0.5 },
  pinSub: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  actionBtn: { flex: 1 },
});