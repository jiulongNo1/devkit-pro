/**
 * MemoryLayout - 结构体内存布局可视化模块
 * 
 * 【功能说明】
 * - 解析 C++ struct 定义代码
 * - 计算每个字段的大小和偏移量
 * - 按 C++ 内存对齐规则计算 padding
 * - 可视化展示内存布局
 * 
 * 【设计说明 for C++/Qt 开发者】
 * - 类似于 Qt Creator 的 "Tools > Clang Tools > Clang Memory Sanitizer" 或 IDE 的结构体查看器
 * - 使用纯前端实现，无需后端
 * - 支持 32位/64位模式切换
 */

import { useState, useMemo } from 'react';
import { LayoutGrid, Moon, Sun, Info, Table, ChevronDown } from 'lucide-react';

interface Field {
  name: string;
  type: string;
  baseType: string;
  arraySize: number | null;
  size: number;
  alignment: number;
  offset: number;
  isPadding: boolean;
}

interface StructLayout {
  name: string;
  fields: Field[];
  totalSize: number;
  dataSize: number;
  paddingSize: number;
  maxAlignment: number;
}

type BitMode = '32' | '64';

// C++ 类型大小映射（单位：字节）
const TYPE_SIZES: Record<string, number> = {
  'char': 1,
  'int8_t': 1,
  'uint8_t': 1,
  'signed char': 1,
  'unsigned char': 1,
  'short': 2,
  'int16_t': 2,
  'uint16_t': 2,
  'unsigned short': 2,
  'wchar_t': 2,
  'int': 4,
  'uint32_t': 4,
  'int32_t': 4,
  'unsigned int': 4,
  'long': 4,
  'unsigned long': 4,
  'float': 4,
  'long long': 8,
  'int64_t': 8,
  'uint64_t': 8,
  'unsigned long long': 8,
  'double': 8,
  'bool': 1,
  'void': 8,
};

// 32 位模式下的类型大小
const TYPE_SIZES_32: Record<string, number> = {
  ...TYPE_SIZES,
  'long': 4,
  'unsigned long': 4,
  'long long': 4,
  'int64_t': 4,
  'uint64_t': 4,
  'size_t': 4,
  'ssize_t': 4,
  'ptrdiff_t': 4,
};

// 类型对齐值（64位）
const TYPE_ALIGNMENTS: Record<string, number> = {
  'char': 1,
  'int8_t': 1,
  'uint8_t': 1,
  'short': 2,
  'int16_t': 2,
  'uint16_t': 2,
  'int': 4,
  'uint32_t': 4,
  'int32_t': 4,
  'float': 4,
  'long': 4,
  'unsigned long': 4,
  'long long': 8,
  'int64_t': 8,
  'uint64_t': 8,
  'double': 8,
  'bool': 1,
  'size_t': 8,
};

// 32 位对齐值
const ALIGNMENT_32: Record<string, number> = {
  ...TYPE_ALIGNMENTS,
  'long': 4,
  'unsigned long': 4,
  'size_t': 4,
};

// 字段颜色配置
const FIELD_COLORS = [
  { bg: '#3b82f6', border: '#2563eb' },   // 蓝色
  { bg: '#10b981', border: '#059669' },   // 绿色
  { bg: '#f59e0b', border: '#d97706' },   // 橙色
  { bg: '#8b5cf6', border: '#7c3aed' },  // 紫色
  { bg: '#ef4444', border: '#dc2626' },     // 红色
  { bg: '#06b6d4', border: '#0891b2' },    // 青色
  { bg: '#ec4899', border: '#db2777' },    // 粉色
  { bg: '#84cc16', border: '#65a30d' },    // 亮绿
];

// 示例模板
const TEMPLATES = [
  {
    name: '学生信息',
    code: `struct Student {
  char name[10];
  int age;
  double score;
  bool is_active;
};`
  },
  {
    name: '数据包头',
    code: `struct PacketHeader {
  uint8_t version;
  uint16_t length;
  uint32_t seq;
  char payload[20];
  uint64_t timestamp;
};`
  },
  {
    name: '点坐标',
    code: `struct Point3D {
  double x;
  double y;
  double z;
};`
  },
  {
    name: '链表节点',
    code: `struct ListNode {
  int value;
  ListNode* next;
  ListNode* prev;
};`
  },
  {
    name: '混合类型',
    code: `struct MixedData {
  bool flag;
  int id;
  double value;
  char name[8];
  long long timestamp;
};`
  },
];

/**
 * 获取类型大小
 */
function getTypeSize(type: string, bitMode: BitMode): number {
  const sizes = bitMode === '32' ? TYPE_SIZES_32 : TYPE_SIZES;
  const cleanType = type.replace(/\bconst\b/g, '').replace(/\*$/, '').trim();
  return sizes[cleanType] || 8;
}

