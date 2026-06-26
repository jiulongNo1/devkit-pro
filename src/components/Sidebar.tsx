import { FileJson, Regex, Code2, Clock, FlaskConical, Settings } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import type { Theme } from '../types';

interface Props {
  activeModule: string;
  onSelect: (id: string) => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  onOpenSettings: () => void;
}

const navItems = [
  { id: 'json', name: 'JSON 格式化', icon: FileJson, desc: '美化 / 压缩 / 校验' },
  { id: 'regex', name: '正则测试', icon: Regex, desc: '实时匹配 / 模板库' },
  { id: 'encoder', name: '编码转换', icon: Code2, desc: 'Base64 / URL / HTML' },
  { id: 'timestamp', name: '时间戳工具', icon: Clock, desc: '时间戳 / 日期互转' },
];

export default function Sidebar({ activeModule, onSelect, theme, onThemeChange, onOpenSettings }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <h1>
          <FlaskConical size={22} color="var(--accent)" />
          DevKit Pro
        </h1>
        <p>开发者效率工具箱</p>
      </div>
      <nav className="sidebar-nav">
        {navItems.map(item => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${activeModule === item.id ? 'active' : ''}`}
              onClick={() => onSelect(item.id)}
              title={item.desc}
            >
              <Icon size={18} />
              <span>{item.name}</span>
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        <button className="theme-toggle" onClick={onOpenSettings}>
          <Settings size={16} />
          <span>设置</span>
        </button>
        <ThemeToggle theme={theme} onChange={onThemeChange} />
      </div>
    </aside>
  );
}
