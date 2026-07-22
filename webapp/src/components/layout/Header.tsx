import { useTheme } from '../../hooks/useTheme';

export function Header() {
  const { theme, toggle } = useTheme();
  return (
    <header className="topbar">
      <div className="topbar-title">
        <h1>WISE System Log Analyzer</h1>
        <p>Parse and analyze system logs for WISE-4000, 2000, and 4600 series.</p>
      </div>
      <button className="theme-toggle" title="Toggle light/dark theme" onClick={toggle}>
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </header>
  );
}