/**
 * 获取类型对齐值
 */
function getTypeAlignment(type: string, bitMode: BitMode): number {
  const alignments = bitMode === '32' ? ALIGNMENT_32 : TYPE_ALIGNMENTS;
  const cleanType = type.replace(/\bconst\b/g, '').replace(/\*$/, '').trim();
  return alignments[cleanType] || 8;
}

/**
 * 解析 struct 代码
 */
function parseStruct(code: string, bitMode: BitMode): StructLayout | null {
  const structMatch = code.match(/struct\s+(\w+)\s*\{([^}]+)\}/s);
  if (!structMatch) {
    return null;
  }

  const structName = structMatch[1];
  const body = structMatch[2];

  const fieldLines = body.split(';').filter(line => line.trim());
  const fields: Field[] = [];
  let currentOffset = 0;
  let maxAlignment = 1;

  for (const line of fieldLines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const match = trimmed.match(/^(\w+(?:\s*\*)?(?:\s+\w+)*)\s+(\w+)(?:\[(\d+)\])?\s*$/);
    if (!match) continue;

    const fullType = match[1].trim();
    const fieldName = match[2];
    const arraySize = match[3] ? parseInt(match[3]) : null;

    const baseType = fullType.replace(/\s+/g, ' ').split(' ')[0];

    let fieldSize = getTypeSize(baseType, bitMode);
    if (arraySize) {
      fieldSize *= arraySize;
    }

    const alignment = getTypeAlignment(baseType, bitMode);
    maxAlignment = Math.max(maxAlignment, alignment);

    const padding = (alignment - (currentOffset % alignment)) % alignment;
    const offset = currentOffset + padding;

    fields.push({
      name: fieldName,
      type: fullType,
      baseType,
      arraySize,
      size: fieldSize,
      alignment,
      offset,
      isPadding: false,
    });

    currentOffset = offset + fieldSize;
  }

  const totalSize = Math.ceil(currentOffset / maxAlignment) * maxAlignment;
  const paddingAtEnd = totalSize - currentOffset;

  if (paddingAtEnd > 0) {
    fields.push({
      name: '',
      type: '',
      baseType: '',
      arraySize: null,
      size: paddingAtEnd,
      alignment: 1,
      offset: currentOffset,
      isPadding: true,
    });
  }

  const dataSize = fields.filter(f => !f.isPadding).reduce((sum, f) => sum + f.size, 0);

  return {
    name: structName,
    fields,
    totalSize,
    dataSize,
    paddingSize: totalSize - dataSize,
    maxAlignment,
  };
}

/**
 * 主组件
 */
