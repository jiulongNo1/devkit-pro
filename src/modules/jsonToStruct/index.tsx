/**
 * JsonToStruct - JSON 转 C++ Struct 生成器
 *
 * 【功能说明】
 * - JSON 解析并自动生成 C++ struct 定义
 * - 支持现代 C++ / Qt / C 三种风格
 * - 嵌套对象自动生成嵌套 struct
 * - nlohmann/json 序列化支持
 */

import { useState, useMemo, useCallback } from 'react';
import { FileJson2, Copy, Check } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

type Style = 'cpp' | 'qt' | 'c';
type StringType = 'std_string' | 'qstring' | 'const_char';

interface Field {
  name: string;
  type: string;
  isOptional: boolean;
  isArray: boolean;
  arrayType?: string;
  nestedStruct?: string;
}

interface StructDef {
  name: string;
  fields: Field[];
}

// 示例 JSON 模板
const EXAMPLES = [
  {
    name: '用户信息',
    json: `{
  "id": 123,
  "name": "张三",
  "email": "zhangsan@example.com",
  "age": 25,
  "is_active": true,
  "score": 95.5,
  "tags": ["admin", "developer"],
  "address": {
    "city": "北京",
    "street": "朝阳区",
    "zipcode": "100000"
  }
}`
  },
  {
    name: 'API 响应',
    json: `{
  "code": 200,
  "message": "success",
  "data": {
    "total": 100,
    "items": [
      {
        "id": 1,
        "title": "Item 1",
        "price": 99.99
      },
      {
        "id": 2,
        "title": "Item 2",
        "price": 199.99
      }
    ]
  },
  "timestamp": 1719712345
}`
  },
  {
    name: '配置文件',
    json: `{
  "app_name": "DevKit Pro",
  "version": "1.0.0",
  "debug": false,
  "timeout": 3000,
  "servers": [
    {"host": "localhost", "port": 8080},
    {"host": "api.example.com", "port": 443}
  ],
  "settings": {
    "theme": "dark",
    "font_size": 14
  }
}`
  }
];

// 判断数值类型
function detectNumberType(value: number): 'int' | 'int64' | 'double' {
  if (Number.isInteger(value)) {
    if (value >= -2147483648 && value <= 2147483647) return 'int';
    return 'int64';
  }
  return 'double';
}

// 获取字段类型
function getFieldType(value: unknown, style: Style, stringType: StringType): string {
  if (value === null) return 'null';
  
  switch (typeof value) {
    case 'string':
      if (style === 'qt') return 'QString';
      if (style === 'c') return 'const char*';
      if (stringType === 'const_char') return 'const char*';
      return 'std::string';
    case 'number':
      const numType = detectNumberType(value);
      if (numType === 'int') return 'int';
      if (numType === 'int64') return style === 'c' ? 'long long' : 'int64_t';
      return 'double';
    case 'boolean':
      return style === 'c' ? 'int' : 'bool';
    case 'object':
      return 'object';
    case 'undefined':
      return 'null';
    default:
      return 'std::string';
  }
}

// 首字母大写
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 生成结构体名
function generateStructName(baseName: string, index: number = 0): string {
  const sanitized = baseName.replace(/[^a-zA-Z0-9_]/g, '_');
  return capitalize(sanitized) + (index > 0 ? capitalize(`_${index}`) : '') + 'Data';
}

// 解析 JSON 生成结构体定义
function parseJSONToStructs(
  json: unknown,
  style: Style,
  stringType: StringType,
  useOptional: boolean,
  structName: string = 'Root'
): StructDef[] {
  const structs: StructDef[] = [];

  if (typeof json !== 'object' || json === null) {
    return structs;
  }

  const obj = json as Record<string, unknown>;
  const fields: Field[] = [];
  const nestedStructs: StructDef[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const isNull = value === null;
    const isArray = Array.isArray(value);
    const itemValue = isArray && value.length > 0 ? value[0] : value;
    const fieldType = getFieldType(itemValue, style, stringType);

    let field: Field = {
      name: key,
      type: fieldType,
      isOptional: useOptional && isNull,
      isArray
    };

    if (isArray) {
      field.arrayType = fieldType;
      if (fieldType === 'object' && itemValue && typeof itemValue === 'object') {
        const nestedName = generateStructName(key);
        const nested = parseJSONToStructs(itemValue, style, stringType, useOptional, nestedName);
        nestedStructs.push(...nested);
        field.arrayType = nestedName;
        field.type = nestedName;
      }
    } else if (fieldType === 'object') {
      const nestedName = generateStructName(key);
      const nested = parseJSONToStructs(value, style, stringType, useOptional, nestedName);
      nestedStructs.push(...nested);
      field.type = nestedName;
    }

    fields.push(field);
  }

  structs.push(...nestedStructs);
  structs.push({ name: generateStructName(structName), fields });

  return structs;
}

