/**
 * ByteOrder - 字节序转换模块
 *
 * 【功能说明】
 * - 十六进制字节序列输入
 * - 实时显示多种数据类型的大端/小端解读
 * - 一键翻转字节序
 * - 支持多种格式粘贴
 * - 示例数据（TCP/UDP/IPv4）
 */

import { useState, useMemo, useCallback } from 'react';
import { ArrowLeftRight, Copy, Check, FileCode, Hash } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// 解析十六进制输入
function parseHexInput(input: string): number[] {
  if (!input.trim()) return [];

  // 移除所有 C 数组格式标记
  let cleaned = input.replace(/\{|\}|"/g, '').trim();

  // 支持多种格式
  // 1. 空格分隔: "01 02 03 04"
  // 2. 0x前缀: "0x01 0x02 0x03"
  // 3. 无分隔: "01020304"
  // 4. C数组: "0x01, 0x02, 0x03"
  // 5. 逗号分隔: "01,02,03,04"

  // 处理无分隔的连续十六进制
  if (!cleaned.includes(' ') && !cleaned.includes(',') && !cleaned.includes('0x')) {
    // 纯十六进制字符串，按每2字符分割
    const bytes: number[] = [];
    for (let i = 0; i < cleaned.length; i += 2) {
      const hex = cleaned.slice(i, i + 2);
      if (hex.length === 2) {
        const val = parseInt(hex, 16);
        if (!isNaN(val)) bytes.push(val);
      }
    }
    return bytes;
  }

  // 有分隔符的情况
  cleaned = cleaned.replace(/0x/gi, ''); // 移除 0x 前缀
  const parts = cleaned.split(/[\s,]+/).filter(p => p.length > 0);

  return parts.map(p => {
    const val = parseInt(p, 16);
    return isNaN(val) ? -1 : val;
  }).filter(v => v >= 0 && v <= 255);
}

// 字节序转换
function swapBytes(bytes: number[]): number[] {
  return bytes.slice().reverse();
}

// 大端序读取 uint16
function readUint16BE(bytes: number[], offset: number): number | null {
  if (offset + 1 >= bytes.length) return null;
  return (bytes[offset] << 8) | bytes[offset + 1];
}

// 小端序读取 uint16
function readUint16LE(bytes: number[], offset: number): number | null {
  if (offset + 1 >= bytes.length) return null;
  return bytes[offset] | (bytes[offset + 1] << 8);
}

// 大端序读取 uint32
function readUint32BE(bytes: number[], offset: number): number | null {
  if (offset + 3 >= bytes.length) return null;
  return (bytes[offset] << 24) | (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];
}

// 小端序读取 uint32
function readUint32LE(bytes: number[], offset: number): number | null {
  if (offset + 3 >= bytes.length) return null;
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24);
}

// 有符号转换
function toInt16(uint16: number): number {
  if (uint16 > 0x7FFF) return uint16 - 0x10000;
  return uint16;
}

function toInt32(uint32: number): number {
  if (uint32 > 0x7FFFFFFF) return uint32 - 0x100000000;
  return uint32;
}

// IEEE 754 float (32-bit)
function readFloatBE(bytes: number[], offset: number): number | null {
  if (offset + 3 >= bytes.length) return null;
  const uint32 = readUint32BE(bytes, offset);
  if (uint32 === null) return null;
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, uint32, false);
  return view.getFloat32(0, false);
}

function readFloatLE(bytes: number[], offset: number): number | null {
  if (offset + 3 >= bytes.length) return null;
  const uint32 = readUint32LE(bytes, offset);
  if (uint32 === null) return null;
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, uint32, true);
  return view.getFloat32(0, true);
}

// IEEE 754 double (64-bit)
function readDoubleBE(bytes: number[], offset: number): number | null {
  if (offset + 7 >= bytes.length) return null;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[offset + i]);
  }
  return view.getFloat64(0, false);
}

function readDoubleLE(bytes: number[], offset: number): number | null {
  if (offset + 7 >= bytes.length) return null;
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, bytes[offset + 7 - i]); // 反序
  }
  return view.getFloat64(0, false);
}

// BigInt 64-bit
function readUint64BE(bytes: number[], offset: number): bigint | null {
  if (offset + 7 >= bytes.length) return null;
  let result = BigInt(0);
  for (let i = 0; i < 8; i++) {
    result = (result << BigInt(8)) | BigInt(bytes[offset + i]);
  }
  return result;
}

