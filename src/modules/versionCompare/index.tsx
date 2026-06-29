/**
 * VersionCompare - 版本号比较器
 *
 * 【功能说明】
 * - 版本号比较
 * - 批量排序
 * - C++ 代码生成
 */

import { useState, useCallback, useMemo } from 'react';
import { GitCompare, Copy, Check, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// 版本段
interface VersionPart {
  value: number;
  label: string;
}

// 解析版本号
function parseVersion(version: string): { parts: VersionPart[]; prefix: string; suffix: string } {
  const trimmed = version.trim();
  
  // 提取前缀 (v, Ver, etc.)
  let prefix = '';
  let rest = trimmed;
  const prefixMatch = trimmed.match(/^([a-zA-Z]+)/);
  if (prefixMatch) {
    prefix = prefixMatch[1];
    rest = trimmed.slice(prefix.length);
  }
  
  // 提取后缀 (-alpha, -beta, etc.)
  let suffix = '';
  const suffixMatch = rest.match(/-(.+)$/);
  if (suffixMatch) {
    suffix = suffixMatch[1];
    rest = rest.slice(0, -suffixMatch[0].length);
  }
  
  // 分割数字段
  const numParts = rest.split('.').filter(p => p).map((p, idx) => {
    // 提取数字部分（可能带标签如 beta.2）
    const numMatch = p.match(/^(\d+)/);
    return {
      value: numMatch ? parseInt(numMatch[1], 10) : 0,
      label: ['Major', 'Minor', 'Patch', 'Build'][idx] || `Part${idx + 1}`,
    };
  });
  
  return { parts: numParts, prefix, suffix };
}

// 比较两个版本号
function compareVersions(v1: string, v2: string): -1 | 0 | 1 {
  const parsed1 = parseVersion(v1);
  const parsed2 = parseVersion(v2);
  
  const maxLen = Math.max(parsed1.parts.length, parsed2.parts.length);
  
  for (let i = 0; i < maxLen; i++) {
    const p1 = i < parsed1.parts.length ? parsed1.parts[i].value : 0;
    const p2 = i < parsed2.parts.length ? parsed2.parts[i].value : 0;
    
    if (p1 < p2) return -1;
    if (p1 > p2) return 1;
  }
  
  return 0;
}

// 生成 C++ 比较函数代码
function generateCppCompareCode(): string {
  return `// 方法1: 自定义比较函数
int compareVersion(const std::string& v1, const std::string& v2) {
    std::vector<int> parts1, parts2;
    std::stringstream ss1(v1), ss2(v2);
    std::string segment;
    
    // 解析 v1
    while (std::getline(ss1, segment, '.')) {
        parts1.push_back(std::stoi(segment));
    }
    
    // 解析 v2
    while (std::getline(ss2, segment, '.')) {
        parts2.push_back(std::stoi(segment));
    }
    
    // 补齐长度
    size_t maxLen = std::max(parts1.size(), parts2.size());
    parts1.resize(maxLen, 0);
    parts2.resize(maxLen, 0);
    
    // 逐段比较
    for (size_t i = 0; i < maxLen; ++i) {
        if (parts1[i] < parts2[i]) return -1;
        if (parts1[i] > parts2[i]) return 1;
    }
    
    return 0;
}

// 使用示例
void versionExample() {
    std::string v1 = "1.2.3";
    std::string v2 = "1.2.10";
    
    int result = compareVersion(v1, v2);
    if (result < 0) {
        std::cout << v1 << " < " << v2 << std::endl;
    } else if (result > 0) {
        std::cout << v1 << " > " << v2 << std::endl;
    } else {
        std::cout << v1 << " == " << v2 << std::endl;
    }
}

// 方法2: 使用 std::tuple 比较
int compareVersionTuple(const std::string& v1, const std::string& v2) {
    auto parse = [](const std::string& v) {
        std::vector<int> parts;
        std::stringstream ss(v);
        std::string seg;
        while (std::getline(ss, seg, '.')) {
            parts.push_back(std::stoi(seg));
        }
        return parts;
    };
    
    auto p1 = parse(v1);
    auto p2 = parse(v2);
    
    size_t maxLen = std::max(p1.size(), p2.size());
    p1.resize(maxLen, 0);
    p2.resize(maxLen, 0);
    
    return std::tie(p1) < std::tie(p2) ? -1 : 
           std::tie(p1) > std::tie(p2) ? 1 : 0;
}

// 方法3: C++20 使用 std::views::split (推荐)
#if __cplusplus >= 202002L
#include <ranges>
int compareVersionCxx20(const std::string& v1, const std::string& v2) {
    auto to_ints = [](std::string_view sv) {
        return sv | std::views::transform([](auto s) { 
            return std::stoi(std::string(s)); 
        }) | std::ranges::to<std::vector>();
    };
    
    auto p1 = to_ints(v1 | std::views::split('.'));
    auto p2 = to_ints(v2 | std::views::split('.'));
    
    size_t maxLen = std::max(p1.size(), p2.size());
    std::vector<int> a(maxLen, 0), b(maxLen, 0);
    std::copy_n(p1.begin(), std::min(p1.size(), maxLen), a.begin());
    std::copy_n(p2.begin(), std::min(p2.size(), maxLen), b.begin());
    
    return a < b ? -1 : a > b ? 1 : 0;
}
#endif`;
}

// 批量排序版本号
function sortVersions(versions: string[], ascending: boolean): string[] {
  return [...versions].sort((a, b) => {
    const result = compareVersions(a, b);
    return ascending ? result : -result;
  });
}

// 示例数据
const EXAMPLE_DATA = [
  { v1: '1.0.0', v2: '1.0.1' },
  { v1: '2.3.4', v2: '2.3.10' },
  { v1: '1.10.0', v2: '1.9.0' },
  { v1: 'v2.0.0', v2: 'v1.99.99' },
  { v1: '3.0.0-alpha', v2: '3.0.0-beta' },
];

const BATCH_EXAMPLES = [
  '1.0.0',
  '2.1.3',
  '1.10.5',
  '2.1.10',
  '3.0.0',
  '1.2.3',
  '2.0.0',
  '1.5.0',
];

export default function VersionCompare() {
  const [v1, setV1] = useState('1.2.3');
  const [v2, setV2] = useState('1.2.10');
  const [batchInput, setBatchInput] = useState('');
  const [sortAscending, setSortAscending] = useState(true);
  const [copied, setCopied] = useState<'single' | 'batch' | 'cpp' | ''>('');
  const toast = useToast();

  // 解析版本
  const parsedV1 = useMemo(() => parseVersion(v1), [v1]);
  const parsedV2 = useMemo(() => parseVersion(v2), [v2]);

  // 比较结果
  const compareResult = useMemo(() => compareVersions(v1, v2), [v1, v2]);

  // 逐段对比数据
  const partComparison = useMemo(() => {
    const maxLen = Math.max(parsedV1.parts.length, parsedV2.parts.length);
    const rows: { label: string; p1: number | null; p2: number | null; result: string; diff: boolean }[] = [];

    for (let i = 0; i < maxLen; i++) {
      const p1 = i < parsedV1.parts.length ? parsedV1.parts[i] : null;
      const p2 = i < parsedV2.parts.length ? parsedV2.parts[i] : null;
      
      let result = '= ';
      let diff = false;
      
      if (p1 && p2) {
        if (p1.value < p2.value) { result = '< '; diff = true; }
        else if (p1.value > p2.value) { result = '> '; diff = true; }
      } else if (p1 && !p2) {
        result = '> '; diff = true;
      } else if (!p1 && p2) {
        result = '< '; diff = true;
      }

      rows.push({
        label: ['Major', 'Minor', 'Patch', 'Build'][i] || `Part ${i + 1}`,
        p1: p1?.value ?? null,
        p2: p2?.value ?? null,
        result,
        diff,
      });
    }

    return rows;
  }, [parsedV1, parsedV2]);

  // 批量版本排序
  const sortedVersions = useMemo(() => {
    const versions = batchInput.split('\n').filter(v => v.trim());
    return sortVersions(versions, sortAscending);
  }, [batchInput, sortAscending]);

  // 复制到剪贴板
  const handleCopy = useCallback(async (type: 'single' | 'batch' | 'cpp') => {
    let text = '';
    switch (type) {
      case 'single':
        text = `${v1} ${compareResult === -1 ? '<' : compareResult === 1 ? '>' : '=='} ${v2}`;
        break;
      case 'batch':
        text = sortedVersions.join('\n');
        break;
      case 'cpp':
        text = generateCppCompareCode();
        break;
    }
    await copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
    toast.success('已复制');
  }, [v1, v2, compareResult, sortedVersions, toast]);

  // 加载示例
  const handleLoadExample = useCallback((example: typeof EXAMPLE_DATA[0]) => {
    setV1(example.v1);
    setV2(example.v2);
    toast.success('已加载示例');
  }, [toast]);

  // 加载批量示例
  const handleLoadBatchExample = useCallback(() => {
    setBatchInput(BATCH_EXAMPLES.join('\n'));
    toast.success('已加载批量示例');
  }, [toast]);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="module-header">
        <h2>版本号比较器</h2>
        <p>版本比较 · 批量排序 · C++代码生成</p>
      </div>

      {/* 单个比较 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
          <GitCompare size={16} color="var(--accent)" />
          版本号比较
        </h3>

        {/* 示例数据 */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--muted)', marginRight: 8 }}>示例数据：</label>
          {EXAMPLE_DATA.map((ex, idx) => (
            <button
              key={idx}
              className="secondary"
              onClick={() => handleLoadExample(ex)}
              style={{ fontSize: 11, marginRight: 4, marginBottom: 4 }}
            >
              {ex.v1} vs {ex.v2}
            </button>
          ))}
        </div>

        {/* 版本号输入 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center', marginBottom: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>版本 1</label>
            <input
              type="text"
              value={v1}
              onChange={e => setV1(e.target.value)}
              placeholder="如: 1.2.3"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 16, padding: '8px 12px', width: '100%' }}
            />
          </div>
          
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              fontSize: 32,
              fontWeight: 'bold',
              color: compareResult === -1 ? '#22c55e' : compareResult === 1 ? '#ef4444' : 'var(--accent)',
            }}>
              {compareResult === -1 ? '<' : compareResult === 1 ? '>' : '='}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
              {compareResult === -1 ? 'v1 较小' : compareResult === 1 ? 'v1 较大' : '版本相同'}
            </div>
          </div>
          
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>版本 2</label>
            <input
              type="text"
              value={v2}
              onChange={e => setV2(e.target.value)}
              placeholder="如: 1.2.10"
              style={{ fontFamily: 'var(--font-mono)', fontSize: 16, padding: '8px 12px', width: '100%' }}
            />
          </div>
        </div>

        {/* 比较结果 */}
        <div style={{
          padding: 12,
          background: compareResult === -1 ? 'rgba(34, 197, 94, 0.1)' : compareResult === 1 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)',
          borderRadius: 8,
          marginBottom: 16,
          textAlign: 'center',
          fontSize: 16,
          fontWeight: 500,
        }}>
          <code style={{ fontFamily: 'var(--font-mono)' }}>
            {parsedV1.prefix && <span style={{ color: 'var(--muted)' }}>{parsedV1.prefix}</span>}
            {parsedV1.parts.map(p => p.value).join('.')}
            {parsedV1.suffix && <span style={{ color: 'var(--muted)' }}>-{parsedV1.suffix}</span>}
          </code>
          {' '}<span style={{ fontSize: 20 }}>{compareResult === -1 ? '<' : compareResult === 1 ? '>' : '='}</span>{' '}
          <code style={{ fontFamily: 'var(--font-mono)' }}>
            {parsedV2.prefix && <span style={{ color: 'var(--muted)' }}>{parsedV2.prefix}</span>}
            {parsedV2.parts.map(p => p.value).join('.')}
            {parsedV2.suffix && <span style={{ color: 'var(--muted)' }}>-{parsedV2.suffix}</span>}
          </code>
          <button
            className="ghost"
            onClick={() => handleCopy('single')}
            style={{ float: 'right', padding: 4 }}
          >
            {copied === 'single' ? <Check size={14} /> : <Copy size={14} />}
          </button>
        </div>

        {/* 逐段对比表格 */}
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>段</th>
              <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>版本 1</th>
              <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>版本 2</th>
              <th style={{ padding: 8, textAlign: 'center', borderBottom: '1px solid var(--border)' }}>比较</th>
            </tr>
          </thead>
          <tbody>
            {partComparison.map((row, idx) => (
              <tr key={idx}>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{row.label}</td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {row.p1 !== null ? row.p1 : '-'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'center', fontFamily: 'var(--font-mono)' }}>
                  {row.p2 !== null ? row.p2 : '-'}
                </td>
                <td style={{ padding: 8, borderBottom: '1px solid var(--border)', textAlign: 'center', fontWeight: 'bold', color: row.diff ? (row.result.trim() === '<' ? '#22c55e' : '#ef4444') : 'var(--muted)' }}>
                  {row.result}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 批量比较排序 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ArrowUpDown size={16} color="var(--accent)" />
            批量排序
          </h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="secondary"
              onClick={handleLoadBatchExample}
              style={{ fontSize: 12 }}
            >
              加载示例
            </button>
            <button
              className={sortAscending ? '' : 'secondary'}
              onClick={() => setSortAscending(true)}
              style={{ fontSize: 12 }}
            >
              <ArrowUp size={14} />
              升序
            </button>
            <button
              className={!sortAscending ? '' : 'secondary'}
              onClick={() => setSortAscending(false)}
              style={{ fontSize: 12 }}
            >
              <ArrowDown size={14} />
              降序
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>输入（每行一个版本号）</label>
            <textarea
              value={batchInput}
              onChange={e => setBatchInput(e.target.value)}
              placeholder="输入版本号，每行一个&#10;如:&#10;1.0.0&#10;2.1.3&#10;1.10.5"
              rows={10}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}
            />
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>排序结果 {sortAscending ? '(升序)' : '(降序)'}</label>
            <div style={{
              padding: 8,
              background: 'var(--bg3)',
              borderRadius: 6,
              height: '100%',
              minHeight: 200,
              overflow: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
            }}>
              {sortedVersions.map((v, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: '4px 0',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <span style={{ color: 'var(--muted)', marginRight: 8, minWidth: 24 }}>{idx + 1}.</span>
                  <span>{v}</span>
                </div>
              ))}
              {sortedVersions.length === 0 && (
                <div style={{ color: 'var(--muted)', textAlign: 'center', padding: 40 }}>输入版本号后显示排序结果</div>
              )}
            </div>
            {sortedVersions.length > 0 && (
              <button
                className="secondary"
                onClick={() => handleCopy('batch')}
                style={{ fontSize: 12, marginTop: 8 }}
              >
                {copied === 'batch' ? <Check size={14} /> : <Copy size={14} />}
                复制结果
              </button>
            )}
          </div>
        </div>
      </div>

      {/* C++ 代码 */}
      <div className="tool-panel">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <GitCompare size={16} color="var(--accent)" />
            C++ 比较代码
          </h3>
          <button onClick={() => handleCopy('cpp')} style={{ fontSize: 12 }}>
            {copied === 'cpp' ? <Check size={14} /> : <Copy size={14} />}
            {copied === 'cpp' ? '已复制' : '复制'}
          </button>
        </div>
        <pre style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 12,
          padding: 12,
          background: 'var(--bg3)',
          borderRadius: 6,
          whiteSpace: 'pre-wrap',
          lineHeight: 1.5,
          maxHeight: 400,
          overflow: 'auto',
        }}>
          {generateCppCompareCode()}
        </pre>
      </div>
    </div>
  );
}