// 生成 struct 代码
function generateStructCode(
  structs: StructDef[],
  style: Style,
  useOptional: boolean,
  useNlohmann: boolean,
  generateSerialize: boolean
): string {
  let code = '';

  // 头文件
  if (style === 'cpp' || (style === 'qt' && useNlohmann)) {
    code += '#include <iostream>\n';
    code += '#include <string>\n';
    code += '#include <vector>\n';
    if (useOptional) code += '#include <optional>\n';
    if (useNlohmann) code += '#include <nlohmann/json.hpp>\n\n';
  } else if (style === 'qt') {
    code += '#include <QString>\n';
    code += '#include <QJsonDocument>\n';
    code += '#include <QJsonObject>\n';
    code += '#include <QJsonArray>\n\n';
  } else {
    code += '#include <stdio.h>\n';
    code += '#include <string.h>\n\n';
  }

  // nlohmann json 命名空间
  if (useNlohmann) {
    code += 'using json = nlohmann::json;\n\n';
  }

  // 结构体定义
  for (const structDef of structs) {
    if (style === 'c') {
      code += `typedef struct {\n`;
    } else {
      code += `struct ${structDef.name} {\n`;
    }

    for (const field of structDef.fields) {
      let type = field.type;
      
      if (style === 'c') {
        if (type === 'std::string') type = 'char';
        if (type === 'QString') type = 'char';
        if (field.isArray) {
          type = `struct ${field.arrayType}*`;
        } else if (type.startsWith('struct ')) {
          type = type;
        } else if (type === 'char') {
          type = 'char';
        }
      } else {
        if (field.isOptional && type !== 'null') {
          type = `std::optional<${type}>`;
        }
        if (field.isArray) {
          type = `std::vector<${field.arrayType}>`;
        }
      }

      const fieldName = style === 'c' ? field.name : `  ${field.name}`;
      const suffix = style === 'c' && (type === 'char' || type === 'char*') ? '[256]' : '';
      const init = field.isOptional && style !== 'c' ? '{}' : '';
      
      code += `  ${type} ${fieldName}${suffix}${init};\n`;
    }

    code += '};\n\n';

    // 序列化函数
    if (generateSerialize && style !== 'c') {
      if (useNlohmann) {
        // to_json
        code += `void to_json(json& j, const ${structDef.name}& obj) {\n`;
        for (const field of structDef.fields) {
          const access = field.isOptional ? `obj.${field.name}.value_or({})` : `obj.${field.name}`;
          code += `  j["${field.name}"] = ${access};\n`;
        }
        code += '}\n\n';

        // from_json
        code += `void from_json(const json& j, ${structDef.name}& obj) {\n`;
        for (const field of structDef.fields) {
          if (field.isOptional) {
            code += `  if (j.contains("${field.name}")) j.at("${field.name}").get_to(obj.${field.name});\n`;
          } else {
            code += `  j.at("${field.name}").get_to(obj.${field.name});\n`;
          }
        }
        code += '}\n\n';
      } else if (style === 'qt') {
        // toJsonObject
        code += `QJsonObject ${structDef.name}::toJsonObject() const {\n`;
        code += `  QJsonObject obj;\n`;
        for (const field of structDef.fields) {
          code += `  obj["${field.name}"] = ${field.name};\n`;
        }
        code += `  return obj;\n`;
        code += '}\n\n';

        // fromJsonObject
        code += `void ${structDef.name}::fromJsonObject(const QJsonObject& obj) {\n`;
        for (const field of structDef.fields) {
          code += `  ${field.name} = obj["${field.name}"].toString();\n`;
        }
        code += '}\n\n';
      }
    }
  }

  // 使用示例
  if (structs.length > 0) {
    const rootName = structs[structs.length - 1].name;
    code += `// 使用示例\n`;
    if (useNlohmann) {
      code += `/*\n`;
      code += `json j = R"(\n`;
      code += `  {"key": "value"}\n`;
      code += `)"_json;\n`;
      code += `${rootName} data = j.get<${rootName}>();\n`;
      code += `json out = data;\n`;
      code += `std::cout << out.dump(2) << std::endl;\n`;
      code += `*/\n`;
    } else if (style === 'qt') {
      code += `/*\n`;
      code += `QJsonDocument doc = QJsonDocument::fromJson(jsonString.toUtf8());\n`;
      code += `${rootName} data;\n`;
      code += `data.fromJsonObject(doc.object());\n`;
      code += `QJsonDocument outDoc(data.toJsonObject());\n`;
      code += `qDebug() << outDoc.toJson(QJsonDocument::Indented);\n`;
      code += `*/\n`;
    } else {
      code += `/*\n`;
      code += `${rootName} data;\n`;
      code += `// 手动解析 JSON 数据\n`;
      code += `*/\n`;
    }
  }

  return code;
}

