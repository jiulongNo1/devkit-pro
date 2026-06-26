import { useState, useCallback, useEffect } from 'react';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import { useToast } from '../../hooks/useToast';
import { copyToClipboard } from '../../utils/storage';
import HistoryPanel from '../../components/HistoryPanel';

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

export default function RegexTester() {
  const [pattern, setPattern] = useState('');
  const [flags, setFlags] = useState('g');
  const [text, setText] = useState('');
  const [matches, setMatches] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [highlighted, setHighlighted] = useState<React.ReactNode[]>([]);
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

  const testRegex = useCallback(() => {
    if (!pattern.trim()) {
      setError('请输入正则表达式');
      setMatches([]);
      setHighlighted([]);
      return;
    }
    try {
      const regex = new RegExp(pattern, flags);
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
      const globalRegex = new RegExp(pattern, flags.includes('g') ? flags : flags + 'g');
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
  }, [pattern, flags, text, addHistory]);

  const handleCopyMatches = useCallback(async () => {
    if (matches.length === 0) return;
    await copyToClipboard(matches.join('\n'));
    toast.success('已复制匹配结果');
  }, [matches, toast]);

  // 注册快捷键：Ctrl+Enter 测试正则，Ctrl+Shift+C 复制匹配结果
  useModuleShortcuts(testRegex, handleCopyMatches);

  useEffect(() => {
    if (pattern && text) {
      testRegex();
    }
  }, [pattern, flags, text]);

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
        <p>正则编写、实时匹配高亮、常用正则模板库</p>
      </div>

      <div className="tool-panel">
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
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}