# ThemeProvider.tsx

- **Que hace**: React context provider for light/dark theme toggle. Persists to localStorage key `ak-theme`, reads OS preference on first load.
- **Exports**: `ThemeProvider` component, `useTheme()` hook returning `{ theme, toggleTheme, setTheme }`
- **Pitfalls**: Prevents flash of wrong theme by not rendering context value until mounted; adds/removes `dark` class on `<html>` element