function readUint64LE(bytes: number[], offset: number): bigint | null {
  if (offset + 7 >= bytes.length) return null;
  let result = BigInt(0);
  for (let i = 7; i >= 0; i--) {
    result = (result << BigInt(8)) | BigInt(bytes[offset + i]);
  }
  return result;
}

function toInt64(uint64: bigint): bigint {
  if (uint64 > BigInt('0x7FFFFFFFFFFFFFFF')) {
    return uint64 - BigInt('0x10000000000000000');
  }
  return uint64;
}

// 示例数据
const EXAMPLES = [
  {
    name: 'TCP 头部（前20字节）',
    desc: '源端口45000，目的端口80，序号1000',
    data: 'AF C8 00 50 00 00 03 E8 00 00 00 00 50 02 20 00 3F 3F 00 00'
  },
  {
    name: 'UDP 头部',
    desc: '源端口53，目的端口12345，长度20',
    data: '00 35 30 39 00 14 00 00'
  },
  {
    name: 'IPv4 地址',
    desc: '192.168.1.100',
    data: 'C0 A8 01 64'
  },
  {
    name: '浮点数示例',
    desc: '-12.5 (float) + 3.14159 (double)',
    data: 'C1 48 00 00 40 09 21 FB 54 44 2D 18'
  },
  {
    name: '32位整数',
    desc: '大端 0x12345678，小端 0x78563412',
    data: '12 34 56 78 78 56 34 12'
  },
];

