import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { Pressable } from 'react-native';

import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';

/** Botão flutuante "+" que abre o formulário de novo lançamento. */
export function AddButton() {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Adicionar lançamento"
      onPress={() => router.push('/lancamento/novo')}
      style={({ pressed }) => ({
        position: 'absolute',
        right: Spacing.lg,
        bottom: Spacing.lg,
        width: 58,
        height: 58,
        borderRadius: 29,
        backgroundColor: p.primary,
        alignItems: 'center',
        justifyContent: 'center',
        opacity: pressed ? 0.85 : 1,
        elevation: 4,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 3 },
      })}>
      <Ionicons name="add" size={30} color={p.onPrimary} />
    </Pressable>
  );
}
