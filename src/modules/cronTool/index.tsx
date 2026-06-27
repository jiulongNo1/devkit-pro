/**
 * CronTool - Cron 表达式工具模块
 * 
 * 【功能说明】
 * - Cron 表达式输入与解析
 * - 自然语言描述 Cron 含义
 * - 显示接下来 5 次执行时间
 * - 常用模板快速选择
 */

import { useState, useCallback, useEffect } from 'react';
import { Timer, Copy } from 'lucide-react';
import CronParser from 'cron-parser';
import cronstrue from 'cronstrue';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';
import HistoryPanel from '../../components/HistoryPanel';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';

const MODULE_ID = 'cronTool';
const MODULE_NAME = 'Cron 工具';

const COMMON_TEMPLATES = [
  { name: '每分钟', cron: '* * * * *', desc: '每分钟执行一次' },
  { name: '每小时', cron: '0 * * * *', desc: '每小时整点执行' },
  { name: '每天', cron: '0 2 * * *', desc: '每天凌晨2点执行' },
  { name: '每周', cron: '0 0 * * 0', desc: '每周日凌晨0点执行' },
  { name: '每月', cron: '0 0 1 * *', desc: '每月1日凌晨0点执行' },
  { name: '工作日', cron: '0 9-18 * * 1-5', desc: '工作日9:00-18:00每小时执行' },
  { name: '每30分钟', cron: '*/30 * * * *', desc: '每30分钟执行一次' },
  { name: '每6小时', cron: '0 */6 * * *', desc: '每6小时执行一次' },
];

export default function CronTool() {
  const [input, setInput] = useState('0 2 * * *');
  const [description, setDescription] = useState('');
  const [nextRuns, setNextRuns] = useState<Date[]>([]);
  const [error, setError] = useState('');

  const toast = useToast();
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  const parseCron = useCallback((cron: string) => {
    if (!cron.trim()) {
      setDescription('');
      setNextRuns([]);
      setError('请输入 Cron 表达式');
      return;
    }

    try {
      setError('');
      
      const desc = cronstrue.toString(cron, { locale: 'zh_CN' });
      setDescription(desc);

      const interval = CronParser.parse(cron);
      const runs: Date[] = [];
      for (let i = 0; i < 5; i++) {
        const next = interval.next();
        if (next) {
          runs.push(next.toDate());
        }
      }
      setNextRuns(runs);

    } catch (e) {
      setDescription('');
      setNextRuns([]);
      setError('无效的 Cron 表达式: ' + (e as Error).message);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      parseCron(input);
    }, 300);
    return () => clearTimeout(timer);
  }, [input, parseCron]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
  };

  const handleInputBlur = () => {
    if (!error && input.trim()) {
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input,
        output: description || 'Cron 表达式',
      });
    }
  };

  const handleCopy = async () => {
    await copyToClipboard(input);
    toast.success('已复制: ' + input);
  };

  const handleTemplateClick = (template: typeof COMMON_TEMPLATES[0]) => {
    setInput(template.cron);
    toast.info('已应用: ' + template.name);
  };

  const handleSelectHistory = (item: { input: string }) => {
    setInput(item.input);
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  useModuleShortcuts(() => {}, handleCopy);

  const formatDate = (date: Date) => {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
  };

  return (
    <div>
      <div className="module-header">
        <h2>Cron 表达式工具</h2>
        <p>解析 Cron 表达式，查看执行时间</p>
      </div>

      <div className="tool-panel">
        <div className="tool-row">
          <label>Cron 表达式</label>
          <div className="field">
            <input
              type="text"
              value={input}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              placeholder="* * * * *"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            {error && <div className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{error}</div>}
            {!error && <div style={{ fontSize: 12, marginTop: 4, color: 'var(--muted)' }}>
              格式: 分 时 日 月 周
            </div>}
          </div>
        </div>

        <div className="btn-group">
          <button onClick={handleCopy}>
            <Copy size={14} />
            复制
          </button>
        </div>
      </div>

      {description && !error && (
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
            <Timer size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
            执行描述
          </h3>
          <div style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6 }}>
            {description}
          </div>
        </div>
      )}

      {nextRuns.length > 0 && !error && (
        <div className="tool-panel">
          <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
            接下来 5 次执行时间
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nextRuns.map((run, index) => (
              <div
                key={index}
                style={{
                  padding: 10,
                  background: 'var(--bg3)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <span style={{ color: 'var(--accent)', fontWeight: 600, minWidth: 24 }}>
                  #{index + 1}
                </span>
                <span>{formatDate(run)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="tool-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          常用模板
        </h3>
        <div className="btn-group">
          {COMMON_TEMPLATES.map((template) => (
            <button
              key={template.cron}
              className="secondary"
              onClick={() => handleTemplateClick(template)}
              title={template.desc}
            >
              {template.name}
            </button>
          ))}
        </div>
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />

      <style>{`
        @media (max-width: 600px) {
          .btn-group {
            flex-wrap: wrap;
          }
        }
      `}</style>
    </div>
  );
}