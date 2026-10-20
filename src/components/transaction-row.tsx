import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { AppText, CategoryIcon } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { formatBRL, formatDate } from '@/lib/format';
import type { Category, Transaction } from '@/lib/types';

export function TransactionRow({ transaction: t, category }: { transaction: Transaction; category?: Category }) {
  const p = usePalette();
  const income = t.kind === 'receita';
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/lancamento/[id]', params: { id: t.id } })}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, opacity: pressed ? 0.6 : 1 })}>
      <CategoryIcon category={category} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText numberOfLines={1}>{t.description}</AppText>
        <AppText variant="caption" muted>
          {formatDate(t.occurred_on)} · {category?.name ?? 'Sem categoria'}
          {t.series_type === 'fixo' ? ' · fixo' : ''}
          {t.hidden ? ' · fora dos totais' : ''}
        </AppText>
      </View>
      <AppText
        variant="label"
        color={t.hidden ? p.textSecondary : income ? p.success : p.text}
        style={{ fontVariant: ['tabular-nums'], textDecorationLine: t.hidden ? 'line-through' : 'none' }}>
        {income ? '+' : '−'}
        {formatBRL(t.amount)}
      </AppText>
    </Pressable>
  );
}
