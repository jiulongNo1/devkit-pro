/**
 * ProgrammerCalc - 程序员计算器模块
 * 
 * 【功能说明】
 * - 基础计算器：加减乘除、括号、取模、求幂
 * - 进制转换：HEX / DEC / OCT / BIN 四种进制实时转换
 * - 位操作：AND、OR、XOR、NOT、左移、右移、滚筒移位
 * - 数据类型：BYTE(8位) / WORD(16位) / DWORD(32位) / QWORD(64位)
 * - 运算历史记录：最近20条记录
 * - 键盘快捷键支持
 * 
 * 【设计说明 for C++/Qt 开发者】
 * - 类似于 Windows 计算器的程序员模式
 * - 使用 React useState 管理状态，类似于 Qt 的 Q_PROPERTY
 * - 使用 useCallback 缓存函数，类似于 Qt 的 Q_SLOT
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { RotateCcw, ArrowLeftRight, Hash, Type } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { useHistory } from '../../hooks/useHistory';

type NumberBase = 'DEC' | 'HEX' | 'OCT' | 'BIN';
type DataType = 'BYTE' | 'WORD' | 'DWORD' | 'QWORD';

const DATA_TYPE_BITS: Record<DataType, number> = {
  BYTE: 8,
  WORD: 16,
  DWORD: 32,
  QWORD: 64,
};

interface HistoryItem {
  expression: string;
  result: string;
}

const MODULE_ID = 'programmerCalc';
const MODULE_NAME = '程序员计算器';

export default function ProgrammerCalc() {
  const [currentBase, setCurrentBase] = useState<NumberBase>('DEC');
  const [dataType, setDataType] = useState<DataType>('QWORD');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [calculating, setCalculating] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const toast = useToast();
  const { addHistory } = useHistory();

  const maxBits = DATA_TYPE_BITS[dataType];

  const value = useMemo(() => {
    const num = parseInt(display, getBaseValue(currentBase));
    return isNaN(num) ? 0 : truncateToBits(num, maxBits);
  }, [display, currentBase, maxBits]);

  function getBaseValue(base: NumberBase): number {
    switch (base) {
      case 'HEX': return 16;
      case 'OCT': return 8;
      case 'BIN': return 2;
      default: return 10;
    }
  }

  function formatNumber(num: bigint | number, base: NumberBase): string {
    const n = typeof num === 'number' ? BigInt(num) : num;
    switch (base) {
      case 'HEX': return n.toString(16).toUpperCase();
      case 'OCT': return n.toString(8);
      case 'BIN': return n.toString(2);
      default: return n.toString(10);
    }
  }

  function truncateToBits(num: number, bits: number): number {
    const maxVal = (1 << bits) - 1;
    return num & maxVal;
  }

  const decValue = formatNumber(value, 'DEC');
  const hexValue = formatNumber(value, 'HEX');
  const octValue = formatNumber(value, 'OCT');
  const binValue = formatNumber(value, 'BIN').padStart(maxBits, '0');

  const handleNumberInput = useCallback((digit: string) => {
    if (calculating) {
      setDisplay(digit);
      setExpression('');
      setCalculating(false);
      return;
    }

    const isValidForBase = () => {
      switch (currentBase) {
        case 'HEX': return /^[0-9A-F]$/.test(digit);
        case 'OCT': return /^[0-7]$/.test(digit);
        case 'BIN': return /^[01]$/.test(digit);
        default: return /^[0-9]$/.test(digit);
      }
    };

    if (!isValidForBase()) return;

    if (display === '0' || display === '') {
      setDisplay(digit);
    } else {
      setDisplay(display + digit);
    }
  }, [currentBase, display, calculating]);

  const handleOperator = useCallback((op: string) => {
    if (calculating) {
      setExpression(display + ' ' + op);
      setCalculating(false);
      return;
    }
    setExpression(expression + ' ' + display + ' ' + op);
    setDisplay('0');
  }, [display, expression, calculating]);

  const handleCalculate = useCallback(() => {
    const fullExpr = expression + ' ' + display;
    try {
      const safeExpr = fullExpr
        .replace(/\^/g, '**')
        .replace(/MOD/g, '%')
        .replace(/AND/g, '&')
        .replace(/OR/g, '|')
        .replace(/XOR/g, '^')
        .replace(/NOT/g, '~')
        .replace(/<<</g, '<<')
        .replace(/>>>/g, '>>>');

      const result = eval(safeExpr);
      const truncated = truncateToBits(result, maxBits);
      const newDisplay = formatNumber(truncated, currentBase);
      
      setDisplay(newDisplay);
      setExpression('');
      setCalculating(true);

      setHistory(prev => [{ expression: fullExpr, result: truncated.toString() }, ...prev].slice(0, 20));

      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: fullExpr,
        output: truncated.toString(),
      });

    } catch {
      toast.error('表达式错误');
    }
  }, [expression, display, currentBase, maxBits, toast, addHistory]);

  const handleClear = useCallback(() => {
    setDisplay('0');
    setExpression('');
    setCalculating(false);
  }, []);

  const handleClearEntry = useCallback(() => {
    setDisplay('0');
  }, []);

  const handleBackspace = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  const handleBitToggle = useCallback((bitIndex: number) => {
    const bits = binValue.split('');
    bits[maxBits - 1 - bitIndex] = bits[maxBits - 1 - bitIndex] === '0' ? '1' : '0';
    const newBin = bits.join('');
    const newValue = parseInt(newBin, 2);
    setDisplay(formatNumber(newValue, currentBase));
  }, [binValue, maxBits, currentBase]);

  const handleBitOperation = useCallback((op: string) => {
    let result: number;
    switch (op) {
      case 'NOT':
        result = truncateToBits(~value, maxBits);
        break;
      case 'ROL':
        result = truncateToBits(((value << 1) | (value >> (maxBits - 1))), maxBits);
        break;
      case 'ROR':
        result = truncateToBits(((value >> 1) | ((value & 1) << (maxBits - 1))), maxBits);
        break;
      case 'SHL':
        result = truncateToBits(value << 1, maxBits);
        break;
      case 'SHR':
        result = truncateToBits(value >> 1, maxBits);
        break;
      case '1/x':
        result = 1 / value;
        break;
      case 'x²':
        result = value * value;
        break;
      case 'x³':
        result = value * value * value;
        break;
      case '√x':
        result = Math.sqrt(value);
        break;
      case 'MOD':
        setExpression(expression + ' ' + display + ' MOD');
        setDisplay('0');
        return;
      case 'AND':
      case 'OR':
      case 'XOR':
        setExpression(expression + ' ' + display + ' ' + op);
        setDisplay('0');
        return;
      default:
        return;
    }

    const truncated = truncateToBits(Math.floor(result), maxBits);
    setDisplay(formatNumber(truncated, currentBase));
    setCalculating(true);

    setHistory(prev => [{ expression: `${display} ${op}`, result: truncated.toString() }, ...prev].slice(0, 20));
  }, [value, maxBits, display, currentBase, expression]);

  const handleBaseChange = useCallback((base: NumberBase) => {
    setCurrentBase(base);
    setDisplay(formatNumber(value, base));
  }, [value]);

  const handleDataTypeChange = useCallback((type: DataType) => {
    setDataType(type);
    const newBits = DATA_TYPE_BITS[type];
    const truncated = truncateToBits(value, newBits);
    setDisplay(formatNumber(truncated, currentBase));
  }, [value, currentBase]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toUpperCase();
      
      if (/^[0-9]$/.test(key)) {
        handleNumberInput(key);
      } else if (/^[A-F]$/.test(key) && currentBase === 'HEX') {
        handleNumberInput(key);
      } else if (key === 'ENTER') {
        e.preventDefault();
        handleCalculate();
      } else if (key === 'ESCAPE') {
        handleClear();
      } else if (key === 'BACKSPACE') {
        handleBackspace();
      } else if (key === '+' || key === '-' || key === '*' || key === '/') {
        handleOperator(key);
      } else if (key === '%') {
        handleBitOperation('MOD');
      } else if (key === '^') {
        handleOperator('^');
      } else if (key === '(') {
        setExpression(prev => prev + '(');
      } else if (key === ')') {
        setExpression(prev => prev + ')');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNumberInput, handleCalculate, handleClear, handleBackspace, handleOperator, currentBase]);

  const numberButtons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'A', 'B', 'C', 'D', 'E', 'F'];
  const operatorButtons = ['/', '*', '-', '+', '^', '(', ')', '='];
  const bitOpButtons = [
    { label: 'AND', color: 'purple' },
    { label: 'OR', color: 'purple' },
    { label: 'XOR', color: 'purple' },
    { label: 'NOT', color: 'purple' },
    { label: 'ROL', color: 'purple' },
    { label: 'ROR', color: 'purple' },
    { label: '<<', color: 'purple' },
    { label: '>>', color: 'purple' },
  ];
  const funcButtons = [
    { label: 'C', action: 'clear', color: 'red' },
    { label: 'CE', action: 'clearEntry', color: 'gray' },
    { label: '⌫', action: 'backspace', color: 'gray' },
    { label: '1/x', action: '1/x', color: 'gray' },
    { label: 'x²', action: 'x²', color: 'gray' },
    { label: '√x', action: '√x', color: 'gray' },
    { label: 'x³', action: 'x³', color: 'gray' },
    { label: 'MOD', action: 'MOD', color: 'gray' },
  ];

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      <div className="module-header">
        <h2>程序员计算器</h2>
        <p>进制转换 · 位操作 · 科学计算</p>
      </div>

      <div className="tool-panel" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: 'var(--muted)', flexShrink: 0 }}>表达式:</div>
          <div style={{ fontSize: 14, color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>
            {expression || '输入表达式...'}
          </div>
        </div>

        <div style={{
          fontSize: 32,
          fontFamily: 'var(--font-mono)',
          textAlign: 'right',
          padding: '12px 16px',
          background: 'var(--bg3)',
          borderRadius: 'var(--radius-md)',
          marginBottom: 12,
          minHeight: 56,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          wordBreak: 'break-all'
        }}>
          {display}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          <div style={{
            padding: 8,
            background: 'var(--bg3)',
            borderRadius: 6,
            border: currentBase === 'HEX' ? '2px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => handleBaseChange('HEX')}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>HEX</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', marginTop: 2 }}>0x{hexValue}</div>
          </div>
          <div style={{
            padding: 8,
            background: 'var(--bg3)',
            borderRadius: 6,
            border: currentBase === 'DEC' ? '2px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => handleBaseChange('DEC')}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>DEC</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', marginTop: 2 }}>{decValue}</div>
          </div>
          <div style={{
            padding: 8,
            background: 'var(--bg3)',
            borderRadius: 6,
            border: currentBase === 'OCT' ? '2px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => handleBaseChange('OCT')}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>OCT</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', marginTop: 2 }}>0o{octValue}</div>
          </div>
          <div style={{
            padding: 8,
            background: 'var(--bg3)',
            borderRadius: 6,
            border: currentBase === 'BIN' ? '2px solid var(--accent)' : '1px solid var(--border)',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }} onClick={() => handleBaseChange('BIN')}>
            <div style={{ fontSize: 10, color: 'var(--muted)' }}>BIN</div>
            <div style={{ fontSize: 14, fontFamily: 'var(--font-mono)', marginTop: 2, wordBreak: 'break-all' }}>{binValue.slice(-16)}</div>
          </div>
        </div>

        {maxBits <= 64 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Type size={14} />
              二进制位（点击切换）
            </div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(8, 1fr)',
              gap: 2,
              maxHeight: 120,
              overflowY: 'auto',
              padding: 8,
              background: 'var(--bg3)',
              borderRadius: 6
            }}>
              {Array.from({ length: maxBits }).map((_, i) => {
                const bit = binValue[maxBits - 1 - i];
                return (
                  <button
                    key={i}
                    onClick={() => handleBitToggle(i)}
                    style={{
                      width: '100%',
                      aspectRatio: '1',
                      borderRadius: 4,
                      border: '1px solid var(--border)',
                      background: bit === '1' ? 'var(--accent)' : 'var(--bg2)',
                      color: bit === '1' ? '#fff' : 'var(--muted)',
                      fontSize: 10,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600
                    }}
                    title={`Bit ${maxBits - 1 - i}`}
                  >
                    {bit}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="tool-panel" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <Hash size={14} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>数据类型</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {(['BYTE', 'WORD', 'DWORD', 'QWORD'] as DataType[]).map(type => (
            <button
              key={type}
              onClick={() => handleDataTypeChange(type)}
              className={dataType === type ? '' : 'secondary'}
              style={{ padding: '6px 16px', fontSize: 12 }}
            >
              {type} ({DATA_TYPE_BITS[type]}位)
            </button>
          ))}
        </div>
      </div>

      <div className="tool-panel" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ArrowLeftRight size={14} color="var(--accent)" />
          <span style={{ fontSize: 14, fontWeight: 500 }}>位操作</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {bitOpButtons.map(({ label, color }) => (
            <button
              key={label}
              onClick={() => handleBitOperation(label === '<<' ? 'SHL' : label === '>>' ? 'SHR' : label)}
              style={{
                padding: 12,
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: color === 'purple' ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg2)',
                color: color === 'purple' ? '#8b5cf6' : 'var(--ink)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = color === 'purple' ? 'rgba(139, 92, 246, 0.3)' : 'var(--bg3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = color === 'purple' ? 'rgba(139, 92, 246, 0.2)' : 'var(--bg2)';
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="tool-panel" style={{ padding: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 8 }}>
          {funcButtons.map(({ label, action }) => (
            <button
              key={label}
              onClick={() => {
                if (action === 'clear') handleClear();
                else if (action === 'clearEntry') handleClearEntry();
                else if (action === 'backspace') handleBackspace();
                else handleBitOperation(action);
              }}
              style={{
                padding: 12,
                fontSize: 12,
                fontWeight: 500,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: action === 'clear' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg2)',
                color: action === 'clear' ? '#ef4444' : 'var(--ink)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = action === 'clear' ? 'rgba(239, 68, 68, 0.3)' : 'var(--bg3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = action === 'clear' ? 'rgba(239, 68, 68, 0.2)' : 'var(--bg2)';
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {numberButtons.map(digit => {
            const isValid = currentBase === 'HEX' || /^[0-9]$/.test(digit);
            return (
              <button
                key={digit}
                onClick={() => handleNumberInput(digit)}
                disabled={!isValid}
                style={{
                  padding: 16,
                  fontSize: 16,
                  fontWeight: 600,
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  cursor: isValid ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  background: isValid ? 'var(--bg2)' : 'var(--bg3)',
                  color: isValid ? 'var(--ink)' : 'var(--muted)',
                  opacity: isValid ? 1 : 0.5,
                }}
                onMouseEnter={e => {
                  if (isValid) e.currentTarget.style.background = 'var(--bg3)';
                }}
                onMouseLeave={e => {
                  if (isValid) e.currentTarget.style.background = 'var(--bg2)';
                }}
              >
                {digit}
              </button>
            );
          })}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
          {operatorButtons.map(op => (
            <button
              key={op}
              onClick={() => op === '=' ? handleCalculate() : handleOperator(op)}
              style={{
                padding: 16,
                fontSize: 16,
                fontWeight: 600,
                borderRadius: 'var(--radius-sm)',
                border: 'none',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: op === '=' ? 'var(--accent)' : 'rgba(59, 130, 246, 0.2)',
                color: op === '=' ? '#fff' : '#3b82f6',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = op === '=' ? 'var(--accent-hover)' : 'rgba(59, 130, 246, 0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = op === '=' ? 'var(--accent)' : 'rgba(59, 130, 246, 0.2)';
              }}
            >
              {op}
            </button>
          ))}
        </div>
      </div>

      {history.length > 0 && (
        <div className="tool-panel" style={{ marginTop: 16, padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <RotateCcw size={14} color="var(--accent)" />
            <span style={{ fontSize: 14, fontWeight: 500 }}>运算历史</span>
            <button
              onClick={() => setHistory([])}
              className="secondary"
              style={{ marginLeft: 'auto', fontSize: 12, padding: '4px 8px' }}
            >
              清空
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 200, overflowY: 'auto' }}>
            {history.map((item, i) => (
              <div
                key={i}
                style={{
                  padding: 8,
                  background: 'var(--bg3)',
                  borderRadius: 6,
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ color: 'var(--muted)' }}>{item.expression}</span>
                <span style={{ color: 'var(--accent)', fontWeight: 500 }}>= {item.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}