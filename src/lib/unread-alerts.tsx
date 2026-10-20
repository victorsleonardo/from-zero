import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';

import { countUnreadAlerts } from './alerts';
import { useAuth } from './auth';
import { supabase } from './supabase';

interface UnreadAlerts {
  count: number;
  refresh: () => void;
}

const UnreadAlertsContext = createContext<UnreadAlerts>({ count: 0, refresh: () => {} });

/** Quantidade de avisos não lidos, atualizada na hora quando um aviso novo chega. */
export function UnreadAlertsProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const userId = session?.user.id;
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    countUnreadAlerts()
      .then(setCount)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!userId) return;
    refresh();
    const channel = supabase
      .channel(`alerts:${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    const appState = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => {
      appState.remove();
      supabase.removeChannel(channel);
    };
  }, [userId, refresh]);

  return <UnreadAlertsContext.Provider value={{ count, refresh }}>{children}</UnreadAlertsContext.Provider>;
}

export function useUnreadAlerts(): UnreadAlerts {
  return useContext(UnreadAlertsContext);
}
