type Theme = 'light' | 'dark';

const STORAGE_KEY = 'kaya-theme';

function systemTheme(): Theme {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function stored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    // Private windows and blocked site data both throw here.
    return null;
  }
}

function remember(theme: Theme): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Nothing to do; the choice lasts for this page view only.
  }
}

export function installThemeToggle(button: HTMLElement, label: HTMLElement): void {
  let theme: Theme = stored() ?? systemTheme();

  const apply = () => {
    document.documentElement.dataset['theme'] = theme;
    button.setAttribute('aria-pressed', String(theme === 'dark'));
    label.textContent = theme === 'dark' ? 'Light' : 'Dark';
    button.setAttribute('aria-label', theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };

  apply();
  button.addEventListener('click', () => {
    theme = theme === 'dark' ? 'light' : 'dark';
    remember(theme);
    apply();
  });
}
