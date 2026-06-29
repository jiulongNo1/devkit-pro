/**
 * Home - 首页 Dashboard 模块
 * 
 * 【功能说明】
 * - 欢迎语和简介
 * - 所有工具模块的卡片式快捷入口
 * - 最近使用历史记录
 * - 快捷操作区（一键复制时间戳、生成随机字符串等）
 * 
 * 【设计说明 for C++/Qt 开发者】
 * - 类似于 Qt 的 QMainWindow 中央控件或 Dashboard 仪表盘
 * - 使用卡片式布局，类似于 QGridLayout + QGroupBox
 * - 响应式 3 列布局，移动端自动调整为单列
 */

import { useState, useMemo, useEffect } from 'react';
import {
  Home as HomeIcon,
  FileJson,
  Regex,
  Code2,
  Clock,
  Palette,
  Lock,
  QrCode,
  Timer,
  BookMarked,
  History,
  Zap,
  Copy,
  RefreshCw,
  Dices,
  Calendar,
  LayoutGrid,
  Calculator,
  FileCode,
  ListOrdered,
  ArrowLeftRight,
  Binary,
  FileJson2,
  Cable,
  Paintbrush,
  HardDrive,
  Languages,
  Database,
  GitCompare
} from 'lucide-react';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';

/**
 * 工具模块配置 - 所有工具的元数据
 * 【设计说明】用数组集中描述所有工具，类似于 Qt 的 QList<QAction*> 或菜单栏配置
 */
const TOOL_MODULES = [
  { id: 'json', name: 'JSON 格式化', icon: FileJson, desc: '美化 / 压缩 / 校验', color: '#3b82f6' },
  { id: 'regex', name: '正则测试', icon: Regex, desc: '实时匹配 / 模板库', color: '#8b5cf6' },
  { id: 'encoder', name: '编码转换', icon: Code2, desc: 'Base64 / URL / HTML', color: '#10b981' },
  { id: 'timestamp', name: '时间戳工具', icon: Clock, desc: '时间戳 / 日期互转', color: '#f59e0b' },
  { id: 'colorTool', name: '颜色工具', icon: Palette, desc: 'HEX / RGB / HSL', color: '#ec4899' },
  { id: 'hashTool', name: '哈希与校验', icon: Lock, desc: 'MD5/SHA/CRC/AES', color: '#06b6d4' },
  { id: 'qrTool', name: '二维码生成', icon: QrCode, desc: '生成 / 自定义 / 下载', color: '#84cc16' },
  { id: 'cronTool', name: 'Cron 工具', icon: Timer, desc: '表达式解析 / 执行时间', color: '#f97316' },
  { id: 'snippetManager', name: '代码片段', icon: BookMarked, desc: '保存 / 搜索 / 管理', color: '#6366f1' },
  { id: 'memoryLayout', name: '内存布局', icon: LayoutGrid, desc: 'Struct 内存可视化', color: '#f43f5e' },
  { id: 'programmerCalc', name: '程序员计算器', icon: Calculator, desc: '进制转换 / 位操作', color: '#0ea5e9' },
  { id: 'cmakeHelper', name: 'CMake 辅助', icon: FileCode, desc: '语法模板 / 实时解析', color: '#8b5cf6' },
  { id: 'enumGenerator', name: 'Enum 生成器', icon: ListOrdered, desc: '枚举定义 / 多语言生成', color: '#f97316' },
  { id: 'byteOrder', name: '字节序转换', icon: ArrowLeftRight, desc: '大端/小端解读 / 翻转', color: '#64748b' },
  { id: 'bitVisual', name: '位操作可视化', icon: Binary, desc: '二进制位操作 / 实时交互', color: '#8b5cf6' },
  { id: 'jsonToStruct', name: 'JSON转Struct', icon: FileJson2, desc: 'JSON解析 / 结构体生成', color: '#3b82f6' },
  { id: 'qtSignals', name: 'Qt信号槽', icon: Cable, desc: '信号槽连接 / 参数匹配', color: '#22c55e' },
  { id: 'qssEditor', name: 'QSS编辑器', icon: Paintbrush, desc: 'QSS编辑 / 实时预览', color: '#ec4899' },
  { id: 'compilerEstimator', name: '资源估算', icon: HardDrive, desc: '内存计算 / 对齐优化', color: '#64748b' },
  { id: 'i18nHelper', name: 'i18n辅助', icon: Languages, desc: '翻译键生成 / 多格式导出', color: '#14b8a6' },
  { id: 'sqlBuilder', name: 'SQL构建', icon: Database, desc: '可视化构建 / Qt代码生成', color: '#0ea5e9' },
  { id: 'versionCompare', name: '版本比较', icon: GitCompare, desc: '版本比较 / 批量排序', color: '#f59e0b' },
];

interface Props {
  onSelectModule: (id: string) => void;
}

/**
 * 生成随机字符串
 */
