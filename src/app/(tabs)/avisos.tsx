import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert as Confirm, FlatList, Pressable, RefreshControl, View } from 'react-native';

import { AppText, Button, Card, EmptyState } from '@/components/ui';
import { Radius, Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { AGENT_INFO, deleteAlert, getAlerts, markAllAlertsRead, timeAgo, type Alert } from '@/lib/alerts';
import { useUnreadAlerts } from '@/lib/unread-alerts';

export default function AlertsScreen() {
  const p = usePalette();
  const { refresh: refreshBadge } = useUnreadAlerts();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getAlerts()
      .then(async (list) => {
        setAlerts(list);
        setError(null);
        // Mostra os novos destacados nesta visita e já marca como lidos.
        if (list.some((a) => !a.read_at)) {
          await markAllAlertsRead();
          refreshBadge();
        }
      })
      .catch(() => setError('Não foi possível carregar os avisos.'))
      .finally(() => setLoading(false));
  }, [refreshBadge]);

  useFocusEffect(load);

  function remove(alert: Alert) {
    Confirm.alert('Apagar aviso?', alert.title, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Apagar',
        style: 'destructive',
        onPress: () =>
          deleteAlert(alert.id)
            .then(() => setAlerts((prev) => prev.filter((a) => a.id !== alert.id)))
            .catch(() => setError('Não foi possível apagar.')),
      },
    ]);
  }

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        data={alerts}
        keyExtractor={(a) => a.id}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.md, flexGrow: 1 }}
        ListHeaderComponent={
          <View style={{ gap: Spacing.md }}>
            <Button title="Configurar agentes" variant="ghost" icon="options-outline" onPress={() => router.push('/agentes')} />
            {error && <AppText color={p.danger}>{error}</AppText>}
          </View>
        }
        ListEmptyComponent={
          loading ? undefined : (
            <EmptyState icon="notifications-outline" title="Nenhum aviso ainda">
              <AppText muted style={{ textAlign: 'center' }}>
                Seus agentes avisam aqui quando algo merecer atenção: gasto fora do normal, cobrança que se repete,
                limite do dia e o resumo de toda segunda.
              </AppText>
            </EmptyState>
          )
        }
        renderItem={({ item }) => {
          const info = AGENT_INFO[item.template];
          const unread = !item.read_at;
          return (
            <Pressable onLongPress={() => remove(item)} delayLongPress={400}>
              <Card style={{ flexDirection: 'row', gap: Spacing.md, borderColor: unread ? p.primary : p.border }}>
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: Radius.pill,
                    backgroundColor: p.primary + '22',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}>
                  <Ionicons name={info.icon as 'calendar'} size={18} color={p.primary} />
                </View>
                <View style={{ flex: 1, gap: Spacing.xs }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.sm }}>
                    <AppText variant="label" style={{ flex: 1 }}>
                      {item.title}
                    </AppText>
                    <AppText variant="caption" muted>
                      {timeAgo(item.created_at)}
                    </AppText>
                  </View>
                  <AppText muted>{item.body}</AppText>
                </View>
              </Card>
            </Pressable>
          );
        }}
        ListFooterComponent={
          alerts.length > 0 ? (
            <AppText variant="caption" muted style={{ textAlign: 'center' }}>
              Toque e segure um aviso para apagar.
            </AppText>
          ) : null
        }
      />
    </View>
  );
}
