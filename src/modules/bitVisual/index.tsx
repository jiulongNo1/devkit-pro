/**
 * BitVisual - 位操作可视化模块
 *
 * 【功能说明】
 * - 数值 A/B 输入（支持 DEC/HEX）
 * - 运算符选择（AND/OR/XOR/NOT/左移/右移）
 * - 64 位二进制格子可视化
 * - 点击格子切换 0/1
 * - 鼠标悬停显示位号和权重
 * - 变化的位高亮标注
 * - 常见位操作示例
 */

import { useState, useMemo, useCallback } from 'react';
import { Binary, ArrowRight, Copy, Check, Lightbulb } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

type BitWidth = 8 | 16 | 32 | 64;
type Operator = 'AND' | 'OR' | 'XOR' | 'NOT' | 'LSH' | 'RSH';
type InputMode = 'dec' | 'hex';

// 运算符图标映射
const OperatorIcon = ({ op }: { op: Operator }) => {
  switch (op) {
    case 'AND': return <span style={{ fontWeight: 700 }}>&</span>;
    case 'OR': return <span style={{ fontWeight: 700 }}>|</span>;
    case 'XOR': return <span style={{ fontWeight: 700 }}>^</span>;
    case 'NOT': return <span style={{ fontWeight: 700 }}>~</span>;
    case 'LSH': return <ArrowRight size={20} />;
    case 'RSH': return <ArrowRight size={20} style={{ transform: 'rotate(180deg)' }} />;
    default: return null;
  }
};

// 常见位操作示例
const EXAMPLES = [
  { name: '提取第 N 位', desc: '(x >> n) & 1', a: '0xAB', b: '4', op: 'AND' as Operator },
  { name: '设置第 N 位', desc: 'x | (1 << n)', a: '0xA0', b: '3', op: 'OR' as Operator },
  { name: '清除第 N 位', desc: 'x & ~(1 << n)', a: '0xFF', b: '2', op: 'AND' as Operator },
  { name: '取反第 N 位', desc: 'x ^ (1 << n)', a: '0xF0', b: '3', op: 'XOR' as Operator },
  { name: '掩码操作', desc: 'x & 0xFF', a: '0xABCD', b: '0xFF', op: 'AND' as Operator },
];

