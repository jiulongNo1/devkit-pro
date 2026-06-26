import { useState, useCallback } from 'react';
import { Copy, Sparkles, Minimize2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import HistoryPanel from '../../components/HistoryPanel';

const MODULE_ID = 'jsonFormatter';
const MODULE_NAME = 'JSON 格式化';

export default function JsonFormatter() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

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
      // 保存历史记录
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 200),
        output: compress ? '压缩' : '格式化',
      });
    } catch (e) {
      setError('JSON 格式错误: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, addHistory]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    toast.success('已复制');
  }, [output, toast]);

  // 注册快捷键：Ctrl+Enter 格式化，Ctrl+Shift+C 复制
  useModuleShortcuts(() => formatJson(false), handleCopy);

  const handleSelectHistory = (item: { input: string }) => {
    setInput(item.input);
    setOutput('');
    setError('');
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
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
                    <Copy size={16} />
                  </button>
                </>
              ) : (
                <span className="empty-state">格式化后的结果将显示在这里</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}