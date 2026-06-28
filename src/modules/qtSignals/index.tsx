/**
 * QtSignals - Qt 信号槽可视化工具
 *
 * 【功能说明】
 * - Qt 信号槽代码生成器
 * - 信号槽参数类型匹配检查
 * - 常用信号槽模板库
 * - 连接关系图展示
 */

import { useState, useMemo, useCallback } from 'react';
import { Cable, Copy, Check, ChevronDown, ChevronRight, CheckCircle2, XCircle } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// 信号槽模板库
const SIGNAL_TEMPLATES = {
  QPushButton: {
    name: 'QPushButton',
    signals: [
      { name: 'clicked', params: [], desc: '按钮点击（无参数）' },
      { name: 'clicked', params: ['bool checked'], desc: '按钮点击（带选中状态）' },
      { name: 'pressed', params: [], desc: '按钮按下' },
      { name: 'released', params: [], desc: '按钮释放' },
      { name: 'toggled', params: ['bool checked'], desc: '按钮切换状态' },
    ],
  },
  QLineEdit: {
    name: 'QLineEdit',
    signals: [
      { name: 'textChanged', params: ['const QString &'], desc: '文本变化（实时）' },
      { name: 'editingFinished', params: [], desc: '编辑完成（回车/失焦）' },
      { name: 'returnPressed', params: [], desc: '回车键按下' },
      { name: 'selectionChanged', params: [], desc: '选中文本变化' },
      { name: 'cursorPositionChanged', params: ['int', 'int'], desc: '光标位置变化' },
    ],
  },
  QComboBox: {
    name: 'QComboBox',
    signals: [
      { name: 'currentIndexChanged', params: ['int index'], desc: '当前索引变化（int）' },
      { name: 'currentTextChanged', params: ['const QString &'], desc: '当前文本变化' },
      { name: 'activated', params: ['int index'], desc: '激活（用户选择）' },
    ],
  },
  QSlider: {
    name: 'QSlider',
    signals: [
      { name: 'valueChanged', params: ['int value'], desc: '值变化（int）' },
      { name: 'sliderMoved', params: ['int position'], desc: '滑块移动' },
      { name: 'sliderPressed', params: [], desc: '滑块按下' },
      { name: 'sliderReleased', params: [], desc: '滑块释放' },
    ],
  },
  QTimer: {
    name: 'QTimer',
    signals: [
      { name: 'timeout', params: [], desc: '定时器超时' },
    ],
  },
  QNetworkAccessManager: {
    name: 'QNetworkAccessManager',
    signals: [
      { name: 'finished', params: ['QNetworkReply *'], desc: '请求完成' },
      { name: 'finished', params: ['QNetworkReply *reply'], desc: '请求完成（带reply）' },
      { name: 'authenticationRequired', params: ['QNetworkReply *', 'QAuthenticator *'], desc: '需要认证' },
      { name: 'sslErrors', params: ['QNetworkReply *', 'const QList<QSslError> &'], desc: 'SSL错误' },
    ],
  },
};

// 解析参数列表
function parseParams(paramsStr: string): string[] {
  if (!paramsStr.trim()) return [];
  return paramsStr.split(',').map(p => p.trim()).filter(p => p);
}

// 提取参数类型
function extractParamTypes(params: string[]): string[] {
  return params.map(p => {
    // 移除参数名，保留类型
    const parts = p.split(/\s+/);
    if (parts.length >= 1) {
      // 处理指针和引用
      let type = parts[0];
      for (let i = 1; i < parts.length; i++) {
        if (!parts[i].match(/^[a-zA-Z_][a-zA-Z0-9_]*$/)) {
          type += ' ' + parts[i];
        } else {
          break;
        }
      }
      return type;
    }
    return p;
  });
}

// 检查参数匹配
function checkParamMatch(signalParams: string[], slotParams: string[]): {
  valid: boolean;
  issues: { index: number; issue: string }[];
} {
  const issues: { index: number; issue: string }[] = [];

  // 槽函数参数不能比信号多
  if (slotParams.length > signalParams.length) {
    for (let i = signalParams.length; i < slotParams.length; i++) {
      issues.push({ index: i, issue: `槽函数有多余参数 #${i + 1}` });
    }
  }

  // 检查每个信号参数是否有对应的兼容槽参数
  const signalTypes = extractParamTypes(signalParams);
  const slotTypes = extractParamTypes(slotParams);

  const minLen = Math.min(signalTypes.length, slotTypes.length);
  for (let i = 0; i < minLen; i++) {
    const sType = signalTypes[i].replace(/\s*\*\s*/g, '*').replace(/\s*&\s*/g, '&');
    const rType = slotTypes[i].replace(/\s*\*\s*/g, '*').replace(/\s*&\s*/g, '&');

    // 简化匹配：类型名相同或兼容
    const sBase = sType.replace(/^const\s+/, '').replace(/\s*(const)?\s*$/, '').trim();
    const rBase = rType.replace(/^const\s+/, '').replace(/\s*(const)?\s*$/, '').trim();

    if (sBase !== rBase && !isCompatibleType(sBase, rBase)) {
      issues.push({
        index: i,
        issue: `参数类型不匹配: 信号(${sBase}) → 槽(${rBase})`
      });
    }
  }

  return { valid: issues.length === 0, issues };
}