export default function BitVisual() {
  const [bitWidth, setBitWidth] = useState<BitWidth>(32);
  const [inputModeA, setInputModeA] = useState<InputMode>('hex');
  const [inputModeB, setInputModeB] = useState<InputMode>('hex');
  const [valueAInput, setValueAInput] = useState('0xABCD1234');
  const [valueBInput, setValueBInput] = useState('0x00FF00FF');
  const [operator, setOperator] = useState<Operator>('AND');
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  // 解析输入值
  const parseValue = (input: string, mode: InputMode, width: BitWidth): bigint => {
    const trimmed = input.trim();
    if (!trimmed) return BigInt(0);

    try {
      let value: bigint;
      if (mode === 'hex') {
        // 支持 0x 前缀或纯十六进制
        const hex = trimmed.startsWith('0x') || trimmed.startsWith('0X')
          ? trimmed.slice(2)
          : trimmed;
        value = BigInt('0x' + hex.replace(/[^0-9A-Fa-f]/g, ''));
      } else {
        value = BigInt(trimmed.replace(/[^0-9-]/g, ''));
      }

      // 截断到指定宽度
      const mask = (BigInt(1) << BigInt(width)) - BigInt(1);
      return value & mask;
    } catch {
      return BigInt(0);
    }
  };

  // 计算数值
  const valueA = useMemo(() => parseValue(valueAInput, inputModeA, bitWidth), [valueAInput, inputModeA, bitWidth]);
  const valueB = useMemo(() => parseValue(valueBInput, inputModeB, bitWidth), [valueBInput, inputModeB, bitWidth]);

  // 计算结果
  const result = useMemo(() => {
    const mask = (BigInt(1) << BigInt(bitWidth)) - BigInt(1);

    switch (operator) {
      case 'AND': return valueA & valueB;
      case 'OR': return valueA | valueB;
      case 'XOR': return valueA ^ valueB;
      case 'NOT': return (~valueA) & mask;
      case 'LSH': {
        const shift = Number(valueB);
        if (shift < 0 || shift >= bitWidth) return BigInt(0);
        return (valueA << BigInt(shift)) & mask;
      }
      case 'RSH': {
        const shift = Number(valueB);
        if (shift < 0 || shift >= bitWidth) return BigInt(0);
        return valueA >> BigInt(shift);
      }
      default: return valueA;
    }
  }, [valueA, valueB, operator, bitWidth]);

  // 转换为二进制字符串
  const toBinaryString = (value: bigint, width: BitWidth): string => {
    return value.toString(2).padStart(width, '0');
  };

  const binaryA = useMemo(() => toBinaryString(valueA, bitWidth), [valueA, bitWidth]);
  const binaryB = useMemo(() => toBinaryString(valueB, bitWidth), [valueB, bitWidth]);
  const binaryResult = useMemo(() => toBinaryString(result, bitWidth), [result, bitWidth]);

  // 计算变化的位
  const changedBits = useMemo(() => {
    const changes: Array<{ index: number; from: number; to: number }> = [];
    for (let i = 0; i < bitWidth; i++) {
      const bitA = Number((valueA >> BigInt(i)) & BigInt(1));
      const bitR = Number((result >> BigInt(i)) & BigInt(1));
      if (bitA !== bitR) {
        changes.push({ index: i, from: bitA, to: bitR });
      }
    }
    return changes;
  }, [valueA, result, bitWidth]);

  // 统计变化
  const stats = useMemo(() => {
    const zeroToOne = changedBits.filter(c => c.from === 0 && c.to === 1).length;
    const oneToZero = changedBits.filter(c => c.from === 1 && c.to === 0).length;
    return { zeroToOne, oneToZero, total: changedBits.length };
  }, [changedBits]);

  // 点击格子切换
  const handleBitToggle = useCallback((isValueA: boolean, bitIndex: number) => {
    const bitPos = bitWidth - 1 - bitIndex; // 高位在前显示
    if (isValueA) {
      const newValue = valueA ^ (BigInt(1) << BigInt(bitPos));
      const mask = (BigInt(1) << BigInt(bitWidth)) - BigInt(1);
      const truncated = newValue & mask;
      setValueAInput(inputModeA === 'hex'
        ? '0x' + truncated.toString(16).toUpperCase()
        : truncated.toString());
    } else {
      const newValue = valueB ^ (BigInt(1) << BigInt(bitPos));
      const mask = (BigInt(1) << BigInt(bitWidth)) - BigInt(1);
      const truncated = newValue & mask;
      setValueBInput(inputModeB === 'hex'
        ? '0x' + truncated.toString(16).toUpperCase()
        : truncated.toString());
    }
  }, [bitWidth, valueA, valueB, inputModeA, inputModeB]);

  // 加载示例
  const handleLoadExample = useCallback((ex: typeof EXAMPLES[0]) => {
    setValueAInput(ex.a);
    setValueBInput(ex.b);
    setOperator(ex.op);
    setInputModeA('hex');
    setInputModeB('hex');
    toast.success(`已加载示例：${ex.name}`);
  }, [toast]);

  // 复制
  const handleCopy = useCallback((value: string, key: string) => {
    if (!value) return;
    copyToClipboard(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已复制');
  }, [toast]);

  // 格式化显示
  const formatDec = (val: bigint): string => val.toString();
  const formatHex = (val: bigint, width: BitWidth): string => {
    const hexDigits = Math.ceil(width / 4);
    return '0x' + val.toString(16).toUpperCase().padStart(hexDigits, '0');
  };
  const formatOct = (val: bigint): string => val.toString(8);

  // 渲染位格子
  const renderBitGrid = (binary: string, label: string, isValueA: boolean, showResult?: boolean) => {
    const bits = binary.split('');

    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>{label}</div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(8, 1fr)`,
          gap: 4,
          maxWidth: 8 * 36 + 7 * 4
        }}>
          {bits.map((bit, i) => {
            const bitPos = bitWidth - 1 - i;
            const isChanged = showResult && changedBits.some(c => c.index === bitPos);
            const weight = BigInt(1) << BigInt(bitPos);

            return (
              <button
                key={i}
                onClick={() => handleBitToggle(isValueA, i)}
                title={`位 ${bitPos} | 权重 2^${bitPos} = ${weight.toString()}`}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 4,
                  border: isChanged ? '2px solid var(--accent)' : '1px solid var(--border)',
                  background: bit === '1' ? 'var(--accent)' : 'var(--bg2)',
                  color: bit === '1' ? '#fff' : 'var(--muted)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  animation: isChanged ? 'pulse 0.5s ease-in-out' : 'none',
                  boxShadow: isChanged ? '0 0 8px var(--accent)' : 'none'
                }}
              >
                {bit}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="module-header">
        <h2>位操作可视化</h2>
        <p>二进制位操作 · 可视化对比 · 实时交互</p>
      </div>

      <div className="tool-panel">
        {/* 位宽选择 */}
        <div className="tool-row">
          <label>位宽</label>
          <div className="field btn-group" style={{ maxWidth: 260 }}>
            {[8, 16, 32, 64].map(w => (
              <button
                key={w}
                className={bitWidth === w ? '' : 'secondary'}
                onClick={() => setBitWidth(w as BitWidth)}
                style={{ fontSize: 12 }}
              >
                {w}位
              </button>
            ))}
          </div>
        </div>

        {/* 运算符选择 */}
        <div className="tool-row">
          <label>运算</label>
          <div className="field btn-group" style={{ maxWidth: 300 }}>
            {(['AND', 'OR', 'XOR', 'NOT', 'LSH', 'RSH'] as Operator[]).map(op => (
              <button
                key={op}
                className={operator === op ? '' : 'secondary'}
                onClick={() => setOperator(op)}
                style={{ fontSize: 13, fontWeight: 600 }}
              >
                {op === 'LSH' ? '<<' : op === 'RSH' ? '>>' : op}
              </button>
            ))}
          </div>
        </div>

        {/* 数值 A 输入 */}
        <div className="tool-row">
          <label>数值 A</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <div className="btn-group" style={{ maxWidth: 80 }}>
                <button
                  className={inputModeA === 'dec' ? '' : 'secondary'}
                  onClick={() => setInputModeA('dec')}
                  style={{ fontSize: 11 }}
                >
                  DEC
                </button>
                <button
                  className={inputModeA === 'hex' ? '' : 'secondary'}
                  onClick={() => setInputModeA('hex')}
                  style={{ fontSize: 11 }}
                >
                  HEX
                </button>
              </div>
              <input
                type="text"
                value={valueAInput}
                onChange={e => setValueAInput(e.target.value)}
                placeholder={inputModeA === 'hex' ? '0x...' : '十进制数值'}
                style={{
                  flex: 1,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14
                }}
              />
              <div style={{
                padding: '6px 10px',
                background: 'var(--bg3)',
                borderRadius: 4,
                fontSize: 12,
                fontFamily: 'var(--font-mono)',
                color: 'var(--muted)'
              }}>
                {formatHex(valueA, bitWidth)}
              </div>
            </div>
          </div>
        </div>

        {/* 数值 B 输入 */}
        {operator !== 'NOT' && (
          <div className="tool-row">
            <label>
              {operator === 'LSH' || operator === 'RSH' ? '移位位数' : '数值 B'}
            </label>
            <div className="field">
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {operator !== 'LSH' && operator !== 'RSH' && (
                  <div className="btn-group" style={{ maxWidth: 80 }}>
                    <button
                      className={inputModeB === 'dec' ? '' : 'secondary'}
                      onClick={() => setInputModeB('dec')}
                      style={{ fontSize: 11 }}
                    >
                      DEC
                    </button>
                    <button
                      className={inputModeB === 'hex' ? '' : 'secondary'}
                      onClick={() => setInputModeB('hex')}
                      style={{ fontSize: 11 }}
                    >
                      HEX
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={valueBInput}
                  onChange={e => setValueBInput(e.target.value)}
                  placeholder={operator === 'LSH' || operator === 'RSH' ? '0 - ' + (bitWidth - 1) : (inputModeB === 'hex' ? '0x...' : '十进制数值')}
                  style={{
                    flex: 1,
                    fontFamily: 'var(--font-mono)',
                    fontSize: 14
                  }}
                />
                {operator !== 'LSH' && operator !== 'RSH' && (
                  <div style={{
                    padding: '6px 10px',
                    background: 'var(--bg3)',
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--muted)'
                  }}>
                    {formatHex(valueB, bitWidth)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 示例按钮 */}
        <div className="tool-row">
          <label>常见操作</label>
          <div className="field">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
              gap: 8
            }}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => handleLoadExample(ex)}
                  style={{
                    padding: 8,
                    fontSize: 12,
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s'
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 2 }}>{ex.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
                    {ex.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 可视化区域 */}
      <div className="tool-panel" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Binary size={18} color="var(--accent)" />
          二进制位可视化
        </h3>

        {/* 数值 A 的位格子 */}
        {renderBitGrid(binaryA, `数值 A (${formatHex(valueA, bitWidth)})`, true)}

        {/* 运算符显示 */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 8,
          marginBottom: 8
        }}>
          <div style={{
            fontSize: 24,
            fontWeight: 700,
            color: 'var(--accent)',
            background: 'var(--bg3)',
            padding: '8px 16px',
            borderRadius: 6,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <OperatorIcon op={operator} />
          </div>
        </div>

        {/* 数值 B 的位格子（非 NOT 和移位运算） */}
        {operator !== 'NOT' && operator !== 'LSH' && operator !== 'RSH' && (
          renderBitGrid(binaryB, `数值 B (${formatHex(valueB, bitWidth)})`, false)
        )}

        {/* 移位位数显示 */}
        {(operator === 'LSH' || operator === 'RSH') && (
          <div style={{
            textAlign: 'center',
            padding: 12,
            background: 'var(--bg3)',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 16,
            fontWeight: 600,
            color: 'var(--ink)'
          }}>
            移位 {Number(valueB)} 位
            {operator === 'LSH' ? ' ← 左移' : ' → 右移'}
          </div>
        )}

        {/* 结果的位格子 */}
        {renderBitGrid(binaryResult, `运算结果 (${formatHex(result, bitWidth)})`, false, true)}

        {/* 变化统计 */}
        {stats.total > 0 && (
          <div style={{
            background: 'var(--bg3)',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
              <Lightbulb size={14} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              位变化统计
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--accent)' }}>{stats.zeroToOne}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>位 0→1</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: '#f97316' }}>{stats.oneToZero}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>位 1→0</span>
              </div>
              <div>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--ink)' }}>{stats.total}</span>
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 4 }}>位变化</span>
              </div>
            </div>
          </div>
        )}

        {/* 结果显示 */}
        <div style={{
          background: 'var(--bg3)',
          padding: 16,
          borderRadius: 6
        }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>运算结果：</div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12
          }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>DEC（十进制）</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--bg2)',
                borderRadius: 4
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)'
                }}>
                  {formatDec(result)}
                </span>
                <button
                  onClick={() => handleCopy(formatDec(result), 'dec')}
                  style={{
                    padding: 2,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copied === 'dec' ? 'var(--accent)' : 'var(--muted)'
                  }}
                >
                  {copied === 'dec' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>HEX（十六进制）</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--bg2)',
                borderRadius: 4
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--accent)'
                }}>
                  {formatHex(result, bitWidth)}
                </span>
                <button
                  onClick={() => handleCopy(formatHex(result, bitWidth), 'hex')}
                  style={{
                    padding: 2,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copied === 'hex' ? 'var(--accent)' : 'var(--muted)'
                  }}
                >
                  {copied === 'hex' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>OCT（八进制）</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--bg2)',
                borderRadius: 4
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 14,
                  fontWeight: 600,
                  color: 'var(--ink)'
                }}>
                  {formatOct(result)}
                </span>
                <button
                  onClick={() => handleCopy(formatOct(result), 'oct')}
                  style={{
                    padding: 2,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copied === 'oct' ? 'var(--accent)' : 'var(--muted)'
                  }}
                >
                  {copied === 'oct' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>BIN（二进制）</div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: 8,
                background: 'var(--bg2)',
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <span style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--ink)',
                  wordBreak: 'break-all',
                  flex: 1
                }}>
                  {binaryResult.length > 16 ? '...' + binaryResult.slice(-16) : binaryResult}
                </span>
                <button
                  onClick={() => handleCopy(binaryResult, 'bin')}
                  style={{
                    padding: 2,
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    color: copied === 'bin' ? 'var(--accent)' : 'var(--muted)'
                  }}
                >
                  {copied === 'bin' ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS 动画 */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
    </div>
  );
}