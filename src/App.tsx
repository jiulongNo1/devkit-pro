import { useState } from 'react';
import Layout from './components/Layout';
import JsonFormatter from './modules/jsonFormatter';
import RegexTester from './modules/regexTester';
import Encoder from './modules/encoder';
import TimestampTool from './modules/timestamp';
import { useTheme } from './hooks/useTheme';
import { useHistory } from './hooks/useHistory';

const modules: Record<string, React.ComponentType> = {
  json: JsonFormatter,
  regex: RegexTester,
  encoder: Encoder,
  timestamp: TimestampTool,
};

export default function App() {
  const [activeModule, setActiveModule] = useState('json');
  const { theme, setTheme } = useTheme();
  useHistory();

  const ActiveComponent = modules[activeModule];

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