// 简单类型兼容性检查
function isCompatibleType(signal: string, slot: string): boolean {
  // 完全相同
  if (signal === slot) return true;

  // QString 和 const QString& 兼容
  if ((signal.includes('QString') && slot.includes('QString')) ||
      (signal.includes('QVariant') && slot.includes('QVariant'))) {
    return true;
  }

  // bool 兼容
  if (signal === 'bool' && slot === 'bool') return true;

  // int 系列兼容
  if ((signal.includes('int') && slot.includes('int')) ||
      (signal.includes('qint') && slot.includes('qint'))) {
    return true;
  }

  return false;
}

// 生成连接代码
function generateConnectCode(
  senderType: string,
  signal: string,
  receiverType: string,
  slot: string,
  qtVersion: 'qt5' | 'qt6',
  useLambda: boolean
): string {
  const signalMatch = signal.match(/^(.+?)::(.+)$/);
  const slotMatch = slot.match(/^(.+?)::(.+)$/);

  if (!signalMatch) {
    return '// 无效的信号格式';
  }

  const senderClass = signalMatch[1] || senderType;
  const signalName = signalMatch[2];

  if (useLambda) {
    // Lambda 方式
    if (qtVersion === 'qt6') {
      return `connect(sender, &${senderClass}::${signalName},
        [this](/* params */) {
            // 处理信号
        });`;
    } else {
      return `connect(sender, &${senderClass}::${signalName},
        [this](/* params */) {
            // 处理信号
        });`;
    }
  }

  // 传统方式
  if (slotMatch) {
    const receiverClass = slotMatch[1] || receiverType;
    const slotName = slotMatch[2];

    if (qtVersion === 'qt6') {
      return `connect(sender, &${senderClass}::${signalName},
         receiver, &${receiverClass}::${slotName});`;
    } else {
      return `connect(sender, &${senderClass}::${signalName},
         receiver, &${receiverClass}::${slotName});`;
    }
  } else {
    // 裸函数名
    return `connect(sender, &${senderClass}::${signalName},
         this, &Receiver::${slot});`;
  }
}

// 连接记录
interface Connection {
  id: number;
  sender: string;
  signal: string;
  receiver: string;
  slot: string;
  code: string;
}

