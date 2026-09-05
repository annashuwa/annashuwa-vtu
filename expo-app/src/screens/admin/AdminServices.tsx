import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Card, Chip, EmptyState, ErrorState, Header, Loading, Screen, SectionHeader } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { fmtMoney } from '../../format';
import { useApiFocus } from '../../api/hooks';
import type { ServiceProvider } from '../../types';
import type { AdminTabParamList, RootStackParamList } from '../../navigation/types';

type Props = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, 'AdminServicesTab'>,
  NativeStackScreenProps<RootStackParamList>
>;

interface AdminProvider extends ServiceProvider {
  packages: { id: string; name: string; price: string; duration: string | null; isActive: boolean }[];
}

export function AdminServicesScreen(_props: Props) {
  const [category, setCategory] = useState<'ALL' | 'ELECTRICITY' | 'CABLE'>('ALL');
  const services = useApiFocus<{ providers: AdminProvider[] }>(
    category === 'ALL' ? '/api/admin/services' : `/api/admin/services?category=${category}`
  );

  return (
    <Screen>
      <Header title="Services" />
      <View style={styles.filterRow}>
        {(['ALL', 'ELECTRICITY', 'CABLE'] as const).map((c) => (
          <Chip key={c} label={c === 'ALL' ? 'All' : c} selected={category === c} onPress={() => setCategory(c)} />
        ))}
      </View>

      {services.loading ? <Loading label="Loading services…" /> : null}
      {services.error ? <ErrorState message={services.error} onRetry={services.refetch} /> : null}
      <ScrollView showsVerticalScrollIndicator={false}>
        {services.data?.providers.map((p) => {
          const packages = p.packages ?? [];
          return (
            <Card key={p.id} style={styles.card}>
              <View style={styles.providerHead}>
                <Text style={styles.providerName}>{p.name}</Text>
                <View style={[styles.activeDot, p.isActive ? styles.activeOn : styles.activeOff]} />
              </View>
              <Text style={styles.providerCat}>{p.category}</Text>
              <Text style={styles.providerFee}>Fee: {fmtMoney(p.fee)}</Text>
              {packages.length > 0 ? (
                <>
                  <SectionHeader title="Packages" />
                  {packages.map((pk) => (
                    <View key={pk.id} style={styles.pkgRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.pkgName}>{pk.name}</Text>
                        {pk.duration ? <Text style={styles.pkgSub}>{pk.duration}</Text> : null}
                      </View>
                      <Text style={[styles.pkgPrice, !pk.isActive && { color: palette.textMuted }]}>{fmtMoney(pk.price)}</Text>
                    </View>
                  ))}
                </>
              ) : null}
              {packages.length === 0 ? (
                <EmptyState icon="grid-outline" title="No packages" subtitle="Active only items are shown." />
              ) : null}
            </Card>
          );
        })}
        {services.data && services.data.providers.length === 0 ? (
          <EmptyState icon="grid-outline" title="No providers" />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  filterRow: { flexDirection: 'row', marginBottom: spacing.md },
  card: { marginBottom: spacing.md },
  providerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  providerName: { fontSize: 17, fontWeight: '800', color: palette.text },
  providerCat: { fontSize: 12, color: palette.textMuted, marginTop: 2 },
  providerFee: { fontSize: 12, color: palette.primary, fontWeight: '700', marginTop: 4 },
  activeDot: { width: 10, height: 10, borderRadius: 5 },
  activeOn: { backgroundColor: palette.success },
  activeOff: { backgroundColor: palette.textMuted },
  pkgRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.border },
  pkgName: { fontSize: 13, fontWeight: '700', color: palette.text },
  pkgSub: { fontSize: 11, color: palette.textMuted, marginTop: 1 },
  pkgPrice: { fontSize: 13, fontWeight: '800', color: palette.text },
});