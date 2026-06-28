/**
 * Encoder - 编码转换工具
 *
 * 【功能说明】
 * - Base64 / URL / HTML / Unicode 编解码
 * - C++ 字符串编码转换
 * - QString 格式转换
 */

import { useState, useCallback, useMemo } from 'react';
import { Copy, ArrowRightLeft, Code2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import HistoryPanel from '../../components/HistoryPanel';

type EncodeType = 'base64' | 'url' | 'html' | 'unicode' | 'cpp-string' | 'qstring';

const MODULE_ID = 'encoder';
const MODULE_NAME = '编码转换';

// 传统编码器
const ENCODERS: { id: EncodeType; name: string; encode: (s: string) => string; decode: (s: string) => string }[] = [
  {
    id: 'base64',
    name: 'Base64',
    encode: s => btoa(unescape(encodeURIComponent(s))),
    decode: s => decodeURIComponent(escape(atob(s))),
  },
  {
    id: 'url',
    name: 'URL 编码',
    encode: s => encodeURIComponent(s),
    decode: s => decodeURIComponent(s),
  },
  {
    id: 'html',
    name: 'HTML 实体',
    encode: s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]!)),
    decode: s => s.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, e => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }[e]!)),
  },
  {
    id: 'unicode',
    name: 'Unicode',
    encode: s => Array.from(s).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
    decode: s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
  },
];

// Unicode 码点转 UTF-8 字节
function unicodeToUtf8(codePoint: number): number[] {
  if (codePoint <= 0x7F) {
    return [codePoint];
  } else if (codePoint <= 0x7FF) {
    return [
      0xC0 | (codePoint >> 6),
      0x80 | (codePoint & 0x3F),
    ];
  } else if (codePoint <= 0xFFFF) {
    return [
      0xE0 | (codePoint >> 12),
      0x80 | ((codePoint >> 6) & 0x3F),
      0x80 | (codePoint & 0x3F),
    ];
  } else {
    return [
      0xF0 | (codePoint >> 18),
      0x80 | ((codePoint >> 12) & 0x3F),
      0x80 | ((codePoint >> 6) & 0x3F),
      0x80 | (codePoint & 0x3F),
    ];
  }
}

// Unicode 码点转 UTF-16
function unicodeToUtf16(codePoint: number): { le: number[]; be: number[] } {
  if (codePoint <= 0xFFFF) {
    const word = codePoint;
    return {
      le: [word & 0xFF, (word >> 8) & 0xFF],
      be: [(word >> 8) & 0xFF, word & 0xFF],
    };
  } else {
    const surrogate1 = 0xD800 | ((codePoint - 0x10000) >> 10);
    const surrogate2 = 0xDC00 | ((codePoint - 0x10000) & 0x3FF);
    return {
      le: [
        surrogate1 & 0xFF, (surrogate1 >> 8) & 0xFF,
        surrogate2 & 0xFF, (surrogate2 >> 8) & 0xFF,
      ],
      be: [
        (surrogate1 >> 8) & 0xFF, surrogate1 & 0xFF,
        (surrogate2 >> 8) & 0xFF, surrogate2 & 0xFF,
      ],
    };
  }
}

// 简单 GBK 编码
function encodeToGBK(text: string): number[] | null {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (code < 0x80) {
      bytes.push(code);
    } else {
      const gbk = charToGBK(code);
      if (gbk !== null) {
        bytes.push(gbk >> 8, gbk & 0xFF);
      } else {
        return null;
      }
    }
  }
  return bytes;
}