export default function QtSignals() {
  const [senderType, setSenderType] = useState('QPushButton');
  const [signal, setSignal] = useState('clicked');
  const [signalParams, setSignalParams] = useState('');
  const [receiverType, setReceiverType] = useState('MainWindow');
  const [slot, setSlot] = useState('onButtonClicked');
  const [slotParams, setSlotParams] = useState('');
  const [qtVersion, setQtVersion] = useState<'qt5' | 'qt6'>('qt5');
  const [useLambda, setUseLambda] = useState(false);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('QPushButton');
  const toast = useToast();

  // 记录连接
  const [connections, setConnections] = useState<Connection[]>([]);

  // 参数匹配检查
  const paramCheck = useMemo(() => {
    const signalList = parseParams(signalParams);
    const slotList = parseParams(slotParams);
    return checkParamMatch(signalList, slotList);
  }, [signalParams, slotParams]);

  // 完整信号签名
  const fullSignal = useMemo(() => {
    const params = parseParams(signalParams);
    if (params.length > 0) {
      return `${senderType}::${signal}(${params.join(', ')})`;
    }
    return `${senderType}::${signal}`;
  }, [senderType, signal, signalParams]);

  // 完整槽签名
  const fullSlot = useMemo(() => {
    const params = parseParams(slotParams);
    if (params.length > 0) {
      return `${receiverType}::${slot}(${params.join(', ')})`;
    }
    return `${receiverType}::${slot}`;
  }, [receiverType, slot, slotParams]);

  // 生成的代码
  const generatedCode = useMemo(() => {
    return generateConnectCode(
      senderType,
      fullSignal,
      receiverType,
      fullSlot,
      qtVersion,
      useLambda
    );
  }, [senderType, fullSignal, receiverType, fullSlot, qtVersion, useLambda]);

  // 复制代码
  const handleCopy = useCallback(() => {
    copyToClipboard(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('代码已复制');
  }, [generatedCode, toast]);

  // 添加连接记录
  const handleAddConnection = useCallback(() => {
    const newConn: Connection = {
      id: Date.now(),
      sender: senderType,
      signal: fullSignal,
      receiver: receiverType,
      slot: fullSlot,
      code: generatedCode,
    };
    setConnections(prev => [...prev, newConn]);
    toast.success('连接已添加');
  }, [senderType, fullSignal, receiverType, fullSlot, generatedCode, toast]);

  // 删除连接
  const handleDeleteConnection = useCallback((id: number) => {
    setConnections(prev => prev.filter(c => c.id !== id));
  }, []);

  // 加载模板
  const handleLoadTemplate = useCallback((widget: string, signalTemplate: typeof SIGNAL_TEMPLATES.QPushButton.signals[0]) => {
    setSenderType(widget);
    setSignal(signalTemplate.name);
    setSignalParams(signalTemplate.params.join(', '));
    setExpandedCategory(widget);
    toast.success(`已加载 ${widget}::${signalTemplate.name} 模板`);
  }, [toast]);

  // 复制连接代码
  const handleCopyConnection = useCallback((code: string) => {
    copyToClipboard(code);
    toast.success('代码已复制');
  }, [toast]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>Qt 信号槽可视化</h2>
        <p>信号槽连接生成 · 参数匹配检查 · 模板库</p>
      </div>

      {/* Qt 版本选择 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-row">
          <label>Qt 版本</label>
          <div className="field btn-group">
            <button
              className={qtVersion === 'qt5' ? '' : 'secondary'}
              onClick={() => setQtVersion('qt5')}
            >
              Qt5
            </button>
            <button
              className={qtVersion === 'qt6' ? '' : 'secondary'}
              onClick={() => setQtVersion('qt6')}
            >
              Qt6
            </button>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', marginLeft: 24 }}>
            <input
              type="checkbox"
              checked={useLambda}
              onChange={e => setUseLambda(e.target.checked)}
              style={{ cursor: 'pointer' }}
            />
            使用 Lambda 连接
          </label>
        </div>
      </div>

      {/* 功能区A: 代码生成 + 功能区B: 参数匹配 */}
      <div className="grid-2-col" style={{ marginBottom: 16 }}>
        {/* 左侧: 信号槽输入 */}
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cable size={16} color="var(--accent)" />
            信号槽定义
          </h3>

          {/* 发送者 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>发送者类型</label>
            <input
              type="text"
              value={senderType}
              onChange={e => setSenderType(e.target.value)}
              placeholder="QPushButton"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* 信号 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              信号名 (信号参数)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="text"
                value={signal}
                onChange={e => setSignal(e.target.value)}
                placeholder="clicked"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="text"
                value={signalParams}
                onChange={e => setSignalParams(e.target.value)}
                placeholder="bool checked"
              />
            </div>
          </div>

          {/* 箭头指示 */}
          <div style={{ textAlign: 'center', margin: '12px 0', color: 'var(--muted)' }}>
            <span style={{ fontSize: 20 }}>↓</span>
          </div>

          {/* 接收者 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>接收者类型</label>
            <input
              type="text"
              value={receiverType}
              onChange={e => setReceiverType(e.target.value)}
              placeholder="MainWindow"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>

          {/* 槽 */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>
              槽函数名 (槽参数)
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <input
                type="text"
                value={slot}
                onChange={e => setSlot(e.target.value)}
                placeholder="onButtonClicked"
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <input
                type="text"
                value={slotParams}
                onChange={e => setSlotParams(e.target.value)}
                placeholder="bool checked"
              />
            </div>
          </div>
        </div>

        {/* 右侧: 参数匹配 + 代码预览 */}
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cable size={16} color="var(--accent)" />
            参数匹配检查
          </h3>

          {/* 参数对比 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 40px 1fr',
            gap: 8,
            marginBottom: 16,
            alignItems: 'center'
          }}>
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg3)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 12
            }}>
              信号: {fullSignal.replace(/^.*?::/, '')}
            </div>
            <div style={{ textAlign: 'center' }}>
              {paramCheck.valid ? (
                <CheckCircle2 size={20} color="var(--success)" />
              ) : (
                <XCircle size={20} color="var(--error)" />
              )}
            </div>
            <div style={{
              padding: '8px 12px',
              background: 'var(--bg3)',
              borderRadius: 6,
              fontFamily: 'var(--font-mono)',
              fontSize: 12
            }}>
              槽: {fullSlot.replace(/^.*?::/, '')}
            </div>
          </div>

          {/* 问题列表 */}
          {!paramCheck.valid && (
            <div style={{ marginBottom: 16 }}>
              {paramCheck.issues.map((issue, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '6px 10px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    borderRadius: 4,
                    fontSize: 12,
                    color: 'var(--error)',
                    marginBottom: 4
                  }}
                >
                  <XCircle size={12} style={{ display: 'inline', marginRight: 6 }} />
                  #{issue.index + 1} {issue.issue}
                </div>
              ))}
            </div>
          )}

          {/* 代码预览 */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>生成的代码</label>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              padding: 12,
              background: 'var(--bg3)',
              borderRadius: 6,
              minHeight: 80
            }}>
              {generatedCode}
            </pre>
          </div>

          {/* 操作按钮 */}
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={handleCopy} style={{ flex: 1 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制代码'}
            </button>
            <button className="secondary" onClick={handleAddConnection}>
              添加连接
            </button>
          </div>
        </div>
      </div>

      {/* 功能区C: 模板库 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Cable size={16} color="var(--accent)" />
          常用信号槽模板库
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {Object.entries(SIGNAL_TEMPLATES).map(([key, widget]) => (
            <div
              key={key}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 8,
                overflow: 'hidden'
              }}
            >
              {/* 分类标题 */}
              <button
                onClick={() => setExpandedCategory(expandedCategory === key ? null : key)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'var(--bg2)',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontWeight: 500,
                  fontSize: 13
                }}
              >
                <code style={{ fontSize: 12 }}>{widget.name}</code>
                {expandedCategory === key ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </button>

              {/* 模板列表 */}
              {expandedCategory === key && (
                <div style={{ padding: 8 }}>
                  {widget.signals.map((sig, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleLoadTemplate(widget.name, sig)}
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        background: 'var(--bg3)',
                        border: 'none',
                        borderRadius: 4,
                        textAlign: 'left',
                        cursor: 'pointer',
                        marginBottom: 4,
                        fontSize: 12,
                        transition: 'all 0.15s'
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--accent-bg)';
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--bg3)';
                      }}
                    >
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', marginBottom: 2 }}>
                        {sig.name}({sig.params.join(', ') || 'void'})
                      </div>
                      <div style={{ color: 'var(--muted)', fontSize: 11 }}>
                        {sig.desc}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 功能区D: 连接关系图 */}
      {connections.length > 0 && (
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Cable size={16} color="var(--accent)" />
            连接关系图 ({connections.length})
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {connections.map(conn => (
              <div
                key={conn.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto 1fr auto',
                  gap: 12,
                  alignItems: 'center',
                  padding: 12,
                  background: 'var(--bg2)',
                  borderRadius: 8,
                  border: '1px solid var(--border)'
                }}
              >
                {/* 发送者 */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span style={{ color: 'var(--accent)' }}>{conn.sender}</span>
                </div>

                {/* 信号箭头 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--muted)' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
                    {conn.signal.split('::')[1]}
                  </span>
                  <span>→</span>
                </div>

                {/* 接收者 */}
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                  <span style={{ color: 'var(--success)' }}>{conn.receiver}</span>
                  <span style={{ color: 'var(--muted)' }}>::</span>
                  <span>{conn.slot.split('::')[1]}</span>
                </div>

                {/* 操作 */}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    className="ghost"
                    onClick={() => handleCopyConnection(conn.code)}
                    title="复制代码"
                    style={{ padding: 4 }}
                  >
                    <Copy size={14} />
                  </button>
                  <button
                    className="ghost"
                    onClick={() => handleDeleteConnection(conn.id)}
                    title="删除"
                    style={{ padding: 4, color: 'var(--error)' }}
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* 文本格式展示 */}
          <div style={{ marginTop: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>连接关系文本</label>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              whiteSpace: 'pre-wrap',
              padding: 12,
              background: 'var(--bg3)',
              borderRadius: 6,
              color: 'var(--muted)'
            }}>
              {connections.map(c =>
                `[${c.sender}] --${c.signal.split('::')[1]}()--> [${c.receiver}]::${c.slot.split('::')[1]}()`
              ).join('\n')}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