export default function MemoryLayout() {
  const [code, setCode] = useState(TEMPLATES[0].code);
  const [bitMode, setBitMode] = useState<BitMode>('64');
  const [darkTheme, setDarkTheme] = useState(false);
  const [showTable, setShowTable] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const layout = useMemo(() => {
    try {
      const result = parseStruct(code, bitMode);
      if (!result) {
        setError('无法解析 struct 定义，请检查语法');
        return null;
      }
      setError(null);
      return result;
    } catch (e) {
      setError('解析错误：' + (e as Error).message);
      return null;
    }
  }, [code, bitMode]);

  const loadTemplate = (template: typeof TEMPLATES[0]) => {
    setCode(template.code);
  };

  return (
    <div>
      <div className="module-header">
        <h2>结构体内存布局可视化</h2>
        <p>C++ Struct Memory Layout Analyzer</p>
      </div>

      {/* 控制栏 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* 32位/64位切换 */}
          <div style={{ display: 'flex', gap: 4 }}>
            <button
              className={bitMode === '32' ? '' : 'secondary'}
              onClick={() => setBitMode('32')}
              style={{ minWidth: 60 }}
            >
              32位
            </button>
            <button
              className={bitMode === '64' ? '' : 'secondary'}
              onClick={() => setBitMode('64')}
              style={{ minWidth: 60 }}
            >
              64位
            </button>
          </div>

          {/* 深色主题预览开关 */}
          <button
            className={darkTheme ? '' : 'secondary'}
            onClick={() => setDarkTheme(!darkTheme)}
          >
            {darkTheme ? <Sun size={14} /> : <Moon size={14} />}
            {darkTheme ? '浅色预览' : '深色预览'}
          </button>

          {/* 详情表格开关 */}
          <button
            className={showTable ? '' : 'secondary'}
            onClick={() => setShowTable(!showTable)}
          >
            <Table size={14} />
            {showTable ? '隐藏详情' : '显示详情'}
          </button>

          {/* 示例模板下拉 */}
          <div style={{ position: 'relative' }}>
            <button className="secondary" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <LayoutGrid size={14} />
              示例模板
              <ChevronDown size={14} />
            </button>
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              marginTop: 4,
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 100,
              minWidth: 180,
              display: 'none',
            }} className="template-dropdown">
              {TEMPLATES.map((t, i) => (
                <button
                  key={i}
                  onClick={() => loadTemplate(t)}
                  style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 16px',
                    textAlign: 'left',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {t.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 输入区域 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 14 }}>C++ 代码输入</h3>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>
            支持基本类型、数组、指针（指针大小由位数模式决定）
          </span>
        </div>
        <textarea
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="输入 C++ struct 定义..."
          rows={8}
          style={{
            width: '100%',
            fontFamily: 'var(--font-mono)',
            fontSize: 13,
            lineHeight: 1.6,
            resize: 'vertical',
          }}
        />
        {error && (
          <div style={{
            marginTop: 8,
            padding: '8px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid var(--danger)',
            borderRadius: 6,
            color: 'var(--danger)',
            fontSize: 13,
          }}>
            {error}
          </div>
        )}
      </div>

      {layout && (
        <>
          {/* 内存布局可视化 */}
          <div
            className="tool-panel"
            style={{
              marginBottom: 16,
              background: darkTheme ? '#1e1e1e' : 'var(--bg2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: 14, color: darkTheme ? '#fff' : 'inherit' }}>
                <LayoutGrid size={16} style={{ verticalAlign: 'middle', marginRight: 8, color: darkTheme ? '#d4d4d4' : 'var(--accent)' }} />
                内存布局可视化
              </h3>
              <span style={{ fontSize: 12, color: darkTheme ? '#d4d4d4' : 'var(--muted)' }}>
                {bitMode} 位模式 | <span style={{ color: darkTheme ? '#fff' : 'var(--accent)', fontWeight: 600 }}>{layout.name}</span>
              </span>
            </div>

            {/* 图例 */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' }}>
              {layout.fields.filter(f => !f.isPadding).slice(0, 6).map((field, i) => (
                <div key={field.name} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: FIELD_COLORS[i % FIELD_COLORS.length].bg,
                  }} />
                  <span style={{ fontSize: 12, color: darkTheme ? '#d4d4d4' : 'inherit' }}>{field.name}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{
                  width: 16,
                  height: 16,
                  borderRadius: 4,
                  background: 'repeating-linear-gradient(45deg, #888, #888 2px, #666 2px, #666 4px)',
                  opacity: 0.6,
                }} />
                <span style={{ fontSize: 12, color: darkTheme ? '#d4d4d4' : 'inherit' }}>padding</span>
              </div>
            </div>

            {/* 内存条可视化 */}
            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 16,
              background: darkTheme ? '#252526' : '#fff',
              overflowX: 'auto',
            }}>
              {/* 字段标签行 */}
              <div style={{ display: 'flex', minHeight: 40, marginBottom: 8 }}>
                {layout.fields.map((field, i) => {
                  if (field.isPadding) {
                    return (
                      <div
                        key={`pad-${i}`}
                        style={{
                          flex: field.size,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {field.size >= 4 && (
                          <span style={{ fontSize: 10, color: '#888' }}>
                            {field.size}B
                          </span>
                        )}
                      </div>
                    );
                  }
                  const color = FIELD_COLORS[layout.fields.filter(f => !f.isPadding).indexOf(field) % FIELD_COLORS.length];
                  return (
                    <div
                      key={field.name}
                      style={{
                        flex: field.size,
                        minWidth: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <div style={{
                        background: color.bg,
                        color: '#fff',
                        padding: '4px 8px',
                        borderRadius: 4,
                        fontSize: 11,
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '100%',
                      }}>
                        {field.name}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* 内存条主区域 */}
              <div style={{
                display: 'flex',
                minHeight: 50,
                borderRadius: 6,
                overflow: 'hidden',
                border: '2px solid var(--border)',
              }}>
                {layout.fields.map((field, i) => {
                  if (field.isPadding) {
                    return (
                      <div
                        key={`pad-bar-${i}`}
                        style={{
                          flex: field.size,
                          minWidth: 0,
                          background: 'repeating-linear-gradient(45deg, #ccc, #ccc 3px, #aaa 3px, #aaa 6px)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 10,
                          color: '#666',
                          borderRight: i < layout.fields.length - 1 ? '1px solid #999' : 'none',
                        }}
                      >
                        {field.size >= 4 && <span>p</span>}
                      </div>
                    );
                  }
                  const color = FIELD_COLORS[layout.fields.filter(f => !f.isPadding).indexOf(field) % FIELD_COLORS.length];
                  return (
                    <div
                      key={`bar-${field.name}`}
                      style={{
                        flex: field.size,
                        minWidth: 0,
                        background: color.bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 600,
                        color: '#fff',
                        borderRight: '1px solid rgba(0,0,0,0.2)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                      }}
                    >
                      <span style={{ fontSize: Math.max(9, Math.min(14, field.size * 2)) }}>
                        {field.arraySize ? `[${field.arraySize}]` : field.size === 8 ? '8B' : field.size === 4 ? '4B' : field.size === 2 ? '2B' : '1B'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 偏移量刻度行 */}
              <div style={{
                display: 'flex',
                marginTop: 8,
                position: 'relative',
              }}>
                {layout.fields.map((field, i) => (
                  <div
                    key={`offset-${i}`}
                    style={{
                      flex: field.size,
                      minWidth: 0,
                      display: 'flex',
                      justifyContent: 'flex-start',
                    }}
                  >
                    <span style={{
                      fontSize: 10,
                      color: darkTheme ? '#888' : '#666',
                      fontFamily: 'var(--font-mono)',
                    }}>
                      {field.offset}
                    </span>
                  </div>
                ))}
                <span style={{
                  position: 'absolute',
                  right: 0,
                  fontSize: 10,
                  color: darkTheme ? '#888' : '#666',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {layout.totalSize}
                </span>
              </div>
            </div>
          </div>

          {/* 详情表格 */}
          {showTable && (
            <div className="tool-panel" style={{ marginBottom: 16 }}>
              <h3 style={{ margin: '0 0 16px 0', fontSize: 14 }}>
                <Info size={16} style={{ verticalAlign: 'middle', marginRight: 8 }} />
                字段详细信息
              </h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: 13,
                }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--border)' }}>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>字段名</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>类型</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>大小</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>对齐</th>
                      <th style={{ textAlign: 'right', padding: '8px 12px', fontWeight: 600 }}>偏移量</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px', fontWeight: 600 }}>说明</th>
                    </tr>
                  </thead>
                  <tbody>
                    {layout.fields.filter(f => !f.isPadding).map((field, i) => {
                      const color = FIELD_COLORS[i % FIELD_COLORS.length];
                      return (
                        <tr key={field.name} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '8px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <div style={{
                                width: 12,
                                height: 12,
                                borderRadius: 3,
                                background: color.bg,
                              }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500 }}>{field.name}</span>
                            </div>
                          </td>
                          <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)' }}>
                            {field.type}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {field.size} B
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {field.alignment}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                            {field.offset}
                          </td>
                          <td style={{ padding: '8px 12px', color: 'var(--muted)', fontSize: 12 }}>
                            {field.arraySize ? `数组 ${field.arraySize} 元素` : '基础类型'}
                          </td>
                        </tr>
                      );
                    })}
                    {layout.paddingSize > 0 && layout.fields.some(f => f.isPadding) && (
                      <tr style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '8px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: 'repeating-linear-gradient(45deg, #888, #888 2px, #666 2px, #666 4px)',
                              opacity: 0.6,
                            }} />
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 500, color: '#888' }}>padding</span>
                          </div>
                        </td>
                        <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: '#888' }}>-</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#888' }}>
                          {layout.paddingSize} B
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#888' }}>-</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', color: '#888' }}>
                          {layout.fields.filter(f => !f.isPadding).reduce((sum, f) => sum + f.size, 0)}
                        </td>
                        <td style={{ padding: '8px 12px', color: '#888', fontSize: 12 }}>
                          末尾对齐填充（最大对齐 {layout.maxAlignment}）
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 统计汇总 */}
          <div className="tool-panel">
            <h3 style={{ margin: '0 0 16px 0', fontSize: 14 }}>统计信息</h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 16,
            }}>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>
                  {layout.totalSize}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  总大小 (B)
                </div>
              </div>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#10b981' }}>
                  {layout.dataSize}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  有效数据 (B)
                </div>
              </div>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#f59e0b' }}>
                  {layout.paddingSize}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Padding (B)
                </div>
              </div>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#8b5cf6' }}>
                  {((layout.paddingSize / layout.totalSize) * 100).toFixed(1)}%
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  Padding 占比
                </div>
              </div>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#ef4444' }}>
                  {layout.maxAlignment}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  最大对齐
                </div>
              </div>
              <div style={{
                padding: 16,
                background: 'var(--bg2)',
                borderRadius: 8,
                textAlign: 'center',
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#06b6d4' }}>
                  {layout.fields.filter(f => !f.isPadding).length}
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                  字段数量
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
