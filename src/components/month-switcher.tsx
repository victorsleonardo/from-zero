import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/ui';
import { usePalette } from '@/hooks/use-palette';
import { monthLabel, shiftMonth } from '@/lib/format';

export function MonthSwitcher({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
      <Pressable accessibilityLabel="Mês anterior" hitSlop={12} onPress={() => onChange(shiftMonth(month, -1))}>
        <Ionicons name="chevron-back" size={22} color={p.textSecondary} />
      </Pressable>
      <AppText variant="heading">{monthLabel(month)}</AppText>
      <Pressable accessibilityLabel="Próximo mês" hitSlop={12} onPress={() => onChange(shiftMonth(month, 1))}>
        <Ionicons name="chevron-forward" size={22} color={p.textSecondary} />
      </Pressable>
    </View>
  );
}
