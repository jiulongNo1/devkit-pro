import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Copy, Check, ChevronUp, ChevronDown, Import, FileCode } from 'lucide-react';

interface EnumValue {
  id: string;
  name: string;
  value: number | null;
  comment: string;
}

const COLORS = ['#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

function getColorForIndex(index: number): string {
  return COLORS[index % COLORS.length];
}

function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

export default function EnumGenerator() {
  const [enumName, setEnumName] = useState('Status');
  const [enumValues, setEnumValues] = useState<EnumValue[]>([
    { id: generateId(), name: 'Pending', value: null, comment: '待处理' },
    { id: generateId(), name: 'Running', value: null, comment: '运行中' },
    { id: generateId(), name: 'Success', value: null, comment: '成功' },
    { id: generateId(), name: 'Failed', value: null, comment: '失败' },
  ]);
  const [activeTab, setActiveTab] = useState<'cpp11' | 'c' | 'qt' | 'csharp' | 'json'>('cpp11');
  const [copied, setCopied] = useState(false);
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const computedValues = useMemo(() => {
    let autoValue = 0;
    return enumValues.map(item => {
      const finalValue = item.value !== null ? item.value : autoValue;
      autoValue = finalValue + 1;
      return { ...item, finalValue };
    });
  }, [enumValues]);

  const addEnumValue = useCallback(() => {
    setEnumValues(prev => [...prev, { id: generateId(), name: '', value: null, comment: '' }]);
  }, []);

  const removeEnumValue = useCallback((id: string) => {
    setEnumValues(prev => prev.filter(item => item.id !== id));
  }, []);

  const updateEnumValue = useCallback((id: string, field: 'name' | 'value' | 'comment', newValue: string | number | null) => {
    setEnumValues(prev => prev.map(item => {
      if (item.id !== id) return item;
      if (field === 'value') {
        const numVal = newValue === '' || newValue === null ? null : Number(newValue);
        return { ...item, [field]: numVal };
      }
      return { ...item, [field]: newValue };
    }));
  }, []);

  const moveEnumValue = useCallback((id: string, direction: 'up' | 'down') => {
    setEnumValues(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;

      const newArr = [...prev];
      const swapIndex = direction === 'up' ? index - 1 : index + 1;
      [newArr[index], newArr[swapIndex]] = [newArr[swapIndex], newArr[index]];
      return newArr;
    });
  }, []);

  const handleImport = useCallback(() => {
    const lines = importText.split(/[,\n\r]+/).map(s => s.trim()).filter(s => s.length > 0);
    if (lines.length === 0) return;

    const newValues: EnumValue[] = lines.map(name => ({
      id: generateId(),
      name: name.replace(/[^a-zA-Z0-9_]/g, '').replace(/^[0-9]/, '_'),
      value: null,
      comment: ''
    }));

    setEnumValues(newValues);
    setImportText('');
    setShowImport(false);
  }, [importText]);

  const generatedCode = useMemo(() => {
    const values = computedValues;
    const name = enumName || 'MyEnum';

    if (values.length === 0) return '';

    switch (activeTab) {
      case 'cpp11': {
        const cpp11Enum = values.map((v, i) => {
          const comma = i < values.length - 1 ? ',' : '';
          const comment = v.comment ? `  // ${v.comment}` : '';
          return `    ${v.name} = ${v.finalValue}${comma}${comment}`;
        }).join('\n');
        const cpp11ToString = values.map(v => `        case ${name}::${v.name}: return "${v.name}";`).join('\n');
        const cpp11FromString = values.map(v => `    if (s == "${v.name}") return ${name}::${v.name};`).join('\n');

        return `enum class ${name} {
${cpp11Enum}
};

constexpr const char* to${name}String(${name} e) {
    switch(e) {
${cpp11ToString}
        default: return "Unknown";
    }
}

std::optional<${name}> stringTo${name}(const std::string& s) {
${cpp11FromString}
    return std::nullopt;
}`;
      }

      case 'c': {
        const cEnum = values.map((v, i) => {
          const comma = i < values.length - 1 ? ',' : '';
          const comment = v.comment ? `  // ${v.comment}` : '';
          return `    ${v.name} = ${v.finalValue}${comma}${comment}`;
        }).join('\n');
        return `typedef enum {
${cEnum}
} ${name};`;
      }

      case 'qt': {
        const qtEnum = values.map((v, i) => {
          const comma = i < values.length - 1 ? ',' : '';
          const comment = v.comment ? `  // ${v.comment}` : '';
          return `    ${v.name} = ${v.finalValue}${comma}${comment}`;
        }).join('\n');
        return `enum ${name} {
${qtEnum}
};
Q_ENUM(${name})`;
      }

      case 'csharp': {
        const csharpEnum = values.map((v, i) => {
          const comma = i < values.length - 1 ? ',' : '';
          const comment = v.comment ? `  // ${v.comment}` : '';
          return `    ${v.name} = ${v.finalValue}${comma}${comment}`;
        }).join('\n');
        return `public enum ${name} {
${csharpEnum}
}`;
      }

      case 'json': {
        const jsonObj: { type: string; enum: string[]; descriptions?: Record<string, string> } = {
          type: "string",
          enum: values.map(v => v.name)
        };
        const hasComments = values.some(v => v.comment);
        if (hasComments) {
          const desc: Record<string, string> = {};
          values.forEach(v => {
            if (v.comment) {
              desc[v.name] = v.comment;
            }
          });
          jsonObj.descriptions = desc;
        }
        return JSON.stringify(jsonObj, null, 2);
      }

      default:
        return '';
    }
  }, [computedValues, enumName, activeTab]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [generatedCode]);

  const tabs = [
    { id: 'cpp11', label: 'C++11 enum class' },
    { id: 'c', label: 'C enum' },
    { id: 'qt', label: 'Qt enum' },
    { id: 'csharp', label: 'C# enum' },
    { id: 'json', label: 'JSON Schema' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>Enum 代码生成器</h2>
        <p>枚举定义 · 多语言生成 · 一键复制</p>
      </div>

      <div className="tool-panel" style={{ marginBottom: 16, padding: 16 }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: 16,
          minHeight: 400
        }}>
          {/* 左侧：枚举值编辑区 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12
          }}>
            {/* 枚举名称 */}
            <div>
              <label style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4, display: 'block' }}>
                枚举名称
              </label>
              <input
                type="text"
                value={enumName}
                onChange={e => setEnumName(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                placeholder="如 Status, Color, FileType"
                style={{
                  width: '100%',
                  padding: 8,
                  fontSize: 14,
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg3)',
                  border: '1px solid var(--border)',
                  borderRadius: 4,
                  color: 'var(--ink)'
                }}
              />
            </div>

            {/* 批量导入 */}
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setShowImport(!showImport)}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'var(--bg2)',
                  color: 'var(--ink)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s'
                }}
              >
                <Import size={14} />
                批量导入
              </button>
              <button
                onClick={addEnumValue}
                style={{
                  padding: '6px 12px',
                  fontSize: 12,
                  borderRadius: 4,
                  border: 'none',
                  cursor: 'pointer',
                  background: 'var(--accent)',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s'
                }}
              >
                <Plus size={14} />
                添加枚举值
              </button>
            </div>

            {/* 导入文本框 */}
            {showImport && (
              <div style={{
                background: 'var(--bg3)',
                padding: 8,
                borderRadius: 4,
                border: '1px solid var(--border)'
              }}>
                <textarea
                  value={importText}
                  onChange={e => setImportText(e.target.value)}
                  placeholder="粘贴逗号或换行分隔的枚举值名称，如：&#10;Pending, Running, Success, Failed&#10;或每行一个名称"
                  style={{
                    width: '100%',
                    minHeight: 80,
                    padding: 8,
                    fontSize: 12,
                    fontFamily: 'var(--font-mono)',
                    background: 'var(--bg2)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    color: 'var(--ink)',
                    resize: 'vertical'
                  }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={handleImport}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'var(--accent)',
                      color: '#fff'
                    }}
                  >
                    导入
                  </button>
                  <button
                    onClick={() => { setShowImport(false); setImportText(''); }}
                    style={{
                      padding: '4px 10px',
                      fontSize: 11,
                      borderRadius: 4,
                      border: 'none',
                      cursor: 'pointer',
                      background: 'var(--bg2)',
                      color: 'var(--ink)'
                    }}
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 枚举值列表 */}
            <div style={{
              flex: 1,
              overflowY: 'auto',
              background: 'var(--bg3)',
              borderRadius: 6,
              padding: 8
            }}>
              {enumValues.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--muted)',
                  padding: 32,
                  fontSize: 13
                }}>
                  暂无枚举值，点击上方按钮添加
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {enumValues.map((item, index) => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                        padding: 8,
                        background: 'var(--bg2)',
                        borderRadius: 4,
                        border: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: '50%',
                            background: getColorForIndex(index)
                          }}
                        />
                        <span style={{ fontSize: 10, color: 'var(--muted)' }}>{index + 1}</span>

                        <button
                          onClick={() => moveEnumValue(item.id, 'up')}
                          disabled={index === 0}
                          style={{
                            padding: 2,
                            border: 'none',
                            background: 'transparent',
                            cursor: index === 0 ? 'not-allowed' : 'pointer',
                            color: index === 0 ? 'var(--muted)' : 'var(--ink)',
                            opacity: index === 0 ? 0.5 : 1
                          }}
                          title="上移"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          onClick={() => moveEnumValue(item.id, 'down')}
                          disabled={index === enumValues.length - 1}
                          style={{
                            padding: 2,
                            border: 'none',
                            background: 'transparent',
                            cursor: index === enumValues.length - 1 ? 'not-allowed' : 'pointer',
                            color: index === enumValues.length - 1 ? 'var(--muted)' : 'var(--ink)',
                            opacity: index === enumValues.length - 1 ? 0.5 : 1
                          }}
                          title="下移"
                        >
                          <ChevronDown size={14} />
                        </button>

                        <input
                          type="text"
                          value={item.name}
                          onChange={e => updateEnumValue(item.id, 'name', e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
                          placeholder="名称"
                          style={{
                            flex: 1,
                            minWidth: 80,
                            padding: 4,
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                            borderRadius: 3,
                            color: 'var(--ink)'
                          }}
                        />

                        <input
                          type="text"
                          value={item.value !== null ? item.value : ''}
                          onChange={e => updateEnumValue(item.id, 'value', e.target.value)}
                          placeholder="自动"
                          style={{
                            width: 50,
                            padding: 4,
                            fontSize: 12,
                            fontFamily: 'var(--font-mono)',
                            background: 'var(--bg3)',
                            border: '1px solid var(--border)',
                            borderRadius: 3,
                            color: 'var(--ink)',
                            textAlign: 'center'
                          }}
                        />

                        <button
                          onClick={() => removeEnumValue(item.id)}
                          style={{
                            padding: 4,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            color: '#ef4444'
                          }}
                          title="删除"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={item.comment}
                        onChange={e => updateEnumValue(item.id, 'comment', e.target.value)}
                        placeholder="注释"
                        style={{
                          width: '100%',
                          padding: 4,
                          fontSize: 12,
                          background: 'var(--bg3)',
                          border: '1px solid var(--border)',
                          borderRadius: 3,
                          color: 'var(--muted)'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 右侧：代码输出区 */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            {/* Tab 切换 */}
            <div style={{
              display: 'flex',
              gap: 4,
              borderBottom: '1px solid var(--border)',
              paddingBottom: 8,
              flexWrap: 'wrap'
            }}>
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    padding: '6px 12px',
                    fontSize: 12,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: activeTab === tab.id ? 'var(--accent)' : 'var(--bg2)',
                    color: activeTab === tab.id ? '#fff' : 'var(--ink)',
                    transition: 'all 0.15s',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* 代码显示区 */}
            <div style={{
              flex: 1,
              background: 'var(--bg3)',
              borderRadius: 6,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <div style={{
                padding: '8px 12px',
                background: 'var(--bg2)',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: 'var(--muted)'
                }}>
                  <FileCode size={14} />
                  {tabs.find(t => t.id === activeTab)?.label}
                </div>
                <button
                  onClick={handleCopy}
                  style={{
                    padding: '4px 10px',
                    fontSize: 11,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: 'var(--bg2)',
                    color: 'var(--ink)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'var(--bg2)'}
                >
                  {copied ? <Check size={12} /> : <Copy size={12} />}
                  {copied ? '已复制' : '复制'}
                </button>
              </div>
              <pre style={{
                flex: 1,
                margin: 0,
                padding: 12,
                fontSize: 13,
                fontFamily: 'var(--font-mono)',
                background: 'var(--bg3)',
                color: 'var(--ink)',
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                lineHeight: 1.5
              }}>
                {generatedCode}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}