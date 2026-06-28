/**
 * i18nHelper - i18n 翻译辅助工具
 *
 * 【功能说明】
 * - 翻译键命名生成
 * - 多格式翻译文件生成
 * - 批量导入翻译键
 * - 翻译键去重检查
 */

import { useState, useCallback, useMemo } from 'react';
import { Languages, Copy, Check, Plus, Trash2, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// 翻译键类型
interface TranslationEntry {
  id: number;
  key: string;
  chinese: string;
  english: string;
  context?: string;
}

// 中文转翻译键名
function toUnderscore(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\u4e00-\u9fa5]+/g, '')
    .replace(/[^a-zA-Z0-9_\s]/g, '')
    .trim()
    .replace(/\s+/g, '_')
    .toLowerCase();
}

function toCamelCase(text: string): string {
  const words = text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w);
  
  if (words.length === 0) return '';
  
  return words[0].toLowerCase() + words.slice(1).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join('');
}

function toDotSeparated(text: string): string {
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[^a-zA-Z0-9\u4e00-\u9fa5\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(w => w)
    .map(w => w.toLowerCase())
    .join('.');
}

function toNamespace(text: string, namespace: string = 'common'): string {
  const base = toDotSeparated(text);
  return `${namespace}.${base}`;
}

// 生成 Qt .ts 格式
function generateQtTs(entries: TranslationEntry[]): string {
  let output = `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE TS>
<TS version="2.1" language="zh_CN">
`;
  
  const contexts = new Map<string, TranslationEntry[]>();
  entries.forEach(entry => {
    const ctx = entry.context || 'default';
    if (!contexts.has(ctx)) {
      contexts.set(ctx, []);
    }
    contexts.get(ctx)!.push(entry);
  });
  
  contexts.forEach((ctxEntries, ctxName) => {
    output += `<context>
    <name>${ctxName}</name>
`;
    ctxEntries.forEach(entry => {
      output += `    <message>
        <source>${entry.key}</source>
        <translation>${entry.english}</translation>
    </message>
`;
    });
    output += `</context>
`;
  });
  
  output += `</TS>
`;
  return output;
}

// 生成 JSON 格式
function generateJson(entries: TranslationEntry[], structure: 'flat' | 'nested' = 'flat'): string {
  if (structure === 'flat') {
    const obj: Record<string, string> = {};
    entries.forEach(entry => {
      obj[entry.key] = entry.english;
    });
    return JSON.stringify(obj, null, 2);
  } else {
    // 嵌套结构
    const obj: Record<string, unknown> = {};
    entries.forEach(entry => {
      const parts = entry.key.split('.');
      let current = obj;
      parts.forEach((part, idx) => {
        if (idx === parts.length - 1) {
          current[part] = entry.english;
        } else {
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part] as Record<string, unknown>;
        }
      });
    });
    return JSON.stringify(obj, null, 2);
  }
}

// 生成 YAML 格式
function generateYaml(entries: TranslationEntry[]): string {
  const obj: Record<string, string> = {};
  entries.forEach(entry => {
    obj[entry.key] = entry.english;
  });
  
  function toYaml(obj: Record<string, string>, indent: number = 0): string {
    const spaces = '  '.repeat(indent);
    let output = '';
    const keys = Object.keys(obj).sort();
    
    keys.forEach(key => {
      const value = obj[key];
      if (value && typeof value === 'object') {
        output += `${spaces}${key}:
${toYaml(value as Record<string, string>, indent + 1)}`;
      } else {
        output += `${spaces}${key}: "${value}"
`;
      }
    });
    return output;
  }
  
  return toYaml(obj);
}

// 生成 .properties 格式
function generateProperties(entries: TranslationEntry[]): string {
  return entries.map(entry => {
    const key = entry.key.replace(/\./g, '_');
    return `${key}=${entry.english}`;
  }).join('\n');
}

// 生成 gettext .po 格式
function generatePo(entries: TranslationEntry[]): string {
  let output = `# Translation File
msgid ""
msgstr ""
"Content-Type: text/plain; charset=UTF-8\\n"
"POT-Creation-Date: ${new Date().toISOString()}\\n"

`;
  
  entries.forEach(entry => {
    output += `#: ${entry.key}
msgid "${entry.key}"
msgstr "${entry.english}"

`;
  });
  
  return output;
}