// 简化的 GBK 映射（常用汉字）
function charToGBK(codePoint: number): number | null {
  const GBK_MAP: Record<number, number> = {
    0x4E00: 0xD2BB, // 一
    0x4E8C: 0xB6FE, // 二
    0x4E09: 0xC8FD, // 三
    0x56DB: 0xCBC4, // 四
    0x4E94: 0xCEDE, // 五
    0x516D: 0xC1A2, // 六
    0x4E03: 0xC6DF, // 七
    0x516B: 0xB0CB, // 八
    0x4E5D: 0xBEC5, // 九
    0x5341: 0xCAA3, // 十
    0x4EBA: 0xC8CB, // 人
    0x5927: 0xB4F3, // 大
    0x5C0F: 0xD0A1, // 小
    0x4E2D: 0xD6D0, // 中
    0x6587: 0xCEC4, // 文
    0x5B57: 0xD7D6, // 字
    0x6C49: 0xBABA, // 汉
    0x82F1: 0xD3A2, // 英
    0x4F60: 0xC4FA, // 你
    0x597D: 0xBAC3, // 好
    0x7684: 0xB5C4, // 的
    0x554A: 0xB0A1, // 啊
    0x6625: 0xB4BA, // 春
    0x590F: 0xCFC2, // 夏
    0x79CB: 0xC8D5, // 秋
    0x51AC: 0xB6AB, // 冬
  };
  return GBK_MAP[codePoint] ?? null;
}

