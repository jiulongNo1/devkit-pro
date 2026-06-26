export interface ToolModule {
  id: string;
  name: string;
  icon: string;
  description: string;
  component: React.ComponentType;
}

export interface HistoryItem {
  id: string;
  moduleId: string;
  moduleName: string;
  input: string;
  output: string;
  timestamp: number;
}

export type Theme = 'light' | 'dark' | 'system';
