import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, Segmented, TextField } from '@/components/ui';
import { Spacing } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { supabase } from '@/lib/supabase';

type Mode = 'entrar' | 'criar';

export default function LoginScreen() {
  const p = usePalette();
  const [mode, setMode] = useState<Mode>('entrar');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setMessage(null);
    if (!email.trim() || !password) {
      setError('Preencha e-mail e senha.');
      return;
    }
    if (mode === 'criar' && password.length < 8) {
      setError('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }
    setLoading(true);
    try {
      if (mode === 'entrar') {
        const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (err) {
          setError(
            err.code === 'email_not_confirmed'
              ? 'Confirme seu e-mail pelo link que enviamos antes de entrar.'
              : 'E-mail ou senha incorretos.',
          );
        }
        // Com sucesso, o AuthProvider recebe a sessão e a navegação troca de tela sozinha.
      } else {
        const { data, error: err } = await supabase.auth.signUp({ email: email.trim(), password });
        if (err) setError(err.message);
        else if (!data.session) {
          setMessage('Conta criada! Abra o link que enviamos para o seu e-mail e depois volte aqui para entrar.');
          setMode('entrar');
        }
      }
    } catch {
      setError('Sem conexão. Verifique a internet e tente de novo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: p.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: Spacing.xl, gap: Spacing.xl }}>
          <View style={{ gap: Spacing.xs }}>
            <AppText variant="title">From Zero</AppText>
            <AppText muted>Suas finanças, from zero.</AppText>
          </View>

          <Segmented<Mode>
            options={[
              { value: 'entrar', label: 'Entrar' },
              { value: 'criar', label: 'Criar conta' },
            ]}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setError(null);
            }}
          />

          <View style={{ gap: Spacing.lg }}>
            <TextField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <TextField
              label="Senha"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete={mode === 'entrar' ? 'current-password' : 'new-password'}
              hint={mode === 'criar' ? 'Pelo menos 8 caracteres.' : undefined}
            />
          </View>

          {error && <AppText color={p.danger}>{error}</AppText>}
          {message && <AppText color={p.success}>{message}</AppText>}

          <Button title={mode === 'entrar' ? 'Entrar' : 'Criar conta'} onPress={submit} loading={loading} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
