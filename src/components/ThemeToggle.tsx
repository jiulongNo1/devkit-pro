import { Sun, Moon, Monitor } from 'lucide-react';
import type { Theme } from '../types';

interface Props {
  theme: Theme;
  onChange: (theme: Theme) => void;
}

const icons: Record<Theme, React.ReactNode> = {
  light: <Sun size={16} />,
  dark: <Moon size={16} />,
  system: <Monitor size={16} />,
};

const labels: Record<Theme, string> = {
  light: '浅色',
  dark: '深色',
  system: '跟随系统',
};

export default function ThemeToggle({ theme, onChange }: Props) {
  return (
    <button className="theme-toggle" onClick={() => {
      const order: Theme[] = ['light', 'dark', 'system'];
      const next = order[(order.indexOf(theme) + 1) % order.length];
      onChange(next);
    }}>
      {icons[theme]}
      <span>{labels[theme]}</span>
    </button>
  );
}
