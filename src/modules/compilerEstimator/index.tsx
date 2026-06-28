/**
 * CompilerEstimator - 编译器资源估算器
 *
 * 【功能说明】
 * - 数据结构内存占用计算
 * - 缓存行影响分析
 * - 内存对齐优化建议
 * - 布局可视化对比
 */

import { useState, useMemo, useCallback } from 'react';
import { HardDrive, Plus, Trash2, ArrowUp, ArrowDown, Lightbulb, AlertTriangle } from 'lucide-react';
import { useToast } from '../../hooks/useToast';

// 数据类型定义
type DataType = 'char' | 'short' | 'int' | 'long' | 'long_long' | 'float' | 'double' | 'bool' | 'pointer' | 'custom';

// 类型大小（字节），64位系统
const TYPE_SIZES: Record<DataType, number> = {
  char: 1,
  short: 2,
  int: 4,
  long: 8,
  long_long: 8,
  float: 4,
  double: 8,
  bool: 1,
  pointer: 8,
  custom: 0,
};

// 类型对齐要求
const TYPE_ALIGNMENTS: Record<DataType, number> = {
  char: 1,
  short: 2,
  int: 4,
  long: 8,
  long_long: 8,
  float: 4,
  double: 8,
  bool: 1,
  pointer: 8,
  custom: 0,
};

// 字段定义
interface Field {
  id: number;
  name: string;
  type: DataType;
  customSize?: number;
  arrayLength?: number;
}

// 字段布局信息
interface FieldLayout {
  field: Field;
  size: number;
  alignment: number;
  offset: number;
  paddingBefore: number;
  isPadding: boolean;
}

// 结构体布局结果
interface StructLayout {
  fields: FieldLayout[];
  totalSize: number;
  totalPadding: number;
  maxAlignment: number;
  compactnessScore: number;
}

const CACHE_LINE_SIZE = 64; // 常见缓存行大小

// 类型选项
const TYPE_OPTIONS = [
  { value: 'char', label: 'char (1B)', size: 1 },
  { value: 'short', label: 'short (2B)', size: 2 },
  { value: 'int', label: 'int (4B)', size: 4 },
  { value: 'long', label: 'long (8B)', size: 8 },
  { value: 'long_long', label: 'long long (8B)', size: 8 },
  { value: 'float', label: 'float (4B)', size: 4 },
  { value: 'double', label: 'double (8B)', size: 8 },
  { value: 'bool', label: 'bool (1B)', size: 1 },
  { value: 'pointer', label: 'pointer (8B)', size: 8 },
  { value: 'custom', label: '自定义', size: 0 },
];

// 计算结构体布局
function calculateLayout(fields: Field[]): StructLayout {
  const layouts: FieldLayout[] = [];
  let currentOffset = 0;
  let maxAlignment = 1;

  for (const field of fields) {
    const size = field.type === 'custom' ? (field.customSize || 1) : TYPE_SIZES[field.type];
    const alignment = field.type === 'custom' ? (field.customSize || 1) : TYPE_ALIGNMENTS[field.type];
    const actualSize = size * (field.arrayLength || 1);

    // 计算padding
    const paddingBefore = (alignment - (currentOffset % alignment)) % alignment;
    const fieldOffset = currentOffset + paddingBefore;

    layouts.push({
      field,
      size: actualSize,
      alignment,
      offset: fieldOffset,
      paddingBefore,
      isPadding: false,
    });

    currentOffset = fieldOffset + actualSize;
    maxAlignment = Math.max(maxAlignment, alignment);
  }

  // 结构体末尾padding
  const tailPadding = (maxAlignment - (currentOffset % maxAlignment)) % maxAlignment;

  const totalSize = currentOffset + tailPadding;
  const totalPadding = layouts.reduce((sum, l) => sum + l.paddingBefore, 0) + tailPadding;

  // 紧凑度评分：有效数据占比
  const compactnessScore = Math.round(((totalSize - totalPadding) / totalSize) * 100);

  return {
    fields: layouts,
    totalSize,
    totalPadding,
    maxAlignment,
    compactnessScore,
  };
}