function generateRandomString(length: number, type: 'alphanumeric' | 'numeric' | 'hex' | 'password'): string {
  let chars = '';
  switch (type) {
    case 'numeric':
      chars = '0123456789';
      break;
    case 'hex':
      chars = '0123456789abcdef';
      break;
    case 'password':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      break;
    default:
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  }
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 格式化时间
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

export default function Home({ onSelectModule }: Props) {
  const { history } = useHistory();
  const toast = useToast();

  // 当前时间戳 - 实时更新
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 最近 5 条历史记录
  const recentHistory = useMemo(() => {
    return history.slice(0, 5);
  }, [history]);

  // 复制到剪贴板
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label}已复制`);
    } catch {
      toast.error('复制失败');
    }
  };

  // 复制当前时间戳（秒级）
  const copyTimestampSeconds = () => {
    handleCopy(Math.floor(currentTimestamp / 1000).toString(), '时间戳');
  };

  // 复制当前时间戳（毫秒级）
  const copyTimestampMs = () => {
    handleCopy(currentTimestamp.toString(), '毫秒时间戳');
  };

  // 生成随机字符串
  const [randomStr, setRandomStr] = useState('');
  const [randomType, setRandomType] = useState<'alphanumeric' | 'numeric' | 'hex' | 'password'>('alphanumeric');
  const [randomLength, setRandomLength] = useState(16);

  const generateRandom = () => {
    setRandomStr(generateRandomString(randomLength, randomType));
  };

  // 初始化时生成一个
  useEffect(() => {
    generateRandom();
  }, [randomType, randomLength]);

  // 格式化当前时间
  const currentTimeStr = useMemo(() => {
    return new Date(currentTimestamp).toLocaleString('zh-CN');
  }, [currentTimestamp]);

  return (
    <div>
      {/* 欢迎语区域 */}
      <div className="module-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: 'linear-gradient(135deg, var(--accent), #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <HomeIcon size={24} color="#fff" />
          </div>
          <div>
            <h2 style={{ margin: 0 }}>欢迎使用 DevKit Pro</h2>
            <p style={{ margin: '4px 0 0 0', fontSize: 14 }}>开发者效率工具箱 · 一站式开发辅助工具</p>
          </div>
        </div>
      </div>

      {/* 快捷操作区 */}
      <div className="tool-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <Zap size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 16 }}>快捷操作</h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {/* 当前时间戳 */}
          <div
            style={{
              padding: 16,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Calendar size={16} color="var(--accent)" />
              <span style={{ fontWeight: 500, fontSize: 14 }}>当前时间</span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{currentTimeStr}</div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '8px 12px',
              background: 'var(--bg3)',
              borderRadius: 6,
              marginBottom: 10,
              wordBreak: 'break-all'
            }}>
              {Math.floor(currentTimestamp / 1000)}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={copyTimestampSeconds} style={{ flex: 1, fontSize: 12 }}>
                <Copy size={12} />
                秒级
              </button>
              <button className="secondary" onClick={copyTimestampMs} style={{ flex: 1, fontSize: 12 }}>
                <Copy size={12} />
                毫秒级
              </button>
            </div>
          </div>

          {/* 随机字符串生成 */}
          <div
            style={{
              padding: 16,
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg2)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Dices size={16} color="var(--accent)" />
              <span style={{ fontWeight: 500, fontSize: 14 }}>随机字符串</span>
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <select
                value={randomType}
                onChange={e => setRandomType(e.target.value as any)}
                style={{ flex: 1, fontSize: 12 }}
              >
                <option value="alphanumeric">字母数字</option>
                <option value="numeric">纯数字</option>
                <option value="hex">十六进制</option>
                <option value="password">强密码</option>
              </select>
              <select
                value={randomLength}
                onChange={e => setRandomLength(Number(e.target.value))}
                style={{ width: 80, fontSize: 12 }}
              >
                {[8, 12, 16, 24, 32].map(n => (
                  <option key={n} value={n}>{n}位</option>
                ))}
              </select>
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              padding: '8px 12px',
              background: 'var(--bg3)',
              borderRadius: 6,
              marginBottom: 10,
              wordBreak: 'break-all',
              minHeight: 36
            }}>
              {randomStr || '-'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="secondary" onClick={generateRandom} style={{ flex: 1, fontSize: 12 }}>
                <RefreshCw size={12} />
                重新生成
              </button>
              <button
                onClick={() => handleCopy(randomStr, '随机字符串')}
                style={{ flex: 1, fontSize: 12 }}
              >
                <Copy size={12} />
                复制
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 工具卡片网格 */}
      <div className="tool-panel" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <HomeIcon size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 16 }}>所有工具</h3>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 12
          }}
        >
          {TOOL_MODULES.map(tool => {
            const Icon = tool.icon;
            return (
              <button
                key={tool.id}
                onClick={() => onSelectModule(tool.id)}
                style={{
                  textAlign: 'left',
                  padding: 16,
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg2)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: `${tool.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Icon size={20} color={tool.color} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{tool.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{tool.desc}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 最近使用历史 */}
      <div className="tool-panel">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <History size={18} color="var(--accent)" />
          <h3 style={{ margin: 0, fontSize: 16 }}>最近使用</h3>
        </div>

        {recentHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
            <History size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
            <p style={{ margin: 0, fontSize: 14 }}>暂无使用记录</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentHistory.map(item => {
              const tool = TOOL_MODULES.find(t => t.id === item.moduleId);
              const Icon = tool?.icon || Code2;
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectModule(item.moduleId)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    background: 'var(--bg2)',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--accent)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: `${tool?.color || '#666'}15`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={16} color={tool?.color || 'var(--muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 2 }}>
                      {item.moduleName}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--muted)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {item.input.length > 50 ? item.input.slice(0, 50) + '...' : item.input}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0 }}>
                    {formatTime(item.timestamp)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
