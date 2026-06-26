import { useState, useCallback, useEffect } from 'react';
import { Copy, Calendar, Clock } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import HistoryPanel from '../../components/HistoryPanel';

const MODULE_ID = 'timestamp';
const MODULE_NAME = '时间戳工具';

function formatDate(d: Date, withMs = false): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  const base = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return withMs ? base + '.' + d.getMilliseconds().toString().padStart(3, '0') : base;
}

export default function TimestampTool() {
  const [timestamp, setTimestamp] = useState('');
  const [dateStr, setDateStr] = useState('');
  const [nowTs, setNowTs] = useState(Date.now());
  const [nowStr, setNowStr] = useState(formatDate(new Date()));
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();
  const toast = useToast();

  useEffect(() => {
    const timer = setInterval(() => {
      const d = new Date();
      setNowTs(d.getTime());
      setNowStr(formatDate(d));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const tsToDate = useCallback(() => {
    if (!timestamp) return;
    const ts = parseInt(timestamp, 10);
    if (isNaN(ts)) { setDateStr('无效的时间戳'); return; }
    const d = new Date(ts.toString().length <= 10 ? ts * 1000 : ts);
    const formatted = formatDate(d, true) + '  (星期' + ['日', '一', '二', '三', '四', '五', '六'][d.getDay()] + ')';
    setDateStr(formatted);
    addHistory({
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      input: `时间戳: ${timestamp}`,
      output: formatted,
    });
  }, [timestamp, addHistory]);

  const dateToTs = useCallback(() => {
    if (!dateStr || dateStr.includes('无效')) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // 尝试解析 yyyy-MM-dd HH:mm:ss 格式
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
      if (match) {
        const [, y, m, day, h = '0', min = '0', s = '0'] = match;
        const parsed = new Date(parseInt(y), parseInt(m) - 1, parseInt(day), parseInt(h), parseInt(min), parseInt(s));
        if (!isNaN(parsed.getTime())) {
          const ts = Math.floor(parsed.getTime() / 1000).toString();
          setTimestamp(ts);
          addHistory({
            moduleId: MODULE_ID,
            moduleName: MODULE_NAME,
            input: `日期: ${dateStr}`,
            output: `时间戳: ${ts}`,
          });
          return;
        }
      }
      setTimestamp('无效的日期格式');
      return;
    }
    const ts = Math.floor(d.getTime() / 1000).toString();
    setTimestamp(ts);
    addHistory({
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      input: `日期: ${dateStr}`,
      output: `时间戳: ${ts}`,
    });
  }, [dateStr, addHistory]);

  const handleCopy = useCallback(async (text: string) => {
    await copyToClipboard(text);
    toast.success('已复制');
  }, [toast]);

  // 主操作：根据当前输入执行转换
  const handleExecute = useCallback(() => {
    if (timestamp && !timestamp.startsWith('无效')) {
      tsToDate();
    } else if (dateStr && !dateStr.startsWith('无效')) {
      dateToTs();
    }
  }, [timestamp, dateStr, tsToDate, dateToTs]);

  // 复制当前时间戳
  const handleCopyCurrent = useCallback(async () => {
    await copyToClipboard(nowTs.toString());
    toast.success('已复制');
  }, [nowTs, toast]);

  // 注册快捷键：Ctrl+Enter 转换，Ctrl+Shift+C 复制当前时间戳
  useModuleShortcuts(handleExecute, handleCopyCurrent);

  const handleSelectHistory = (item: { input: string }) => {
    if (item.input.startsWith('时间戳:')) {
      setTimestamp(item.input.replace('时间戳: ', '').trim());
      setDateStr('');
    } else if (item.input.startsWith('日期:')) {
      setDateStr(item.input.replace('日期: ', '').trim());
      setTimestamp('');
    }
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  return (
    <div>
      <div className="module-header">
        <h2>时间戳工具</h2>
        <p>时间戳与日期互转、多时区对比、实时时钟</p>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label></label>
          <div className="field" style={{ background: 'var(--accent-bg)', padding: '14px 18px', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>当前时间</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>{nowStr}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>时间戳 (毫秒)</div>
              <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{nowTs}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>时间戳 (秒)</div>
              <div style={{ fontSize: 16, fontFamily: 'var(--font-mono)', color: 'var(--ink)' }}>{Math.floor(nowTs / 1000)}</div>
            </div>
            <button className="ghost" style={{ marginLeft: 'auto' }} onClick={() => handleCopy(nowTs.toString())}>
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label>时间戳</label>
          <div className="field" style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="输入时间戳（毫秒或秒）"
              value={timestamp}
              onChange={e => setTimestamp(e.target.value)}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <button onClick={tsToDate}><Calendar size={16} /> 转日期</button>
            <button className="secondary" onClick={() => setTimestamp(Math.floor(Date.now() / 1000).toString())}>当前秒</button>
            <button className="secondary" onClick={() => setTimestamp(Date.now().toString())}>当前毫秒</button>
          </div>
        </div>

        <div className="tool-row">
          <label>日期</label>
          <div className="field" style={{ display: 'flex', gap: 8 }}>
            <input
              placeholder="yyyy-MM-dd HH:mm:ss"
              value={dateStr}
              onChange={e => setDateStr(e.target.value)}
            />
            <button onClick={dateToTs}><Clock size={16} /> 转时间戳</button>
            <button className="secondary" onClick={() => setDateStr(formatDate(new Date()))}>当前时间</button>
          </div>
        </div>

        {(timestamp && !timestamp.startsWith('无效')) || (dateStr && !dateStr.startsWith('无效')) ? (
          <div className="tool-row">
            <label>结果</label>
            <div className="field">
              <div className="output-box">
                {timestamp && !timestamp.startsWith('无效') ? (
                  <div>时间戳 <code>{timestamp}</code> 对应的日期：</div>
                ) : null}
                {dateStr && !dateStr.startsWith('无效') && !timestamp ? (
                  <div>日期 <code>{dateStr}</code> 对应的时间戳：</div>
                ) : null}
                <div style={{ marginTop: 8, fontSize: 15, fontWeight: 600, color: 'var(--accent)' }}>
                  {dateStr || timestamp}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}