// 优化字段顺序（按对齐要求降序排列）
function optimizeFieldOrder(fields: Field[]): Field[] {
  return [...fields].sort((a, b) => {
    // 按对齐要求降序排列（大字段在前）
    const alignA = TYPE_ALIGNMENTS[a.type === 'custom' ? 'custom' : a.type] || (a.customSize || 1);
    const alignB = TYPE_ALIGNMENTS[b.type === 'custom' ? 'custom' : b.type] || (b.customSize || 1);
    return alignB - alignA;
  });
}

// 格式化内存大小
function formatMemory(bytes: number): { value: string; unit: string; color: string } {
  if (bytes >= 1024 * 1024 * 1024) {
    const gb = bytes / (1024 * 1024 * 1024);
    return { value: gb.toFixed(2), unit: 'GB', color: gb > 4 ? '#ef4444' : '#f59e0b' };
  } else if (bytes >= 1024 * 1024) {
    const mb = bytes / (1024 * 1024);
    return { value: mb.toFixed(2), unit: 'MB', color: '#22c55e' };
  } else if (bytes >= 1024) {
    const kb = bytes / 1024;
    return { value: kb.toFixed(2), unit: 'KB', color: '#22c55e' };
  }
  return { value: bytes.toString(), unit: 'B', color: '#22c55e' };
}

// 预定义模板
const TEMPLATE_FIELDS: Record<string, Field[]> = {
  '基础类型': [
    { id: 1, name: 'a', type: 'char' },
    { id: 2, name: 'b', type: 'int' },
    { id: 3, name: 'c', type: 'short' },
  ],
  '指针结构': [
    { id: 1, name: 'id', type: 'int' },
    { id: 2, name: 'data', type: 'pointer' },
    { id: 3, name: 'next', type: 'pointer' },
    { id: 4, name: 'prev', type: 'pointer' },
  ],
  '链表节点': [
    { id: 1, name: 'value', type: 'int' },
    { id: 2, name: 'next', type: 'pointer' },
    { id: 3, name: 'prev', type: 'pointer' },
  ],
  '数组结构': [
    { id: 1, name: 'count', type: 'int' },
    { id: 2, name: 'items', type: 'int', arrayLength: 10 },
    { id: 3, name: 'name', type: 'char', arrayLength: 32 },
  ],
};

// 布局可视化组件
function LayoutVisualization({ layout, title }: { layout: StructLayout; title: string }) {
  const colors = [
    '#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1',
  ];
  const paddingColor = '#9ca3af';

  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>{title}</h4>
      <div style={{ position: 'relative', height: 40, background: 'var(--bg3)', borderRadius: 6, overflow: 'hidden', marginBottom: 4 }}>
        {/* 字段色块 */}
        {layout.fields.map((f, idx) => {
          const fieldColor = f.paddingBefore > 0 ? paddingColor : colors[idx % colors.length];
          const startX = (f.offset - f.paddingBefore) / layout.totalSize * 100;
          const paddingWidth = f.paddingBefore / layout.totalSize * 100;
          const fieldWidth = f.size / layout.totalSize * 100;

          return (
            <>
              {/* Padding */}
              {f.paddingBefore > 0 && (
                <div
                  key={`padding-${f.field.id}`}
                  style={{
                    position: 'absolute',
                    left: `${startX}%`,
                    width: `${paddingWidth}%`,
                    height: '100%',
                    background: paddingColor,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: 'white',
                    textOverflow: 'ellipsis',
                    overflow: 'hidden',
                  }}
                >
                  P
                </div>
              )}
              {/* 字段 */}
              <div
                key={f.field.id}
                style={{
                  position: 'absolute',
                  left: `${f.offset / layout.totalSize * 100}%`,
                  width: `${fieldWidth}%`,
                  height: '100%',
                  background: fieldColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 10,
                  color: 'white',
                  textOverflow: 'ellipsis',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                }}
              >
                {f.field.name}
              </div>
            </>
          );
        })}
      </div>
      {/* 偏移标注 */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--muted)' }}>
        <span>0</span>
        <span>{layout.totalSize}B</span>
      </div>
    </div>
  );
}

