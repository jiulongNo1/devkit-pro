import Sidebar from './Sidebar';
import type { Theme } from '../types';

interface Props {
  children: React.ReactNode;
  activeModule: string;
  onSelectModule: (id: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function Layout({ children, activeModule, onSelectModule, theme, onThemeChange }: Props) {
  return (
    <div className="app-layout">
      <Sidebar
        activeModule={activeModule}
        onSelect={onSelectModule}
        theme={theme}
        onThemeChange={onThemeChange}
      />
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