export default function ByteOrder() {
  const [input, setInput] = useState('');
  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();

  // 解析字节
  const bytes = useMemo(() => parseHexInput(input), [input]);

  // 翻转字节序
  const handleSwap = useCallback(() => {
    if (bytes.length === 0) return;
    const swapped = swapBytes(bytes);
    setInput(swapped.map(b => b.toString(16).toUpperCase().padStart(2, '0')).join(' '));
    toast.success('字节序已翻转');
  }, [bytes, toast]);

  // 加载示例
  const handleLoadExample = useCallback((data: string) => {
    setInput(data);
    toast.success('已加载示例数据');
  }, [toast]);

  // 复制
  const handleCopy = useCallback((value: string, key: string) => {
    if (!value) return;
    copyToClipboard(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已复制');
  }, [toast]);

  // 格式化显示值
  const formatHex = (val: number | bigint | null, width: number): string => {
    if (val === null) return '-';
    if (typeof val === 'bigint') {
      return val.toString(16).toUpperCase().padStart(width, '0');
    }
    return val.toString(16).toUpperCase().padStart(width, '0');
  };

  const formatDec = (val: number | bigint | null, isSigned: boolean, bits: number): string => {
    if (val === null) return '-';
    if (typeof val === 'bigint') {
      if (isSigned) {
        const signed = toInt64(val);
        return signed.toString();
      }
      return val.toString();
    }
    if (isSigned) {
      if (bits === 16) return toInt16(val).toString();
      if (bits === 32) return toInt32(val).toString();
      if (bits === 8) {
        if (val > 127) return (val - 256).toString();
        return val.toString();
      }
    }
    return val.toString();
  };

  const formatFloat = (val: number | null): string => {
    if (val === null) return '-';
    if (isNaN(val)) return 'NaN';
    if (!isFinite(val)) return val > 0 ? '+Inf' : '-Inf';
    return val.toFixed(6);
  };

  const formatDouble = (val: number | null): string => {
    if (val === null) return '-';
    if (isNaN(val)) return 'NaN';
    if (!isFinite(val)) return val > 0 ? '+Inf' : '-Inf';
    return val.toFixed(15);
  };

  // 生成结果表格数据
  const results = useMemo(() => {
    if (bytes.length === 0) return [];

    const rows: Array<{
      type: string;
      offset: number;
      beHex: string;
      beDec: string;
      leHex: string;
      leDec: string;
      valid: boolean;
    }> = [];

    // uint8 / int8（每个字节）
    for (let i = 0; i < bytes.length; i++) {
      rows.push({
        type: 'uint8_t',
        offset: i,
        beHex: bytes[i].toString(16).toUpperCase().padStart(2, '0'),
        beDec: bytes[i].toString(),
        leHex: bytes[i].toString(16).toUpperCase().padStart(2, '0'),
        leDec: bytes[i].toString(),
        valid: true
      });
      rows.push({
        type: 'int8_t',
        offset: i,
        beHex: bytes[i].toString(16).toUpperCase().padStart(2, '0'),
        beDec: formatDec(bytes[i], true, 8),
        leHex: bytes[i].toString(16).toUpperCase().padStart(2, '0'),
        leDec: formatDec(bytes[i], true, 8),
        valid: true
      });
    }

    // uint16 / int16（每2字节）
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const be = readUint16BE(bytes, i);
      const le = readUint16LE(bytes, i);
      rows.push({
        type: 'uint16_t',
        offset: i,
        beHex: formatHex(be, 4),
        beDec: formatDec(be, false, 16),
        leHex: formatHex(le, 4),
        leDec: formatDec(le, false, 16),
        valid: be !== null && le !== null
      });
      rows.push({
        type: 'int16_t',
        offset: i,
        beHex: formatHex(be, 4),
        beDec: formatDec(be, true, 16),
        leHex: formatHex(le, 4),
        leDec: formatDec(le, true, 16),
        valid: be !== null && le !== null
      });
    }

    // uint32 / int32 / float（每4字节）
    for (let i = 0; i + 3 < bytes.length; i += 4) {
      const be = readUint32BE(bytes, i);
      const le = readUint32LE(bytes, i);
      const beFloat = readFloatBE(bytes, i);
      const leFloat = readFloatLE(bytes, i);
      rows.push({
        type: 'uint32_t',
        offset: i,
        beHex: formatHex(be, 8),
        beDec: formatDec(be, false, 32),
        leHex: formatHex(le, 8),
        leDec: formatDec(le, false, 32),
        valid: be !== null && le !== null
      });
      rows.push({
        type: 'int32_t',
        offset: i,
        beHex: formatHex(be, 8),
        beDec: formatDec(be, true, 32),
        leHex: formatHex(le, 8),
        leDec: formatDec(le, true, 32),
        valid: be !== null && le !== null
      });
      rows.push({
        type: 'float',
        offset: i,
        beHex: formatHex(be, 8),
        beDec: formatFloat(beFloat),
        leHex: formatHex(le, 8),
        leDec: formatFloat(leFloat),
        valid: beFloat !== null && leFloat !== null
      });
    }

    // uint64 / int64 / double（每8字节）
    for (let i = 0; i + 7 < bytes.length; i += 8) {
      const be = readUint64BE(bytes, i);
      const le = readUint64LE(bytes, i);
      const beDouble = readDoubleBE(bytes, i);
      const leDouble = readDoubleLE(bytes, i);
      rows.push({
        type: 'uint64_t',
        offset: i,
        beHex: formatHex(be, 16),
        beDec: formatDec(be, false, 64),
        leHex: formatHex(le, 16),
        leDec: formatDec(le, false, 64),
        valid: be !== null && le !== null
      });
      rows.push({
        type: 'int64_t',
        offset: i,
        beHex: formatHex(be, 16),
        beDec: formatDec(be, true, 64),
        leHex: formatHex(le, 16),
        leDec: formatDec(le, true, 64),
        valid: be !== null && le !== null
      });
      rows.push({
        type: 'double',
        offset: i,
        beHex: formatHex(be, 16),
        beDec: formatDouble(beDouble),
        leHex: formatHex(le, 16),
        leDec: formatDouble(leDouble),
        valid: beDouble !== null && leDouble !== null
      });
    }

    return rows;
  }, [bytes]);

  // 按数据类型分组显示
  const groupedResults = useMemo(() => {
    const groups: Record<string, typeof results> = {};
    for (const row of results) {
      if (!groups[row.type]) groups[row.type] = [];
      groups[row.type].push(row);
    }
    return groups;
  }, [results]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="module-header">
        <h2>字节序转换</h2>
        <p>十六进制解析 · 大端/小端解读 · 一键翻转</p>
      </div>

      <div className="tool-panel">
        {/* 输入区 */}
        <div className="tool-row">
          <label>十六进制输入</label>
          <div className="field">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
              placeholder="支持多种格式：01 02 03 04 / 0x01,0x02 / 01020304 / {0x01, 0x02}"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 14
              }}
            />
          </div>
        </div>

        <div className="tool-row">
          <label></label>
          <div className="field btn-group">
            <button onClick={handleSwap}>
              <ArrowLeftRight size={16} /> 翻转字节序
            </button>
            <button className="secondary" onClick={() => setInput('')}>
              清空
            </button>
            <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Hash size={14} />
              {bytes.length} 字节
            </div>
          </div>
        </div>

        {/* 示例数据 */}
        <div className="tool-row">
          <label>示例数据</label>
          <div className="field">
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: 8
            }}>
              {EXAMPLES.map(ex => (
                <button
                  key={ex.name}
                  onClick={() => handleLoadExample(ex.data)}
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
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>{ex.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{ex.desc}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 结果展示 */}
      {bytes.length > 0 && (
        <div className="tool-panel" style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
            <FileCode size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            数据类型解读
          </h3>

          {/* 字节可视化 */}
          <div style={{
            background: 'var(--bg3)',
            padding: 12,
            borderRadius: 6,
            marginBottom: 16
          }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>字节序列：</div>
            <div style={{
              display: 'flex',
              gap: 4,
              flexWrap: 'wrap',
              fontFamily: 'var(--font-mono)'
            }}>
              {bytes.map((b, i) => (
                <div key={i} style={{
                  padding: '4px 8px',
                  background: 'var(--bg2)',
                  borderRadius: 4,
                  fontSize: 13,
                  border: '1px solid var(--border)'
                }}>
                  <span style={{ color: 'var(--muted)', fontSize: 10 }}>{i}</span>
                  <span style={{ marginLeft: 4, color: 'var(--accent)' }}>
                    {b.toString(16).toUpperCase().padStart(2, '0')}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 分组结果表格 */}
          {Object.entries(groupedResults).map(([type, rows]) => (
            <div key={type} style={{ marginBottom: 16 }}>
              <div style={{
                fontSize: 13,
                fontWeight: 600,
                marginBottom: 8,
                padding: '6px 10px',
                background: 'var(--bg3)',
                borderRadius: 4,
                color: 'var(--accent)'
              }}>
                {type}（{rows.length} 组）
              </div>

              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: 13,
                fontFamily: 'var(--font-mono)'
              }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)' }}>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 60 }}>偏移</th>
                    <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>端序</th>
                    <th style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid var(--border)', width: 120 }}>HEX</th>
                    <th style={{ padding: 8, textAlign: 'right', borderBottom: '1px solid var(--border)' }}>DEC</th>
                    <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)', width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      <td style={{ padding: 6, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>
                        +{row.offset}
                      </td>
                      <td style={{ padding: 6, borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: 500 }}>
                        <span style={{
                          padding: '2px 6px',
                          borderRadius: 3,
                          background: idx % 2 === 0 ? 'var(--bg3)' : 'transparent',
                          color: idx % 2 === 0 ? 'var(--accent)' : 'var(--ink)'
                        }}>
                          {idx % 2 === 0 ? 'BE' : 'LE'}
                        </span>
                      </td>
                      <td style={{
                        padding: 6,
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'right',
                        color: row.valid ? 'var(--accent)' : 'var(--error)'
                      }}>
                        {row.beHex}
                      </td>
                      <td style={{
                        padding: 6,
                        borderBottom: '1px solid var(--border)',
                        textAlign: 'right',
                        color: row.valid ? 'var(--ink)' : 'var(--error)'
                      }}>
                        {row.beDec}
                      </td>
                      <td style={{ padding: 6, borderBottom: '1px solid var(--border)', textAlign: 'center' }}>
                        <button
                          onClick={() => handleCopy(`${row.beHex} (${row.beDec})`, `${type}-${idx}`)}
                          style={{
                            padding: 2,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: copied === `${type}-${idx}` ? 'var(--accent)' : 'var(--muted)'
                          }}
                        >
                          {copied === `${type}-${idx}` ? <Check size={14} /> : <Copy size={14} />}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      {bytes.length === 0 && input.trim() && (
        <div className="tool-panel" style={{ marginTop: 16, textAlign: 'center', color: 'var(--error)', padding: 24 }}>
          无法解析输入的十六进制数据，请检查格式是否正确
        </div>
      )}
    </div>
  );
}