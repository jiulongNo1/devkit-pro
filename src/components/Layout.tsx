import { useState } from 'react';
import Sidebar from './Sidebar';
import SettingsPanel from './SettingsPanel';
import type { Theme } from '../types';

interface Props {
  children: React.ReactNode;
  activeModule: string;
  onSelectModule: (id: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
}

export default function Layout({ children, activeModule, onSelectModule, theme, onThemeChange }: Props) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div className="app-layout">
      <Sidebar
        activeModule={activeModule}
        onSelect={onSelectModule}
        theme={theme}
        onThemeChange={onThemeChange}
        onOpenSettings={() => setSettingsOpen(true)}
      />
      <main className="main-content">
        {children}
      </main>
      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}
