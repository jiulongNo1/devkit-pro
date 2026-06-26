import { useState, useCallback } from 'react';
import { Copy, ArrowRightLeft } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import HistoryPanel from '../../components/HistoryPanel';

type EncodeType = 'base64' | 'url' | 'html' | 'unicode';

const MODULE_ID = 'encoder';
const MODULE_NAME = '编码转换';

const ENCODERS: { id: EncodeType; name: string; encode: (s: string) => string; decode: (s: string) => string }[] = [
  {
    id: 'base64',
    name: 'Base64',
    encode: s => btoa(unescape(encodeURIComponent(s))),
    decode: s => decodeURIComponent(escape(atob(s))),
  },
  {
    id: 'url',
    name: 'URL 编码',
    encode: s => encodeURIComponent(s),
    decode: s => decodeURIComponent(s),
  },
  {
    id: 'html',
    name: 'HTML 实体',
    encode: s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' }[c]!)),
    decode: s => s.replace(/&(?:amp|lt|gt|quot|#x27|#39);/g, e => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'" }[e]!)),
  },
  {
    id: 'unicode',
    name: 'Unicode',
    encode: s => Array.from(s).map(c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(''),
    decode: s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
  },
];

export default function Encoder() {
  const [type, setType] = useState<EncodeType>('base64');
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

  const current = ENCODERS.find(e => e.id === type)!;

  const handleEncode = useCallback(() => {
    if (!input) { setError(''); setOutput(''); return; }
    try {
      const result = current.encode(input);
      setOutput(result);
      setError('');
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 100),
        output: `[${current.name}编码] ${result.slice(0, 100)}`,
      });
    } catch (e) {
      setError('编码失败: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, current, addHistory]);

  const handleDecode = useCallback(() => {
    if (!input) { setError(''); setOutput(''); return; }
    try {
      const result = current.decode(input);
      setOutput(result);
      setError('');
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 100),
        output: `[${current.name}解码] ${result.slice(0, 100)}`,
      });
    } catch (e) {
      setError('解码失败: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, current, addHistory]);

  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    toast.success('已复制');
  }, [output, toast]);

  // 注册快捷键：Ctrl+Enter 编码，Ctrl+Shift+C 复制
  useModuleShortcuts(handleEncode, handleCopy);

  const handleSwap = () => {
    setInput(output);
    setOutput('');
    setError('');
  };

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
        <h2>编码转换</h2>
        <p>Base64 / URL / HTML 实体 / Unicode 编解码</p>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label>类型</label>
          <div className="field btn-group">
            {ENCODERS.map(e => (
              <button
                key={e.id}
                className={type === e.id ? '' : 'secondary'}
                onClick={() => { setType(e.id); setOutput(''); setError(''); }}
              >
                {e.name}
              </button>
            ))}
          </div>
        </div>

        <div className="tool-row">
          <label>输入</label>
          <div className="field">
            <textarea
              placeholder={`输入要${current.name}编码/解码的内容...`}
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              rows={6}
            />
          </div>
        </div>

        <div className="tool-row">
          <label></label>
          <div className="field btn-group">
            <button onClick={handleEncode}><ArrowRightLeft size={16} /> 编码</button>
            <button className="secondary" onClick={handleDecode}>解码</button>
            <button className="secondary" onClick={handleSwap}>互换</button>
            <button className="secondary" onClick={() => { setInput(''); setOutput(''); setError(''); }}>清空</button>
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
                <span className="empty-state">编解码结果将显示在这里</span>
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