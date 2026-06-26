import { useState, useCallback } from 'react';
import { Copy, Check, Sparkles, Minimize2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const formatJson = useCallback((compress = false) => {
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      setOutput('');
      return;
    }
    try {
      const parsed = JSON.parse(input);
      const formatted = compress
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2);
      setOutput(formatted);
      setError('');
    } catch (e) {
      setError('JSON 格式错误: ' + (e as Error).message);
      setOutput('');
    }
  }, [input]);

  const handleCopy = async () => {
    if (!output) return;
    await copyToClipboard(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="module-header">
        <h2>JSON 格式化 / 压缩</h2>
        <p>JSON 美化、压缩、校验与树形预览</p>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label>输入</label>
          <div className="field">
            <textarea
              placeholder="在此粘贴 JSON 内容..."
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              rows={8}
            />
          </div>
        </div>

        <div className="tool-row">
          <label></label>
          <div className="field btn-group">
            <button onClick={() => formatJson(false)}>
              <Sparkles size={16} /> 格式化
            </button>
            <button className="secondary" onClick={() => formatJson(true)}>
              <Minimize2 size={16} /> 压缩
            </button>
            <button className="secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>
              清空
            </button>
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
                  <button className="ghost copy-btn" onClick={handleCopy}>
                    {copied ? <Check size={16} className="success-text" /> : <Copy size={16} />}
                  </button>
                </>
              ) : (
                <span className="empty-state">格式化后的结果将显示在这里</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
