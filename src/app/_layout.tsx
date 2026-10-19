import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePalette } from '@/hooks/use-palette';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const { session, loading } = useAuth();
  const p = usePalette();

  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: p.background },
        headerTintColor: p.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: p.background },
      }}>
      <Stack.Protected guard={!!session}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="lancamento/novo" options={{ title: 'Novo lançamento', presentation: 'modal' }} />
        <Stack.Screen name="lancamento/[id]" options={{ title: 'Editar lançamento' }} />
      </Stack.Protected>
      <Stack.Protected guard={!session}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <StatusBar style="auto" />
        <RootNavigator />
      </AuthProvider>
    </ThemeProvider>
  );
}
