import { create } from 'zustand';

export type Theme = 'light' | 'dark' | 'system';

interface SettingsState {
  theme: Theme;
  resolvedTheme: 'light' | 'dark'; // The actual applied theme
  setTheme: (theme: Theme) => void;
}

function getStoredTheme(): Theme {
  try {
    return (localStorage.getItem('cm_theme') as Theme) || 'system';
  } catch {
    return 'system';
  }
}

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyThemeToDOM(resolved: 'light' | 'dark') {
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

// Initialize on load
const initialTheme = getStoredTheme();
const initialResolved = resolveTheme(initialTheme);
applyThemeToDOM(initialResolved);

export const useSettingsStore = create<SettingsState>((set) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,

  setTheme: (theme) => {
    const resolved = resolveTheme(theme);
    applyThemeToDOM(resolved);
    try {
      localStorage.setItem('cm_theme', theme);
    } catch { /* ignore */ }
    set({ theme, resolvedTheme: resolved });
  },
}));

// Listen for system theme changes
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const { theme } = useSettingsStore.getState();
    if (theme === 'system') {
      const resolved = getSystemTheme();
      applyThemeToDOM(resolved);
      useSettingsStore.setState({ resolvedTheme: resolved });
    }
  });
}
