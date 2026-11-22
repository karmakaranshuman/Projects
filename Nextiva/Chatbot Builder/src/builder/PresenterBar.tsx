import { Moon, RotateCcw, Sun } from 'lucide-react';
import { IconButton, Tag } from '../design-system';
import { setTheme, useTheme } from '../theme';
import { SCENARIOS } from './scenarios';
import { useBuilder } from './store';

function ThemeSwitch() {
  const dark = useTheme() === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Dark mode"
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="cb-theme-switch"
      onClick={() => setTheme(dark ? 'light' : 'dark')}
    >
      <Sun className="cb-theme-switch__icon is-sun" size={12} aria-hidden />
      <Moon className="cb-theme-switch__icon is-moon" size={12} aria-hidden />
      <span className="cb-theme-switch__thumb" aria-hidden>
        {dark ? <Moon size={12} /> : <Sun size={12} />}
      </span>
    </button>
  );
}

export function PresenterBar() {
  const { scenario, screen, loadScenario, restartScenario } = useBuilder();
  const current = screen === 'library' ? 'blank' : scenario;

  return (
    <div className="cb-presenter" role="toolbar" aria-label="Demo scenarios">
      <ThemeSwitch />
      <span className="t-overline t-overline--heavy">Demo</span>
      {SCENARIOS.map((s, i) => (
        <Tag key={s.id} selected={current === s.id} title={`${s.hint} (${i + 1})`} onClick={() => loadScenario(s.id)}>
          {s.label}
        </Tag>
      ))}
      <IconButton label="Restart scenario (R)" size={24} icon={<RotateCcw size={14} />} onClick={restartScenario} />
    </div>
  );
}