// 键去重检查
function checkDuplicateKeys(entries: TranslationEntry[]): {
  duplicates: string[];
  missingEnglish: string[];
} {
  const keyCount = new Map<string, number>();
  const duplicates: string[] = [];
  const missingEnglish: string[] = [];
  
  entries.forEach(entry => {
    const count = keyCount.get(entry.key) || 0;
    keyCount.set(entry.key, count + 1);
  });
  
  keyCount.forEach((count, key) => {
    if (count > 1) {
      duplicates.push(key);
    }
  });
  
  entries.forEach(entry => {
    if (!entry.english.trim()) {
      missingEnglish.push(entry.key);
    }
  });
  
  return { duplicates, missingEnglish };
}

export default function I18nHelper() {
  const [inputText, setInputText] = useState('');
  const [activeTab, setActiveTab] = useState<'keyGen' | 'formatGen' | 'batchImport' | 'duplicateCheck'>('keyGen');
  const [namespace, setNamespace] = useState('common');
  const [context, setContext] = useState('App');
  const [copied, setCopied] = useState('');
  const [outputFormat, setOutputFormat] = useState<'qt-ts' | 'json' | 'json-nested' | 'yaml' | 'properties' | 'po'>('qt-ts');
  const toast = useToast();

  // 翻译键列表
  const [entries, setEntries] = useState<TranslationEntry[]>([
    { id: 1, key: 'common.save', chinese: '保存', english: 'Save' },
    { id: 2, key: 'common.cancel', chinese: '取消', english: 'Cancel' },
    { id: 3, key: 'common.confirm', chinese: '确认', english: 'Confirm' },
  ]);
  const [nextId, setNextId] = useState(10);

  // 批量导入文本
  const [batchInput, setBatchInput] = useState('');

  // 键命名生成结果
  const keyStyles = useMemo(() => {
    if (!inputText.trim()) return null;

    const cleanText = inputText.trim();
    return {
      underscore: toUnderscore(cleanText) || 'generated_key',
      camelCase: toCamelCase(cleanText) || 'generatedKey',
      dotSeparated: toDotSeparated(cleanText) || 'generated.key',
      namespace: toNamespace(cleanText, namespace) || `${namespace}.generated`,
    };
  }, [inputText, namespace]);

  // 添加新键
  const handleAddEntry = useCallback(() => {
    setEntries(prev => [...prev, {
      id: nextId,
      key: `common.new_key_${nextId}`,
      chinese: '',
      english: '',
      context: context,
    }]);
    setNextId(prev => prev + 1);
    toast.success('已添加新键');
  }, [nextId, context, toast]);

  // 删除键
  const handleDeleteEntry = useCallback((id: number) => {
    setEntries(prev => prev.filter(e => e.id !== id));
    toast.success('已删除');
  }, [toast]);

  // 更新键
  const handleUpdateEntry = useCallback((id: number, updates: Partial<TranslationEntry>) => {
    setEntries(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
  }, []);

  // 批量导入
  const handleBatchImport = useCallback(() => {
    const lines = batchInput.split('\n').filter(line => line.trim());
    const newEntries = lines.map((line, idx) => {
      const text = line.trim();
      return {
        id: nextId + idx,
        key: toUnderscore(text) || `generated_${idx + 1}`,
        chinese: /[\u4e00-\u9fa5]/.test(text) ? text : '',
        english: /[a-zA-Z]/.test(text) && !/[\u4e00-\u9fa5]/.test(text) ? text : '',
        context: context,
      };
    });
    setEntries(prev => [...prev, ...newEntries]);
    setNextId(prev => prev + lines.length);
    setBatchInput('');
    toast.success(`已导入 ${newEntries.length} 条`);
  }, [batchInput, nextId, context, toast]);

  // 复制到剪贴板
  const handleCopy = useCallback(async (text: string, type: string) => {
    await copyToClipboard(text);
    setCopied(type);
    setTimeout(() => setCopied(''), 2000);
    toast.success('已复制');
  }, [toast]);

  // 复制选中的键名
  const handleCopyKey = useCallback((key: string) => {
    handleCopy(key, key);
  }, [handleCopy]);

  // 使用键名
  const handleUseKey = useCallback((key: string) => {
    setEntries(prev => [...prev, {
      id: nextId,
      key,
      chinese: inputText,
      english: '',
      context: context,
    }]);
    setNextId(prev => prev + 1);
    toast.success(`已添加键: ${key}`);
  }, [nextId, inputText, context, toast]);

  // 复制生成的文件
  const handleCopyOutput = useCallback(async () => {
    let output = '';
    switch (outputFormat) {
      case 'qt-ts':
        output = generateQtTs(entries);
        break;
      case 'json':
        output = generateJson(entries, 'flat');
        break;
      case 'json-nested':
        output = generateJson(entries, 'nested');
        break;
      case 'yaml':
        output = generateYaml(entries);
        break;
      case 'properties':
        output = generateProperties(entries);
        break;
      case 'po':
        output = generatePo(entries);
        break;
    }
    await handleCopy(output, 'output');
  }, [entries, outputFormat, handleCopy]);

  // 去重检查
  const duplicateCheck = useMemo(() => checkDuplicateKeys(entries), [entries]);

  // 下载文件
  const handleDownload = useCallback(() => {
    let output = '';
    let filename = '';
    let mimeType = '';

    switch (outputFormat) {
      case 'qt-ts':
        output = generateQtTs(entries);
        filename = 'translations.ts';
        mimeType = 'application/xml';
        break;
      case 'json':
      case 'json-nested':
        output = generateJson(entries, outputFormat === 'json-nested' ? 'nested' : 'flat');
        filename = 'i18n.json';
        mimeType = 'application/json';
        break;
      case 'yaml':
        output = generateYaml(entries);
        filename = 'i18n.yaml';
        mimeType = 'text/yaml';
        break;
      case 'properties':
        output = generateProperties(entries);
        filename = 'i18n.properties';
        mimeType = 'text/plain';
        break;
      case 'po':
        output = generatePo(entries);
        filename = 'messages.po';
        mimeType = 'text/plain';
        break;
    }

    const blob = new Blob([output], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`已下载 ${filename}`);
  }, [entries, outputFormat, toast]);

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>i18n 翻译辅助</h2>
        <p>翻译键生成 · 多格式导出 · 批量导入 · 去重检查</p>
      </div>

      {/* Tab 选择 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-row">
          <label>功能</label>
          <div className="field btn-group">
            <button
              className={activeTab === 'keyGen' ? '' : 'secondary'}
              onClick={() => setActiveTab('keyGen')}
            >
              键命名
            </button>
            <button
              className={activeTab === 'formatGen' ? '' : 'secondary'}
              onClick={() => setActiveTab('formatGen')}
            >
              格式生成
            </button>
            <button
              className={activeTab === 'batchImport' ? '' : 'secondary'}
              onClick={() => setActiveTab('batchImport')}
            >
              批量导入
            </button>
            <button
              className={activeTab === 'duplicateCheck' ? '' : 'secondary'}
              onClick={() => setActiveTab('duplicateCheck')}
            >
              去重检查
            </button>
          </div>
        </div>
      </div>

      {/* 功能A: 键命名生成 */}
      {activeTab === 'keyGen' && (
        <div className="grid-2-col">
          <div className="tool-panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={16} color="var(--accent)" />
              输入中文文本
            </h3>

            <div className="tool-row">
              <label>命名空间</label>
              <div className="field">
                <input
                  type="text"
                  value={namespace}
                  onChange={e => setNamespace(e.target.value)}
                  placeholder="common"
                  style={{ width: 200 }}
                />
              </div>
            </div>

            <div className="tool-row">
              <label>文本</label>
              <div className="field">
                <textarea
                  placeholder="输入要转换的中文文本，如：用户名不能为空"
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                  rows={4}
                />
              </div>
            </div>
          </div>

          <div className="tool-panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Languages size={16} color="var(--accent)" />
              生成的翻译键名
            </h3>

            {keyStyles ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {[
                  { label: '下划线风格', value: keyStyles.underscore },
                  { label: '驼峰风格', value: keyStyles.camelCase },
                  { label: '点分隔风格', value: keyStyles.dotSeparated },
                  { label: '命名空间风格', value: keyStyles.namespace },
                ].map(({ label, value }) => (
                  <div
                    key={label}
                    style={{
                      padding: 12,
                      background: 'var(--bg3)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onClick={() => handleUseKey(value)}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = 'var(--accent-bg)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = 'var(--bg3)';
                    }}
                  >
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all' }}>
                      {value}
                      <button
                        className="ghost"
                        onClick={e => {
                          e.stopPropagation();
                          handleCopyKey(value);
                        }}
                        style={{ float: 'right', padding: 2 }}
                      >
                        {copied === value ? <Check size={12} /> : <Copy size={12} />}
                      </button>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--accent)', marginTop: 4 }}>点击添加到列表</div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                输入文本后自动生成
              </div>
            )}
          </div>
        </div>
      )}

      {/* 功能B: 格式生成 */}
      {activeTab === 'formatGen' && (
        <div>
          <div className="tool-panel" style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>翻译键列表</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <div className="tool-row" style={{ marginBottom: 0 }}>
                  <label style={{ marginRight: 8 }}>Context</label>
                  <div className="field">
                    <input
                      type="text"
                      value={context}
                      onChange={e => setContext(e.target.value)}
                      placeholder="App"
                      style={{ width: 120 }}
                    />
                  </div>
                </div>
                <button onClick={handleAddEntry}>
                  <Plus size={14} />
                  添加键
                </button>
              </div>
            </div>

            {/* 键值对表格 */}
            <div style={{ maxHeight: 300, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', position: 'sticky', top: 0 }}>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 250 }}>键名</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>中文</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>英文</th>
                    <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 60 }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map(entry => (
                    <tr key={entry.id}>
                      <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          value={entry.key}
                          onChange={e => handleUpdateEntry(entry.id, { key: e.target.value })}
                          style={{ width: '100%', fontFamily: 'var(--font-mono)', fontSize: 12 }}
                        />
                      </td>
                      <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          value={entry.chinese}
                          onChange={e => handleUpdateEntry(entry.id, { chinese: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                        <input
                          type="text"
                          value={entry.english}
                          onChange={e => handleUpdateEntry(entry.id, { english: e.target.value })}
                          style={{ width: '100%' }}
                        />
                      </td>
                      <td style={{ padding: 4, borderBottom: '1px solid var(--border)' }}>
                        <button
                          className="ghost"
                          onClick={() => handleDeleteEntry(entry.id)}
                          style={{ padding: 4, color: 'var(--error)' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="tool-panel">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600 }}>输出格式</h3>
              <div className="field btn-group">
                <button
                  className={outputFormat === 'qt-ts' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('qt-ts')}
                  style={{ fontSize: 11 }}
                >
                  Qt .ts
                </button>
                <button
                  className={outputFormat === 'json' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('json')}
                  style={{ fontSize: 11 }}
                >
                  JSON
                </button>
                <button
                  className={outputFormat === 'json-nested' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('json-nested')}
                  style={{ fontSize: 11 }}
                >
                  JSON嵌套
                </button>
                <button
                  className={outputFormat === 'yaml' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('yaml')}
                  style={{ fontSize: 11 }}
                >
                  YAML
                </button>
                <button
                  className={outputFormat === 'properties' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('properties')}
                  style={{ fontSize: 11 }}
                >
                  .properties
                </button>
                <button
                  className={outputFormat === 'po' ? '' : 'secondary'}
                  onClick={() => setOutputFormat('po')}
                  style={{ fontSize: 11 }}
                >
                  gettext .po
                </button>
              </div>
            </div>

            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              padding: 12,
              background: 'var(--bg3)',
              borderRadius: 6,
              maxHeight: 300,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
            }}>
              {outputFormat === 'qt-ts' && generateQtTs(entries)}
              {outputFormat === 'json' && generateJson(entries, 'flat')}
              {outputFormat === 'json-nested' && generateJson(entries, 'nested')}
              {outputFormat === 'yaml' && generateYaml(entries)}
              {outputFormat === 'properties' && generateProperties(entries)}
              {outputFormat === 'po' && generatePo(entries)}
            </pre>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={handleCopyOutput}>
                {copied === 'output' ? <Check size={14} /> : <Copy size={14} />}
                复制
              </button>
              <button className="secondary" onClick={handleDownload}>
                <Download size={14} />
                下载文件
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 功能C: 批量导入 */}
      {activeTab === 'batchImport' && (
        <div className="grid-2-col">
          <div className="tool-panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>批量导入文本</h3>

            <div className="tool-row">
              <label>Context</label>
              <div className="field">
                <input
                  type="text"
                  value={context}
                  onChange={e => setContext(e.target.value)}
                  placeholder="App"
                  style={{ width: 200 }}
                />
              </div>
            </div>

            <div className="tool-row">
              <label>文本列表</label>
              <div className="field">
                <textarea
                  placeholder="每行一条文本，将自动生成翻译键&#10;用户名&#10;密码&#10;登录"
                  value={batchInput}
                  onChange={e => setBatchInput(e.target.value)}
                  rows={15}
                />
              </div>
            </div>

            <div className="tool-row">
              <label></label>
              <div className="field">
                <button onClick={handleBatchImport}>
                  <Plus size={14} />
                  导入到列表
                </button>
              </div>
            </div>
          </div>

          <div className="tool-panel">
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>导入预览</h3>

            {batchInput ? (
              <div style={{ fontSize: 12 }}>
                <div style={{ marginBottom: 8, color: 'var(--muted)' }}>
                  共 {batchInput.split('\n').filter(l => l.trim()).length} 条
                </div>
                <div style={{ maxHeight: 400, overflow: 'auto' }}>
                  {batchInput.split('\n').filter(l => l.trim()).map((line, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '6px 8px',
                        background: 'var(--bg2)',
                        borderRadius: 4,
                        marginBottom: 4,
                        display: 'flex',
                        justifyContent: 'space-between',
                      }}
                    >
                      <span>{line}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                        {toUnderscore(line) || `generated_${idx + 1}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
                输入文本后预览将显示在这里
              </div>
            )}
          </div>
        </div>
      )}

      {/* 功能D: 去重检查 */}
      {activeTab === 'duplicateCheck' && (
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Languages size={16} color="var(--accent)" />
            翻译键检查
          </h3>

          {/* 检查结果 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            {/* 重复键 */}
            <div style={{ padding: 16, background: duplicateCheck.duplicates.length > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {duplicateCheck.duplicates.length > 0 ? (
                  <AlertTriangle size={18} color="#ef4444" />
                ) : (
                  <CheckCircle2 size={18} color="#22c55e" />
                )}
                <span style={{ fontWeight: 600 }}>重复键</span>
                <span style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 'auto' }}>
                  {duplicateCheck.duplicates.length}
                </span>
              </div>
              {duplicateCheck.duplicates.length > 0 ? (
                <div style={{ fontSize: 12, color: 'var(--error)' }}>
                  {duplicateCheck.duplicates.map(key => (
                    <div key={key} style={{ fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      • {key}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--success)' }}>没有重复键</div>
              )}
            </div>

            {/* 缺失翻译 */}
            <div style={{ padding: 16, background: duplicateCheck.missingEnglish.length > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', borderRadius: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                {duplicateCheck.missingEnglish.length > 0 ? (
                  <AlertTriangle size={18} color="#f59e0b" />
                ) : (
                  <CheckCircle2 size={18} color="#22c55e" />
                )}
                <span style={{ fontWeight: 600 }}>缺失翻译</span>
                <span style={{ fontSize: 20, fontWeight: 'bold', marginLeft: 'auto' }}>
                  {duplicateCheck.missingEnglish.length}
                </span>
              </div>
              {duplicateCheck.missingEnglish.length > 0 ? (
                <div style={{ fontSize: 12, color: 'var(--warning)' }}>
                  {duplicateCheck.missingEnglish.map(key => (
                    <div key={key} style={{ fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
                      • {key}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--success)' }}>所有键都有翻译</div>
              )}
            </div>
          </div>

          {/* 统计信息 */}
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            共 {entries.length} 个翻译键
            {duplicateCheck.duplicates.length === 0 && duplicateCheck.missingEnglish.length === 0 && (
              <span style={{ color: 'var(--success)', marginLeft: 8 }}>✓ 检查通过</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
