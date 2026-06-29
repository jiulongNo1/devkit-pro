/**
 * RegexTester - 正则表达式测试工具
 *
 * 【功能说明】
 * - 正则表达式实时测试
 * - 匹配结果高亮显示
 * - Qt 正则模式支持
 * - C++ Qt 代码生成
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import { useToast } from '../../hooks/useToast';
import { copyToClipboard } from '../../utils/storage';
import HistoryPanel from '../../components/HistoryPanel';
import { Code2, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

const MODULE_ID = 'regexTester';
const MODULE_NAME = '正则测试';

const REGEX_TEMPLATES = [
  { name: '邮箱', pattern: '^[\\w.-]+@[\\w.-]+\\.\\w+$' },
  { name: '手机号(中国)', pattern: '^1[3-9]\\d{9}$' },
  { name: 'URL', pattern: '^(https?|ftp)://[^\\s/$.?#].[^\\s]*$' },
  { name: 'IP地址', pattern: '^(?:(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)\\.){3}(?:25[0-5]|2[0-4]\\d|[01]?\\d\\d?)$' },
  { name: '身份证号', pattern: '^\\d{6}(18|19|20)\\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\\d|3[01])\\d{3}[\\dXx]$' },
  { name: '数字', pattern: '^-?\\d+(\\.\\d+)?$' },
  { name: '中文字符', pattern: '[\\u4e00-\\u9fa5]' },
  { name: '空白字符', pattern: '\\s+' },
];

// Qt 正则与 PCRE/JS 的语法差异
const QT_REGEX_DIFFERENCES = [
  {
    feature: '命名捕获组',
    pcre: '(?P<name>...)',
    qt: '(?<name>...)',
    note: 'Qt 使用 Perl 风格的 (?<name>...) 而不是 Python 风格的 (?P<name>...)',
  },
  {
    feature: '单词边界',
    pcre: '\\b',
    qt: '\\b（支持）',
    note: 'Qt 5.0+ 支持 \\b，但早期版本可能有问题',
  },
  {
    feature: '非贪婪量词',
    pcre: '*?, +?, ??, {n,m}?',
    qt: '相同',
    note: 'Qt 完全支持非贪婪量词',
  },
  {
    feature: '原子组',
    pcre: '(?>...)',
    qt: '不支持',
    note: 'QRegularExpression 不支持原子组 (?>...)',
  },
  {
    feature: '条件表达式',
    pcre: '(?(cond)...)',
    qt: '不支持',
    note: '不支持条件正则表达式',
  },
  {
    feature: '注释',
    pcre: '(?#comment)',
    qt: '不支持',
    note: 'Qt 不支持正则内嵌注释',
  },
  {
    feature: '反向引用',
    pcre: '\\1, \\2, \\g{name}',
    qt: '\\1, \\2, \\g{name}',
    note: 'Qt 支持数字和命名反向引用',
  },
  {
    feature: ' lookahead/lookbehind',
    pcre: '(?=...), (?!...), (?<=...), (?<!...)',
    qt: '完全支持',
    note: 'Qt 5.0+ 完全支持前后查找',
  },
  {
    feature: 'Unicode 属性',
    pcre: '\\p{L}, \\p{N}',
    qt: '\\p{L}, \\p{N}',
    note: 'Qt 支持 Unicode 属性类',
  },
  {
    feature: '模式修饰符',
    pcre: '(?i), (?m), (?s)',
    qt: '需用 QRegularExpression::PatternOptions',
    note: 'Qt 用 setPatternOptions() 设置模式选项',
  },
];

// Qt PatternOptions 映射
const QT_FLAGS_MAP: Record<string, { option: string; desc: string }> = {
  'i': { option: 'CaseInsensitiveOption', desc: '忽略大小写' },
  'm': { option: 'MultilineOption', desc: '多行模式' },
  's': { option: 'DotMatchesEverythingOption', desc: '. 匹配换行' },
  'x': { option: 'ExtendedPatternSyntaxOption', desc: '扩展语法（忽略空白）' },
};

// 检查 Qt 正则兼容性问题
function checkQtCompatibility(pattern: string): { warnings: string[]; suggestions: string[] } {
  const warnings: string[] = [];
  const suggestions: string[] = [];

  // 检查命名捕获组
  if (pattern.includes('?P<')) {
    warnings.push('使用了 Python 风格命名捕获组 (?P<name>...)');
    suggestions.push('建议改为 Qt 风格 (?<name>...)');
  }

  // 检查原子组
  if (pattern.includes('(?>')) {
    warnings.push('使用了原子组 (?>...)，Qt 不支持');
    suggestions.push('考虑改用普通分组 (...) 或其他替代方案');
  }

  // 检查条件表达式
  if (/\(\?\(/.test(pattern)) {
    warnings.push('使用了条件正则表达式，Qt 不支持');
    suggestions.push('需要拆分为多个正则表达式处理');
  }

  // 检查注释
  if (/\(\?#[^)]*\)/.test(pattern)) {
    warnings.push('使用了正则内嵌注释 (?#...)，Qt 不支持');
    suggestions.push('移除注释或使用外部注释说明');
  }

  return { warnings, suggestions };
}

// 转换正则表达式为 Qt 兼容格式
function convertToQtRegex(pattern: string): string {
  let qtPattern = pattern;

  // 转换命名捕获组：(?P<name>...) -> (?<name>...)
  qtPattern = qtPattern.replace(/\(\?P<([^>]+)>/, '(?<$1>');

  // 移除注释
  qtPattern = qtPattern.replace(/\(\?#[^)]*\)/, '');

  return qtPattern;
}

// 生成 Qt C++ 代码
function generateQtCode(pattern: string, flags: string, hasMatch: boolean): string {
  const qtPattern = convertToQtRegex(pattern);
  const options: string[] = [];

  // 解析 flags
  flags.split('').forEach(f => {
    if (QT_FLAGS_MAP[f]) {
      options.push(`QRegularExpression::${QT_FLAGS_MAP[f].option}`);
    }
  });

  const optionsStr = options.length > 0
    ? ` | ${options.join(' | ')}`
    : '';

  let code = `#include <QRegularExpression>
#include <QString>

// 正则表达式定义
QRegularExpression re("${qtPattern.replace(/"/g, '\\"')}"${optionsStr});

// 匹配文本
QString text = "your text here";
QRegularExpressionMatch match = re.match(text);

`;

  if (hasMatch) {
    code += `// 检查匹配结果
if (match.hasMatch()) {
    // 获取整个匹配
    QString matched = match.captured(0);
    
    // 获取捕获组（按索引）
    QString group1 = match.captured(1);  // 第一个捕获组
    
    // 获取命名捕获组
    QString namedGroup = match.captured("groupName");  // 命名捕获组
    
    // 获取匹配位置
    int startPos = match.capturedStart();
    int endPos = match.capturedEnd();
    int length = match.capturedLength();
}

// 全局匹配（查找所有匹配）
QRegularExpressionMatchIterator it = re.globalMatch(text);
while (it.hasNext()) {
    QRegularExpressionMatch m = it.next();
    QString matched = m.captured(0);
    // 处理每个匹配...
}`;
  } else {
    code += `// 检查是否有匹配
if (match.hasMatch()) {
    // 有匹配结果
} else {
    // 无匹配
}`;
  }

  return code;
}

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [highlighted, setHighlighted] = useState<React.ReactNode[]>([]);
  const [qtMode, setQtMode] = useState(false);
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

  // Qt 兼容性检查
  const qtCompatibility = useMemo(() => {
    if (!qtMode || !pattern) return { warnings: [], suggestions: [] };
    return checkQtCompatibility(pattern);
  }, [qtMode, pattern]);

  // Qt 转换后的正则
  const qtPattern = useMemo(() => {
    if (!qtMode) return pattern;
    return convertToQtRegex(pattern);
  }, [qtMode, pattern]);

  // Qt 代码生成
  const qtCode = useMemo(() => {
    if (!qtMode || !pattern) return '';
    return generateQtCode(pattern, flags.replace('g', ''), matches.length > 0);
  }, [qtMode, pattern, flags, matches.length]);

  const testRegex = useCallback(() => {
    if (!pattern.trim()) {
      setError('请输入正则表达式');
      setMatches([]);
      setHighlighted([]);
      return;
    }
    try {
      // Qt 模式下使用转换后的正则测试（JS 不完全支持 Qt 语法，但基本兼容）
      const testPattern = qtMode ? qtPattern : pattern;
      const regex = new RegExp(testPattern, flags);
      const result: string[] = [];
      let m;
      if (flags.includes('g')) {
        while ((m = regex.exec(text)) !== null) {
          result.push(m[0]);
          if (m[0] === '') break;
        }
      } else {
        m = regex.exec(text);
        if (m) result.push(m[0]);
      }
      setMatches(result);
      setError('');

      // 高亮显示
      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const globalRegex = new RegExp(testPattern, flags.includes('g') ? flags : flags + 'g');
      let match;
      const seen = new Set<number>();
      while ((match = globalRegex.exec(text)) !== null) {
        if (seen.has(match.index)) break;
        seen.add(match.index);
        if (match.index > lastIndex) {
          parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex, match.index)}</span>);
        }
        parts.push(
          <mark key={`m${match.index}`} style={{ background: 'var(--accent-bg)', color: 'var(--accent)', padding: '1px 3px', borderRadius: 3, fontWeight: 600 }}>
            {match[0]}
          </mark>
        );
        lastIndex = match.index + match[0].length;
        if (match[0] === '') break;
      }
      if (lastIndex < text.length) {
        parts.push(<span key={`t${lastIndex}`}>{text.slice(lastIndex)}</span>);
      }
      setHighlighted(parts.length ? parts : [<span key="all">{text}</span>]);
      
      // 保存历史记录（当有匹配结果时）
      if (result.length > 0 && text.trim()) {
        addHistory({
          moduleId: MODULE_ID,
          moduleName: MODULE_NAME,
          input: `/${pattern}/${flags} - ${text.slice(0, 100)}`,
          output: `匹配 ${result.length} 处`,
        });
      }
    } catch (e) {
      setError('正则表达式错误: ' + (e as Error).message);
      setMatches([]);
      setHighlighted([]);
    }
  }, [pattern, flags, text, qtMode, qtPattern, addHistory]);

  const handleCopyMatches = useCallback(async () => {
    if (matches.length === 0) return;
    await copyToClipboard(matches.join('\n'));
    toast.success('已复制匹配结果');
  }, [matches, toast]);

  const handleCopyQtCode = useCallback(async () => {
    if (!qtCode) return;
    await copyToClipboard(qtCode);
    toast.success('已复制 Qt 代码');
  }, [qtCode, toast]);

  // 注册快捷键：Ctrl+Enter 测试正则，Ctrl+Shift+C 复制匹配结果
  useModuleShortcuts(testRegex, handleCopyMatches);

  useEffect(() => {
    if (pattern && text) {
      testRegex();
    }
  }, [pattern, flags, text, qtMode]);

  const applyTemplate = (p: string) => {
    setPattern(p);
  };

  const handleSelectHistory = (item: { input: string }) => {
    // 解析历史记录中的正则表达式
    const match = item.input.match(/^\/(.+?)\/(\w*)\s*-\s*(.*)$/);
    if (match) {
      setPattern(match[1]);
      setFlags(match[2] || 'g');
      setText(match[3] || '');
    }
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  return (
    <div>
      <div className="module-header">
        <h2>正则表达式测试</h2>
        <p>正则编写、实时匹配高亮、常用正则模板库、Qt 正则模式</p>
      </div>

      <div className="tool-panel">
        {/* Qt 模式开关 */}
        <div className="tool-row">
          <label>模式</label>
          <div className="field" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button
              className={!qtMode ? '' : 'secondary'}
              onClick={() => setQtMode(false)}
              style={{ fontSize: 12 }}
            >
              JavaScript
            </button>
            <button
              className={qtMode ? '' : 'secondary'}
              onClick={() => setQtMode(true)}
              style={{ fontSize: 12 }}
            >
              <Code2 size={14} style={{ marginRight: 4 }} />
              Qt 模式
            </button>
            {qtMode && (
              <span style={{ fontSize: 12, color: 'var(--accent)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Info size={14} />
                QRegularExpression
              </span>
            )}
          </div>
        </div>

        <div className="tool-row">
          <label>表达式</label>
          <div className="field" style={{ display: 'flex', gap: 8 }}>
            <span style={{ padding: '10px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>/</span>
            <input
              placeholder="输入正则表达式，如: \d+"
              value={pattern}
              onChange={e => setPattern(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <span style={{ padding: '10px 0', color: 'var(--muted)', fontFamily: 'var(--font-mono)' }}>/</span>
            <input
              placeholder="flags"
              value={flags}
              onChange={e => setFlags(e.target.value)}
              style={{ width: 80, fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        {/* Qt 转换后的正则显示 */}
        {qtMode && qtPattern !== pattern && (
          <div className="tool-row">
            <label>Qt 兼容格式</label>
            <div className="field">
              <div style={{
                padding: 8,
                background: 'rgba(34, 197, 94, 0.1)',
                borderRadius: 6,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                color: 'var(--success)',
              }}>
                <CheckCircle2 size={14} style={{ marginRight: 8 }} />
                {qtPattern}
              </div>
            </div>
          </div>
        )}

        {/* Qt 兼容性警告 */}
        {qtMode && qtCompatibility.warnings.length > 0 && (
          <div className="tool-row">
            <label>兼容性提示</label>
            <div className="field">
              <div style={{
                padding: 12,
                background: 'rgba(239, 68, 68, 0.1)',
                borderRadius: 8,
                fontSize: 12,
              }}>
                {qtCompatibility.warnings.map((w, idx) => (
                  <div key={idx} style={{ marginBottom: 8, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                    <AlertTriangle size={14} color="#ef4444" style={{ marginTop: 2 }} />
                    <div>
                      <div style={{ color: '#ef4444', fontWeight: 500 }}>{w}</div>
                      {qtCompatibility.suggestions[idx] && (
                        <div style={{ color: 'var(--muted)', marginTop: 4 }}>{qtCompatibility.suggestions[idx]}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="tool-row">
          <label>常用模板</label>
          <div className="field btn-group">
            {REGEX_TEMPLATES.map(t => (
              <button key={t.name} className="secondary" onClick={() => applyTemplate(t.pattern)}>
                {t.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-row">
          <label>测试文本</label>
          <div className="field">
            <textarea
              placeholder="输入要匹配的文本..."
              value={text}
              onChange={e => setText(e.target.value)}
              rows={6}
            />
          </div>
        </div>

        {error && (
          <div className="tool-row">
            <label></label>
            <div className="field error-text">{error}</div>
          </div>
        )}

        {text && !error && (
          <>
            <div className="tool-row">
              <label>高亮结果</label>
              <div className="field">
                <div className="output-box" style={{ minHeight: 60, lineHeight: 1.8 }}>
                  {highlighted.length ? highlighted : <span className="empty-state">无匹配</span>}
                </div>
              </div>
            </div>

            <div className="tool-row">
              <label>匹配结果</label>
              <div className="field">
                <div className="output-box">
                  {matches.length > 0 ? (
                    <>
                      <div className="success-text" style={{ marginBottom: 8 }}>共匹配 {matches.length} 处</div>
                      {matches.map((m, i) => (
                        <div key={i} style={{ marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
                          [{i + 1}] {m}
                        </div>
                      ))}
                    </>
                  ) : (
                    <span className="empty-state">无匹配结果</span>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Qt C++ 代码 */}
        {qtMode && pattern && (
          <div className="tool-row">
            <label>Qt C++ 代码</label>
            <div className="field">
              <div style={{
                padding: 12,
                background: 'var(--bg3)',
                borderRadius: 8,
                fontFamily: 'var(--font-mono)',
                fontSize: 12,
                maxHeight: 300,
                overflow: 'auto',
              }}>
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{qtCode}</pre>
                <button
                  className="secondary"
                  onClick={handleCopyQtCode}
                  style={{ fontSize: 12, marginTop: 12 }}
                >
                  <Code2 size={14} style={{ marginRight: 4 }} />
                  复制 Qt 代码
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Qt 正则语法差异表 */}
      {qtMode && (
        <div className="tool-panel" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Info size={16} color="var(--accent)" />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Qt 正则与 PCRE/JS 语法差异</h3>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'var(--bg2)' }}>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>特性</th>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>PCRE/JS</th>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Qt</th>
                <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>说明</th>
              </tr>
            </thead>
            <tbody>
              {QT_REGEX_DIFFERENCES.map((diff, idx) => (
                <tr key={idx}>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontWeight: 500 }}>{diff.feature}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{diff.pcre}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)', color: diff.qt === '不支持' ? '#ef4444' : 'var(--success)' }}>{diff.qt}</td>
                  <td style={{ padding: 8, borderBottom: '1px solid var(--border)', color: 'var(--muted)' }}>{diff.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Qt Flags 映射表 */}
      {qtMode && (
        <div className="tool-panel" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Info size={16} color="var(--accent)" />
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Qt PatternOptions 映射</h3>
          </div>
          <div style={{ fontSize: 12 }}>
            <p style={{ marginBottom: 8 }}>Qt 使用 <code style={{ fontFamily: 'var(--font-mono)' }}>setPatternOptions()</code> 设置模式选项，对应的 JavaScript flags：</p>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg2)' }}>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>JS Flag</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>Qt Option</th>
                  <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>说明</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(QT_FLAGS_MAP).map(([flag, info]) => (
                  <tr key={flag}>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{flag}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>{info.option}</td>
                    <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>{info.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}