// C++ 字符串编码组件
function CppStringEncoder({ onCopy }: { onCopy: (text: string) => void }) {
  const [input, setInput] = useState('');

  // 字符信息
  const charInfo = useMemo(() => {
    if (!input) return [];
    return Array.from(input).map(char => {
      const codePoint = char.codePointAt(0)!;
      const utf8 = unicodeToUtf8(codePoint);
      const utf16 = unicodeToUtf16(codePoint);
      const gbk = charToGBK(codePoint);

      return {
        char,
        codePoint,
        unicode: `U+${codePoint.toString(16).toUpperCase().padStart(4, '0')}`,
        utf8: utf8.map(b => b.toString(16).padStart(2, '0')).join(' '),
        utf16Le: utf16.le.map(b => b.toString(16).padStart(2, '0')).join(' '),
        utf16Be: utf16.be.map(b => b.toString(16).padStart(2, '0')).join(' '),
        gbk: gbk ? `${(gbk >> 8).toString(16).padStart(2, '0')} ${(gbk & 0xFF).toString(16).padStart(2, '0')}` : '-',
      };
    });
  }, [input]);

  // 生成的 C++ 格式
  const formats = useMemo(() => {
    if (!input) return null;

    // 普通字符串（转义特殊字符）
    const escaped = input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    // UTF-8 字节数组
    const utf8Bytes = Array.from(input).flatMap(c => unicodeToUtf8(c.codePointAt(0)!));
    const hexArray = utf8Bytes.map(b => `\\x${b.toString(16).padStart(2, '0')}`).join('');

    // 宽字符串
    const wideEscaped = input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    return {
      normal: `"${escaped}"`,
      raw: `R"(${input})"`,
      utf8Bytes: `"${hexArray}"`,
      wide: `L"${wideEscaped}"`,
      char16: `u"${escaped}"`,
      char32: `U"${escaped}"`,
    };
  }, [input]);

  return (
    <div>
      <div className="tool-row">
        <label>输入文本</label>
        <div className="field">
          <textarea
            placeholder="输入要转换的文本..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {formats && (
        <>
          {/* C++ 字符串格式 */}
          <div className="tool-row">
            <label>C++ 字符串格式</label>
            <div className="field">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>普通字符串</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.normal}</code>
                  <button className="ghost" onClick={() => onCopy(formats.normal)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>原始字符串</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.raw}</code>
                  <button className="ghost" onClick={() => onCopy(formats.raw)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>UTF-8 字节数组</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.utf8Bytes}</code>
                  <button className="ghost" onClick={() => onCopy(formats.utf8Bytes)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>宽字符串 L""</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.wide}</code>
                  <button className="ghost" onClick={() => onCopy(formats.wide)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>char16_t u""</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.char16}</code>
                  <button className="ghost" onClick={() => onCopy(formats.char16)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>char32_t U""</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.char32}</code>
                  <button className="ghost" onClick={() => onCopy(formats.char32)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 字符信息表格 */}
          <div className="tool-row">
            <label>字符编码详情</label>
            <div className="field" style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)' }}>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>字符</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Unicode</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>UTF-8</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>UTF-16 LE</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>UTF-16 BE</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>GBK</th>
                  </tr>
                </thead>
                <tbody>
                  {charInfo.map((info, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 14 }}>
                        {info.char === ' ' ? <span style={{ color: 'var(--muted)' }}>[空格]</span> : info.char}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        {info.unicode}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        {info.utf8}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        {info.utf16Le}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        {info.utf16Be}
                      </td>
                      <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                        {info.gbk}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// QString 格式转换组件
function QStringConverter({ onCopy }: { onCopy: (text: string) => void }) {
  const [input, setInput] = useState('');

  const formats = useMemo(() => {
    if (!input) return null;

    // 转义字符串
    const escaped = input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');

    // Unicode 转义
    const unicodeEscaped = Array.from(input)
      .map(c => {
        const code = c.codePointAt(0)!;
        if (code > 0xFFFF) {
          return `\\U${code.toString(16).toUpperCase().padStart(8, '0')}`;
        }
        return `\\u${code.toString(16).toUpperCase().padStart(4, '0')}`;
      })
      .join('');

    // Qt 格式化
    const asprintf = `QString::asprintf("%s", "${escaped}.c_str());`;
    const arg = `QString("%1").arg("${escaped}");`;
    const qPrintable = `// qPrintable 转换\nqPrintable(QString::fromUtf8("${unicodeEscaped}"))`;
    const QStringLiteral = `QStringLiteral("${unicodeEscaped}")`;
    const fromUtf8 = `QString::fromUtf8("${unicodeEscaped}")`;
    const fromLocal8Bit = `QString::fromLocal8Bit("${encodeToGBKString(input)}")`;

    return {
      asprintf,
      arg,
      qPrintable,
      QStringLiteral,
      fromUtf8,
      fromLocal8Bit,
      unicodeEscaped: `"${unicodeEscaped}"`,
    };
  }, [input]);

  return (
    <div>
      <div className="tool-row">
        <label>输入文本</label>
        <div className="field">
          <textarea
            placeholder="输入要转换的文本..."
            value={input}
            onChange={e => setInput(e.target.value)}
            rows={4}
          />
        </div>
      </div>

      {formats && (
        <>
          {/* Qt 字符串格式 */}
          <div className="tool-row">
            <label>QString 格式</label>
            <div className="field">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>asprintf</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.asprintf}</code>
                  <button className="ghost" onClick={() => onCopy(formats.asprintf)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>arg</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.arg}</code>
                  <button className="ghost" onClick={() => onCopy(formats.arg)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>QStringLiteral</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.QStringLiteral}</code>
                  <button className="ghost" onClick={() => onCopy(formats.QStringLiteral)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>fromUtf8</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.fromUtf8}</code>
                  <button className="ghost" onClick={() => onCopy(formats.fromUtf8)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>fromLocal8Bit</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.fromLocal8Bit}</code>
                  <button className="ghost" onClick={() => onCopy(formats.fromLocal8Bit)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
                <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                  <div style={{ color: 'var(--muted)', marginBottom: 4 }}>qPrintable</div>
                  <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.qPrintable}</code>
                  <button className="ghost" onClick={() => onCopy(formats.qPrintable)} style={{ float: 'right', padding: 2 }}>
                    <Copy size={12} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Unicode 转义序列 */}
          <div className="tool-row">
            <label>Unicode 转义序列</label>
            <div className="field">
              <div style={{ padding: 10, background: 'var(--bg3)', borderRadius: 6, fontSize: 12 }}>
                <code style={{ fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{formats.unicodeEscaped}</code>
                <button className="ghost" onClick={() => onCopy(formats.unicodeEscaped)} style={{ float: 'right', padding: 2 }}>
                  <Copy size={12} />
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// 辅助函数：GBK 编码字符串
function encodeToGBKString(text: string): string {
  const bytes = encodeToGBK(text);
  if (!bytes) return '';
  return bytes.map(b => `\\x${b.toString(16).padStart(2, '0')}`).join('');
}

export default function Encoder() {
  const [type, setType] = useState<EncodeType>('base64');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

  const current = ENCODERS.find(e => e.id === type);
  const isSpecialType = type === 'cpp-string' || type === 'qstring';

  const handleEncode = useCallback(() => {
    if (!input) { setError(''); setOutput(''); return; }
    if (!current) return;
    try {
      const result = current.encode(input);
      setOutput(result);
      setError('');
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 100),
        output: `[${current.name}编码] ${result.slice(0, 100)}`,
      });
    } catch (e) {
      setError('编码失败: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, current, addHistory]);

  const handleDecode = useCallback(() => {
    if (!input) { setError(''); setOutput(''); return; }
    if (!current) return;
    try {
      const result = current.decode(input);
      setOutput(result);
      setError('');
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 100),
        output: `[${current.name}解码] ${result.slice(0, 100)}`,
      });
    } catch (e) {
      setError('解码失败: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, current, addHistory]);

  const handleCopy = useCallback(async (text?: string) => {
    const textToCopy = text || output;
    if (!textToCopy) return;
    await copyToClipboard(textToCopy);
    toast.success('已复制');
  }, [output, toast]);

  // 注册快捷键：Ctrl+Enter 编码，Ctrl+Shift+C 复制
  useModuleShortcuts(handleEncode, handleCopy);

  const handleSwap = () => {
    setInput(output);
    setOutput('');
    setError('');
  };

  const handleSelectHistory = (item: { input: string }) => {
    setInput(item.input);
    setOutput('');
    setError('');
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  const handleTypeChange = (newType: EncodeType) => {
    setType(newType);
    setOutput('');
    setError('');
  };

  return (
    <div>
      <div className="module-header">
        <h2>编码转换</h2>
        <p>Base64 / URL / HTML 实体 / Unicode / C++ 字符串 / QString 格式</p>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label>类型</label>
          <div className="field btn-group" style={{ flexWrap: 'wrap', gap: 4 }}>
            {ENCODERS.map(e => (
              <button
                key={e.id}
                className={type === e.id ? '' : 'secondary'}
                onClick={() => handleTypeChange(e.id)}
                style={{ fontSize: 12 }}
              >
                {e.name}
              </button>
            ))}
            <button
              className={type === 'cpp-string' ? '' : 'secondary'}
              onClick={() => handleTypeChange('cpp-string')}
              style={{ fontSize: 12 }}
            >
              <Code2 size={14} style={{ marginRight: 4 }} />
              C++ 字符串
            </button>
            <button
              className={type === 'qstring' ? '' : 'secondary'}
              onClick={() => handleTypeChange('qstring')}
              style={{ fontSize: 12 }}
            >
              <Code2 size={14} style={{ marginRight: 4 }} />
              QString
            </button>
          </div>
        </div>

        {isSpecialType ? (
          // 特殊类型：C++ 字符串 / QString
          type === 'cpp-string' ? (
            <CppStringEncoder onCopy={handleCopy} />
          ) : (
            <QStringConverter onCopy={handleCopy} />
          )
        ) : (
          // 传统编解码
          <>
            <div className="tool-row">
              <label>输入</label>
              <div className="field">
                <textarea
                  placeholder={`输入要${current?.name || ''}编码/解码的内容...`}
                  value={input}
                  onChange={e => { setInput(e.target.value); setError(''); }}
                  rows={6}
                />
              </div>
            </div>

            <div className="tool-row">
              <label></label>
              <div className="field btn-group">
                <button onClick={handleEncode}><ArrowRightLeft size={16} /> 编码</button>
                <button className="secondary" onClick={handleDecode}>解码</button>
                <button className="secondary" onClick={handleSwap}>互换</button>
                <button className="secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>清空</button>
              </div>
            </div>

            {error && (
              <div className="tool-row">
                <label></label>
                <div className="field error-text">{error}</div>
              </div>
            )}

            <div className="tool-row">
              <label>输出</label>
              <div className="field">
                <div className="output-box">
                  {output ? (
                    <>
                      <pre style={{ margin: 0, padding: 0, background: 'transparent', border: 'none' }}>{output}</pre>
                      <button className="ghost copy-btn" onClick={() => handleCopy()}>
                        <Copy size={16} />
                      </button>
                    </>
                  ) : (
                    <span className="empty-state">编解码结果将显示在这里</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {!isSpecialType && (
        <HistoryPanel
          history={getModuleHistory(MODULE_ID)}
          onSelect={handleSelectHistory}
          onClear={handleClearHistory}
        />
      )}
    </div>
  );
}
