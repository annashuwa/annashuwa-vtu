import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Button, Card, EmptyState, ErrorState, Header, Loading, Screen } from '../../components/ui';
import { palette, spacing } from '../../theme';
import { timeAgo } from '../../format';
import { post } from '../../api/client';
import { useApiFocus } from '../../api/hooks';
import type { Notification, NotificationPage } from '../../types';
import type { RootStackParamList } from '../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>;

const iconMap: Record<string, [keyof typeof Ionicons.glyphMap, string]> = {
  SUCCESS: ['checkmark-circle', palette.success],
  ERROR: ['close-circle', palette.danger],
  WARNING: ['warning', palette.warning],
  INFO: ['information-circle', palette.info],
};

export function NotificationsScreen({ navigation }: Props) {
  const notifs = useApiFocus<NotificationPage>('/api/notifications');
  const busy = React.useRef(false);

  const markAllRead = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      await post<{ ok: boolean }>('/api/notifications/read');
      notifs.refetch();
    } catch {
      // non-fatal
    } finally {
      busy.current = false;
    }
  };

  return (
    <Screen style={{ paddingHorizontal: 0 }}>
      <View style={styles.headerWrap}>
        <Header
          title={notifs.data ? `${notifs.data.unread} unread` : 'Notifications'}
          onBack={() => navigation.goBack()}
          right={
            notifs.data && notifs.data.unread > 0 ? (
              <Button label="Mark all read" size="sm" variant="secondary" onPress={markAllRead} />
            ) : null
          }
        />
      </View>

      {notifs.loading ? <Loading label="Loading notifications…" /> : null}
      {notifs.error ? <ErrorState message={notifs.error} onRetry={notifs.refetch} /> : null}

      <FlatList
        data={notifs.data?.data ?? []}
        keyExtractor={(n) => n.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !notifs.loading && !notifs.error ? (
            <EmptyState icon="notifications-off-outline" title="No notifications" subtitle="Alerts about your transactions will appear here." />
          ) : null
        }
        renderItem={({ item }) => (
          <NotificationRow notif={item} />
        )}
      />
    </Screen>
  );
}

function NotificationRow({ notif }: { notif: Notification }) {
  const [icon, color] = iconMap[notif.type] ?? [iconMap.INFO[0], iconMap.INFO[1]];
  return (
    <Card style={[styles.row, !notif.isRead && styles.rowUnread]}>
      <View style={[styles.icon, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>{notif.title}</Text>
        <Text style={styles.message}>{notif.message}</Text>
        <Text style={styles.time}>{timeAgo(notif.createdAt)}</Text>
      </View>
      {!notif.isRead ? <View style={styles.unreadDot} /> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.lg },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  row: { flexDirection: 'row', padding: spacing.lg, marginBottom: spacing.sm, alignItems: 'flex-start' },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: palette.primary },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  body: { flex: 1 },
  title: { fontSize: 14, fontWeight: '800', color: palette.text },
  message: { fontSize: 13, color: palette.textMuted, marginTop: 3, lineHeight: 18 },
  time: { fontSize: 11, color: palette.textMuted, marginTop: 6 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: palette.primary, marginLeft: spacing.sm, marginTop: 4 },
});