export default function CompilerEstimator() {
  const [fields, setFields] = useState<Field[]>(TEMPLATE_FIELDS['基础类型']);
  const [nextId, setNextId] = useState(10);
  const toast = useToast();

  // 添加字段
  const handleAddField = useCallback(() => {
    setFields(prev => [...prev, { id: nextId, name: `field${nextId}`, type: 'int' }]);
    setNextId(prev => prev + 1);
    toast.success('已添加新字段');
  }, [nextId, toast]);

  // 删除字段
  const handleDeleteField = useCallback((id: number) => {
    setFields(prev => prev.filter(f => f.id !== id));
  }, []);

  // 更新字段
  const handleUpdateField = useCallback((id: number, updates: Partial<Field>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, []);

  // 移动字段
  const handleMoveField = useCallback((id: number, direction: 'up' | 'down') => {
    const idx = fields.findIndex(f => f.id === id);
    if (idx === -1) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= fields.length) return;

    const newFields = [...fields];
    [newFields[idx], newFields[newIdx]] = [newFields[newIdx], newFields[idx]];
    setFields(newFields);
  }, [fields]);

  // 加载模板
  const handleLoadTemplate = useCallback((templateName: string) => {
    setFields(TEMPLATE_FIELDS[templateName].map(f => ({ ...f, id: nextId + f.id })));
    setNextId(prev => prev + 100);
    toast.success(`已加载模板：${templateName}`);
  }, [nextId, toast]);

  // 清空字段
  const handleClearFields = useCallback(() => {
    setFields([]);
    toast.success('已清空所有字段');
  }, [toast]);

  // 计算布局
  const originalLayout = useMemo(() => calculateLayout(fields), [fields]);

  // 优化布局
  const optimizedFields = useMemo(() => optimizeFieldOrder(fields), [fields]);
  const optimizedLayout = useMemo(() => calculateLayout(optimizedFields), [optimizedFields]);

  // 缓存行分析
  const cacheLineObjects = Math.floor(CACHE_LINE_SIZE / originalLayout.totalSize);
  const optimizedCacheLineObjects = Math.floor(CACHE_LINE_SIZE / optimizedLayout.totalSize);

  // 内存估算
  const millionObjects = formatMemory(originalLayout.totalSize * 1000000);
  const billionObjects = formatMemory(originalLayout.totalSize * 100000000);

  // 优化效果
  const savedBytes = originalLayout.totalSize - optimizedLayout.totalSize;
  const savedPercent = savedBytes > 0 ? Math.round((savedBytes / originalLayout.totalSize) * 100) : 0;

  // 是否需要优化
  const needsOptimization = originalLayout.totalPadding > 0 && savedBytes > 0;

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>编译器资源估算器</h2>
        <p>内存占用计算 · 对齐优化建议 · 布局可视化</p>
      </div>

      {/* 模板选择 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-row">
          <label>示例模板</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.keys(TEMPLATE_FIELDS).map(name => (
                <button
                  key={name}
                  className="secondary"
                  onClick={() => handleLoadTemplate(name)}
                  style={{ fontSize: 12 }}
                >
                  {name}
                </button>
              ))}
              <button className="secondary" onClick={handleClearFields} style={{ fontSize: 12 }}>
                <Trash2 size={14} />
                清空
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 字段定义区 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <HardDrive size={16} color="var(--accent)" />
            字段定义
          </h3>
          <button onClick={handleAddField} style={{ fontSize: 12 }}>
            <Plus size={14} />
            添加字段
          </button>
        </div>

        {/* 字段列表 */}
        {fields.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>
            请添加字段或选择模板
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {fields.map((field, idx) => (
              <div
                key={field.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 120px 80px 60px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '8px 12px',
                  background: 'var(--bg2)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                {/* 序号 */}
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>{idx + 1}</span>

                {/* 字段名 */}
                <input
                  type="text"
                  value={field.name}
                  onChange={e => handleUpdateField(field.id, { name: e.target.value })}
                  placeholder="字段名"
                  style={{ fontSize: 12 }}
                />

                {/* 类型选择 */}
                <select
                  value={field.type}
                  onChange={e => handleUpdateField(field.id, { type: e.target.value as DataType })}
                  style={{ fontSize: 12 }}
                >
                  {TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>

                {/* 自定义大小或数组长度 */}
                {field.type === 'custom' ? (
                  <input
                    type="number"
                    value={field.customSize || 1}
                    onChange={e => handleUpdateField(field.id, { customSize: parseInt(e.target.value) || 1 })}
                    placeholder="大小"
                    min={1}
                    style={{ fontSize: 12 }}
                  />
                ) : (
                  <input
                    type="number"
                    value={field.arrayLength || ''}
                    onChange={e => handleUpdateField(field.id, { arrayLength: parseInt(e.target.value) || undefined })}
                    placeholder="数组"
                    min={1}
                    style={{ fontSize: 12 }}
                  />
                )}

                {/* 操作按钮 */}
                <div style={{ display: 'flex', gap: 4 }}>
                  <button
                    className="ghost"
                    onClick={() => handleMoveField(field.id, 'up')}
                    disabled={idx === 0}
                    style={{ padding: 4, fontSize: 12 }}
                  >
                    <ArrowUp size={12} />
                  </button>
                  <button
                    className="ghost"
                    onClick={() => handleMoveField(field.id, 'down')}
                    disabled={idx === fields.length - 1}
                    style={{ padding: 4, fontSize: 12 }}
                  >
                    <ArrowDown size={12} />
                  </button>
                  <button
                    className="ghost"
                    onClick={() => handleDeleteField(field.id)}
                    style={{ padding: 4, fontSize: 12, color: 'var(--error)' }}
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 内存估算结果 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <HardDrive size={16} color="var(--accent)" />
          内存估算结果
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
          {/* 单个对象大小 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>单个对象大小</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              {originalLayout.totalSize}<span style={{ fontSize: 14, marginLeft: 4 }}>B</span>
            </div>
          </div>

          {/* 100万对象 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>100万个对象</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: millionObjects.color }}>
              {millionObjects.value}<span style={{ fontSize: 14, marginLeft: 4 }}>{millionObjects.unit}</span>
            </div>
          </div>

          {/* 1亿对象 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>1亿个对象</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: billionObjects.color }}>
              {billionObjects.value}<span style={{ fontSize: 14, marginLeft: 4 }}>{billionObjects.unit}</span>
            </div>
          </div>

          {/* 缓存行对象数 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>缓存行容纳（64B）</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)' }}>
              {cacheLineObjects}<span style={{ fontSize: 14, marginLeft: 4 }}>个</span>
            </div>
          </div>

          {/* Padding占比 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Padding 占比</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: originalLayout.totalPadding > 0 ? '#f59e0b' : '#22c55e' }}>
              {Math.round((originalLayout.totalPadding / originalLayout.totalSize) * 100)}<span style={{ fontSize: 14, marginLeft: 4 }}>%</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>{originalLayout.totalPadding}B padding</div>
          </div>

          {/* 紧凑度评分 */}
          <div style={{ padding: 16, background: 'var(--bg3)', borderRadius: 8 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>紧凑度评分</div>
            <div style={{ fontSize: 28, fontWeight: 'bold', fontFamily: 'var(--font-mono)', color: originalLayout.compactnessScore >= 90 ? '#22c55e' : originalLayout.compactnessScore >= 70 ? '#f59e0b' : '#ef4444' }}>
              {originalLayout.compactnessScore}<span style={{ fontSize: 14, marginLeft: 4 }}>分</span>
            </div>
          </div>
        </div>
      </div>

      {/* 布局可视化对比 */}
      <div className="grid-2-col" style={{ marginBottom: 16 }}>
        {/* 当前布局 */}
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>当前布局</h3>
          <LayoutVisualization layout={originalLayout} title="原始顺序" />

          {/* 字段详情 */}
          <div style={{ fontSize: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>字段</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>偏移</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>大小</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Padding</th>
                </tr>
              </thead>
              <tbody>
                {originalLayout.fields.map(f => (
                  <tr key={f.field.id}>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.field.name}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.offset}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.size}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: f.paddingBefore > 0 ? '#f59e0b' : 'var(--muted)' }}>
                      {f.paddingBefore > 0 ? `${f.paddingBefore}B` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 优化布局 */}
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            {needsOptimization && <Lightbulb size={16} color="#f59e0b" />}
            优化建议布局
          </h3>
          <LayoutVisualization layout={optimizedLayout} title="优化顺序（大字段优先）" />

          {/* 优化效果 */}
          {needsOptimization ? (
            <div style={{ padding: 12, background: 'rgba(245, 158, 11, 0.1)', borderRadius: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AlertTriangle size={14} color="#f59e0b" />
                <span style={{ fontWeight: 600, color: '#f59e0b' }}>可优化</span>
              </div>
              <div style={{ fontSize: 12 }}>
                <p style={{ marginBottom: 4 }}>节省 {savedBytes}B，减少 {savedPercent}% 内存占用</p>
                <p style={{ marginBottom: 4 }}>优化后缓存行可容纳 {optimizedCacheLineObjects} 个对象（原 {cacheLineObjects} 个）</p>
              </div>
            </div>
          ) : (
            <div style={{ padding: 12, background: 'rgba(34, 197, 94, 0.1)', borderRadius: 6, marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Lightbulb size={14} color="#22c55e" />
                <span style={{ fontWeight: 600, color: '#22c55e' }}>布局已最优</span>
              </div>
            </div>
          )}

          {/* 优化字段详情 */}
          <div style={{ fontSize: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>字段</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>偏移</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>大小</th>
                  <th style={{ padding: 6, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Padding</th>
                </tr>
              </thead>
              <tbody>
                {optimizedLayout.fields.map(f => (
                  <tr key={f.field.id}>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.field.name}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.offset}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>
                      {f.size}
                    </td>
                    <td style={{ padding: 6, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: f.paddingBefore > 0 ? '#f59e0b' : 'var(--muted)' }}>
                      {f.paddingBefore > 0 ? `${f.paddingBefore}B` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 优化建议详情 */}
      {needsOptimization && (
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lightbulb size={16} color="var(--accent)" />
            优化建议
          </h3>

          <div style={{ fontSize: 13 }}>
            <p style={{ marginBottom: 8 }}>
              <strong>问题分析：</strong>当前布局中有 {originalLayout.fields.filter(f => f.paddingBefore > 0).length} 个字段需要填充 padding，总计 {originalLayout.totalPadding}B。
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>建议方案：</strong>将字段按对齐要求从大到小排列（指针/long long/double → int/float → short → char/bool），减少内存对齐带来的间隙。
            </p>
            <p style={{ marginBottom: 8 }}>
              <strong>优化效果：</strong>
            </p>
            <ul style={{ marginLeft: 20, marginBottom: 8 }}>
              <li>结构体大小从 {originalLayout.totalSize}B 降至 {optimizedLayout.totalSize}B</li>
              <li>Padding 从 {originalLayout.totalPadding}B 降至 {optimizedLayout.totalPadding}B</li>
              <li>紧凑度从 {originalLayout.compactnessScore} 分提升至 {optimizedLayout.compactnessScore} 分</li>
              <li>缓存行容纳对象从 {cacheLineObjects} 个提升至 {optimizedCacheLineObjects} 个</li>
            </ul>
          </div>

          {/* 建议的代码 */}
          <div style={{ marginTop: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>建议的结构体定义：</label>
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: 12,
              background: 'var(--bg3)',
              borderRadius: 6,
              whiteSpace: 'pre-wrap',
            }}>
struct OptimizedStruct {'{\n'}
  {optimizedLayout.fields.map(f => {
    const typeLabel = f.field.type === 'custom' 
      ? `uint8_t[${f.field.customSize}]` 
      : f.field.type === 'long_long' 
        ? 'long long' 
        : f.field.type;
    const arraySuffix = f.field.arrayLength ? `[${f.field.arrayLength}]` : '';
    return `    ${typeLabel} ${f.field.name}${arraySuffix};  // offset: ${f.offset}, size: ${f.size}\n`;
  }).join('')}
{'};  // total: '}{optimizedLayout.totalSize}B, padding: {optimizedLayout.totalPadding}B
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}