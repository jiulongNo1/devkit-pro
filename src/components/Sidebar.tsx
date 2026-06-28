import { FileJson, Regex, Code2, Clock, FlaskConical, Settings, Palette, Lock, QrCode, Timer, BookMarked, Home, LayoutGrid, Calculator, FileCode, ListOrdered, ArrowLeftRight, Binary } from 'lucide-react';
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
  { id: 'home', name: '首页', icon: Home, desc: '仪表盘 / 快捷入口' },
  { id: 'json', name: 'JSON 格式化', icon: FileJson, desc: '美化 / 压缩 / 校验' },
  { id: 'regex', name: '正则测试', icon: Regex, desc: '实时匹配 / 模板库' },
  { id: 'encoder', name: '编码转换', icon: Code2, desc: 'Base64 / URL / HTML' },
  { id: 'timestamp', name: '时间戳工具', icon: Clock, desc: '时间戳 / 日期互转' },
  { id: 'colorTool', name: '颜色工具', icon: Palette, desc: 'HEX / RGB / HSL' },
  { id: 'hashTool', name: '哈希与校验', icon: Lock, desc: 'MD5/SHA/CRC/AES' },
  { id: 'qrTool', name: '二维码生成', icon: QrCode, desc: '生成 / 自定义 / 下载' },
  { id: 'cronTool', name: 'Cron 工具', icon: Timer, desc: '表达式解析 / 执行时间' },
  { id: 'snippetManager', name: '代码片段', icon: BookMarked, desc: '保存 / 搜索 / 管理' },
  { id: 'memoryLayout', name: '内存布局', icon: LayoutGrid, desc: 'Struct 内存可视化' },
  { id: 'programmerCalc', name: '程序员计算器', icon: Calculator, desc: '进制转换 / 位操作' },
  { id: 'cmakeHelper', name: 'CMake 辅助', icon: FileCode, desc: '语法模板 / 实时解析' },
  { id: 'enumGenerator', name: 'Enum 生成器', icon: ListOrdered, desc: '枚举定义 / 多语言生成' },
  { id: 'byteOrder', name: '字节序转换', icon: ArrowLeftRight, desc: '大端/小端解读 / 翻转' },
  { id: 'bitVisual', name: '位操作可视化', icon: Binary, desc: '二进制位操作 / 实时交互' },
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
