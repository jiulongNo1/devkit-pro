import { useState } from 'react';
import Layout from './components/Layout';
import JsonFormatter from './modules/jsonFormatter';
import RegexTester from './modules/regexTester';
import Encoder from './modules/encoder';
import TimestampTool from './modules/timestamp';
import { useTheme } from './hooks/useTheme';
import { HistoryProvider } from './hooks/useHistory';
import { ToastProvider } from './hooks/useToast';
import { ShortcutsProvider, useShortcuts } from './hooks/useShortcuts';

const MODULES = ['json', 'regex', 'encoder', 'timestamp'];
const moduleComponents: Record<string, React.ComponentType> = {
  json: JsonFormatter,
  regex: RegexTester,
  encoder: Encoder,
  timestamp: TimestampTool,
};

function AppContent() {
  const [activeModule, setActiveModule] = useState('json');
  const { theme, setTheme } = useTheme();

  // 注册全局快捷键
  useShortcuts(MODULES, setActiveModule);

  const ActiveComponent = moduleComponents[activeModule];

  return (
    <Layout
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      theme={theme}
      onThemeChange={setTheme}
    >
      <ActiveComponent />
    </Layout>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <ShortcutsProvider>
        <HistoryProvider>
          <AppContent />
        </HistoryProvider>
      </ShortcutsProvider>
    </ToastProvider>
  );
}
