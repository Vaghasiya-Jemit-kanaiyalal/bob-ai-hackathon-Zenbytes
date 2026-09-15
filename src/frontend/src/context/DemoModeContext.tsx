/**
 * DemoModeContext
 * ─────────────────────────────────────────────────────────────────────────────
 * When demo mode is ON, all pages render from local mock data instead of the
 * real backend API.  Toggled via the "Demo" button in the top nav.
 */
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

interface DemoModeContextValue {
  demoMode:   boolean;
  toggleDemo: () => void;
}

const DemoModeContext = createContext<DemoModeContextValue>({
  demoMode:   false,
  toggleDemo: () => {},
});

export function DemoModeProvider({ children }: { children: ReactNode }) {
  const [demoMode, setDemoMode] = useState(false);
  const toggleDemo = useCallback(() => setDemoMode(v => !v), []);
  return (
    <DemoModeContext.Provider value={{ demoMode, toggleDemo }}>
      {children}
    </DemoModeContext.Provider>
  );
}

export function useDemoMode(): DemoModeContextValue {
  return useContext(DemoModeContext);
}
