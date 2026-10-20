import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';

import { usePalette } from '@/hooks/use-palette';

export default function TabsLayout() {
  const p = usePalette();
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: p.background },
        headerTintColor: p.text,
        headerShadowVisible: false,
        tabBarActiveTintColor: p.primary,
        tabBarInactiveTintColor: p.textSecondary,
        tabBarStyle: { backgroundColor: p.surface, borderTopColor: p.border },
        sceneStyle: { backgroundColor: p.background },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          headerTitle: 'From Zero',
          tabBarIcon: ({ color, size }) => <Ionicons name="home" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="lancamentos"
        options={{
          title: 'Lançamentos',
          tabBarIcon: ({ color, size }) => <Ionicons name="list" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="assistente"
        options={{
          title: 'Zero',
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarIcon: ({ color, size }) => <Ionicons name="sparkles" color={color as string} size={size} />,
        }}
      />
      <Tabs.Screen
        name="conta"
        options={{
          title: 'Conta',
          tabBarIcon: ({ color, size }) => <Ionicons name="person-circle" color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
