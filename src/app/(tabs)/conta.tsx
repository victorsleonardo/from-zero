import { Alert, ScrollView } from 'react-native';

import { AppText, Button, Card } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function AccountScreen() {
  const { session } = useAuth();

  function signOut() {
    Alert.alert('Sair da conta?', 'Seus dados continuam salvos.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', style: 'destructive', onPress: () => supabase.auth.signOut() },
    ]);
  }

  return (
    <ScrollView contentContainerStyle={{ padding: Spacing.lg, gap: Spacing.lg }}>
      <Card style={{ gap: Spacing.xs }}>
        <AppText variant="caption" muted>Conectado como</AppText>
        <AppText variant="heading">{session?.user.email}</AppText>
      </Card>
      <Card style={{ gap: Spacing.xs }}>
        <AppText variant="heading">Em breve</AppText>
        <AppText muted>Metas por categoria e notificações no celular.</AppText>
      </Card>
      <Button title="Sair" variant="danger" icon="log-out-outline" onPress={signOut} />
    </ScrollView>
  );
}