// 语法高亮
function highlightCode(code: string): React.ReactNode[] {
  const keywords = ['struct', 'typedef', 'const', 'void', 'int', 'double', 'bool', 'char', 'long', 'using', 'namespace', 'class', 'public', 'private', 'protected', 'virtual', 'inline', 'static', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'throw', 'try', 'catch'];
  const types = ['std::string', 'std::vector', 'std::optional', 'int64_t', 'QString', 'QJsonObject', 'QJsonArray', 'QJsonDocument', 'json'];
  const parts: React.ReactNode[] = [];
  let remaining = code;

  while (remaining.length > 0) {
    let matched = false;

    // 字符串
    const stringMatch = remaining.match(/^("[^"]*"|'[^']*'|`[^`]*`)/);
    if (stringMatch) {
      parts.push(<span key={`str-${parts.length}`} style={{ color: '#10b981' }}>{stringMatch[0]}</span>);
      remaining = remaining.slice(stringMatch[0].length);
      matched = true;
      continue;
    }

    // 注释
    const commentMatch = remaining.match(/^(\/\/.*?$|\/\*[\s\S]*?\*\/)/m);
    if (commentMatch) {
      parts.push(<span key={`cmt-${parts.length}`} style={{ color: '#6b7280', fontStyle: 'italic' }}>{commentMatch[0]}</span>);
      remaining = remaining.slice(commentMatch[0].length);
      matched = true;
      continue;
    }

    // 数字
    const numberMatch = remaining.match(/^\b(\d+(\.\d+)?)\b/);
    if (numberMatch) {
      parts.push(<span key={`num-${parts.length}`} style={{ color: '#f59e0b' }}>{numberMatch[0]}</span>);
      remaining = remaining.slice(numberMatch[0].length);
      matched = true;
      continue;
    }

    // 类型
    for (const type of types) {
      if (remaining.startsWith(type + ' ') || remaining.startsWith(type + '\t') || remaining.startsWith(type + '\n') || remaining.startsWith(type + ';')) {
        parts.push(<span key={`type-${parts.length}`} style={{ color: '#8b5cf6', fontWeight: 600 }}>{type}</span>);
        remaining = remaining.slice(type.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 关键字
    for (const keyword of keywords) {
      const regex = new RegExp(`^\\b${keyword}\\b`);
      if (regex.test(remaining)) {
        parts.push(<span key={`kw-${parts.length}`} style={{ color: '#ef4444', fontWeight: 600 }}>{keyword}</span>);
        remaining = remaining.slice(keyword.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    // 普通文本
    parts.push(<span key={`text-${parts.length}`}>{remaining[0]}</span>);
    remaining = remaining.slice(1);
  }

  return parts;
}

export default function JsonToStruct() {
  const [jsonInput, setJsonInput] = useState('');
  const [style, setStyle] = useState<Style>('cpp');
  const [stringType, setStringType] = useState<StringType>('std_string');
  const [useOptional, setUseOptional] = useState(true);
  const [useNlohmann, setUseNlohmann] = useState(true);
  const [generateSerialize, setGenerateSerialize] = useState(true);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const toast = useToast();

  // 格式化 JSON
  const formatJSON = useCallback((input: string) => {
    try {
      const parsed = JSON.parse(input);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return input;
    }
  }, []);

  // 加载示例
  const handleLoadExample = useCallback((example: typeof EXAMPLES[0]) => {
    setJsonInput(example.json);
    setError('');
    toast.success(`已加载示例：${example.name}`);
  }, [toast]);

  // 格式化输入
  const handleFormat = useCallback(() => {
    try {
      const formatted = formatJSON(jsonInput);
      setJsonInput(formatted);
      setError('');
      toast.success('JSON 已格式化');
    } catch (e) {
      setError('无效的 JSON 格式');
      toast.error('JSON 格式错误');
    }
  }, [jsonInput, formatJSON, toast]);

  // 解析 JSON 并生成代码
  const { generatedCode } = useMemo(() => {
    if (!jsonInput.trim()) {
      return { generatedCode: '' };
    }

    try {
      const parsed = JSON.parse(jsonInput);
      const structs = parseJSONToStructs(parsed, style, stringType, useOptional);
      const code = generateStructCode(structs, style, useOptional, useNlohmann, generateSerialize);
      setError('');
      return { generatedCode: code };
    } catch (e) {
      setError('JSON 解析错误');
      return { generatedCode: '' };
    }
  }, [jsonInput, style, stringType, useOptional, useNlohmann, generateSerialize]);

  // 复制代码
  const handleCopy = useCallback(() => {
    if (!generatedCode) return;
    copyToClipboard(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('代码已复制');
  }, [generatedCode, toast]);

  const styles = [
    { id: 'cpp' as Style, name: '现代 C++' },
    { id: 'qt' as Style, name: 'Qt 风格' },
    { id: 'c' as Style, name: 'C 结构体' },
  ];

  const stringTypes = [
    { id: 'std_string' as StringType, name: 'std::string' },
    { id: 'qstring' as StringType, name: 'QString' },
    { id: 'const_char' as StringType, name: 'const char*' },
  ];

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto' }}>
      <div className="module-header">
        <h2>JSON → C++ Struct 生成器</h2>
        <p>JSON 解析 · 自动生成结构体 · 序列化支持</p>
      </div>

      {/* 选项设置 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        {/* 风格选择 */}
        <div className="tool-row">
          <label>代码风格</label>
          <div className="field btn-group" style={{ maxWidth: 260 }}>
            {styles.map(s => (
              <button
                key={s.id}
                className={style === s.id ? '' : 'secondary'}
                onClick={() => setStyle(s.id)}
                style={{ fontSize: 12 }}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        {/* 生成选项 */}
        <div className="tool-row">
          <label>生成选项</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useNlohmann}
                  onChange={e => setUseNlohmann(e.target.checked)}
                  disabled={style === 'c'}
                  style={{ cursor: 'pointer' }}
                />
                使用 nlohmann/json
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={generateSerialize}
                  onChange={e => setGenerateSerialize(e.target.checked)}
                  disabled={style === 'c'}
                  style={{ cursor: 'pointer' }}
                />
                生成序列化函数
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={useOptional}
                  onChange={e => setUseOptional(e.target.checked)}
                  disabled={style === 'c'}
                  style={{ cursor: 'pointer' }}
                />
                使用 std::optional
              </label>
              {style === 'cpp' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, cursor: 'pointer' }}>
                  <span style={{ color: 'var(--muted)' }}>字符串类型:</span>
                  <select
                    value={stringType}
                    onChange={e => setStringType(e.target.value as StringType)}
                    style={{
                      padding: 4,
                      fontSize: 11,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--ink)'
                    }}
                  >
                    {stringTypes.map(st => (
                      <option key={st.id} value={st.id}>{st.name}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* 示例模板 */}
        <div className="tool-row">
          <label>示例模板</label>
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
                  <div style={{ fontWeight: 500 }}>{ex.name}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 左右双栏布局 */}
      <div className="grid-2-col">
        {/* 左侧：JSON 输入 */}
        <div className="tool-panel">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileJson2 size={16} color="var(--accent)" />
              JSON 输入
            </h3>
            <button className="ghost" onClick={handleFormat} style={{ fontSize: 12 }}>
              格式化
            </button>
          </div>

          {error && (
            <div style={{
              color: 'var(--error)',
              fontSize: 12,
              marginBottom: 8,
              padding: 8,
              background: 'rgba(239, 68, 68, 0.1)',
              borderRadius: 4
            }}>
              {error}
            </div>
          )}

          <textarea
            value={jsonInput}
            onChange={e => {
              setJsonInput(e.target.value);
              setError('');
            }}
            rows={20}
            placeholder='{"name": "value", "number": 123}'
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 13,
              width: '100%',
              height: 'calc(100% - 60px)'
            }}
          />
        </div>

        {/* 右侧：生成结果 */}
        <div className="tool-panel">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <FileJson2 size={16} color="var(--accent)" />
              生成的代码
            </h3>
            <button
              className="ghost"
              onClick={handleCopy}
              disabled={!generatedCode}
              style={{ fontSize: 12 }}
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制'}
            </button>
          </div>

          {generatedCode ? (
            <pre style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              maxHeight: 'calc(100vh - 380px)',
              overflowY: 'auto',
              padding: 12,
              background: 'var(--bg3)',
              borderRadius: 6,
              color: 'var(--ink)'
            }}>
              {highlightCode(generatedCode)}
            </pre>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: 'calc(100vh - 380px)',
              color: 'var(--muted)',
              fontSize: 14
            }}>
              请输入 JSON 数据生成代码
            </div>
          )}
        </div>
      </div>

      {/* 类型映射说明 */}
      <div className="tool-panel" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>类型映射规则</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 120 }}>JSON 类型</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 150 }}>现代 C++</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 150 }}>Qt 风格</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>C 结构体</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>string</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>std::string</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>QString</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>char[256]</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>number (int)</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>int / int64_t</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>int / int64_t</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>int / long long</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>number (float)</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>double</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>double</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>double</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>boolean</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>bool</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#ef4444' }}>bool</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>int</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>null</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>std::optional&lt;T&gt;</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>QVariant</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>-</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>object</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>struct</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>struct</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>struct</td>
            </tr>
            <tr>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>array</td>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>std::vector&lt;T&gt;</td>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)', color: '#8b5cf6' }}>QList&lt;T&gt;</td>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>struct*[]</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}