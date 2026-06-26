import { useState } from 'react';
import { ChevronDown, ChevronRight, Trash2, Clock } from 'lucide-react';
import type { HistoryItem } from '../types';

interface HistoryPanelProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onClear: () => void;
  maxItems?: number;
}

export default function HistoryPanel({ history, onSelect, onClear, maxItems = 10 }: HistoryPanelProps) {
  const [collapsed, setCollapsed] = useState(true);
  
  const displayHistory = history.slice(0, maxItems);
  
  const formatTime = (timestamp: number) => {
    const d = new Date(timestamp);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  };
  
  const truncate = (s: string, len = 50) => {
    if (s.length <= len) return s;
    return s.slice(0, len) + '...';
  };
  
  if (history.length === 0) return null;
  
  return (
    <div className="history-panel" style={{ marginTop: 16 }}>
      <div 
        className="history-header" 
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '10px 14px',
          background: 'var(--card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'pointer',
          userSelect: 'none',
        }}
        onClick={() => setCollapsed(!collapsed)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
          <span style={{ fontWeight: 500 }}>历史记录</span>
          <span style={{ fontSize: 12, color: 'var(--muted)' }}>({history.length})</span>
        </div>
        {!collapsed && (
          <button 
            className="ghost"
            style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
          >
            <Trash2 size={14} /> 清空
          </button>
        )}
      </div>
      
      {!collapsed && (
        <div 
          className="history-list"
          style={{
            marginTop: 8,
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            maxHeight: 300,
            overflow: 'auto',
          }}
        >
          {displayHistory.map((item, idx) => (
            <div
              key={item.id}
              className="history-item"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '10px 14px',
                borderBottom: idx < displayHistory.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
                transition: 'background 0.15s',
              }}
              onClick={() => onSelect(item)}
              onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Clock size={14} style={{ marginTop: 2, color: 'var(--muted)', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 2 }}>
                  {formatTime(item.timestamp)}
                </div>
                <div 
                  style={{ 
                    fontSize: 13, 
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {truncate(item.input)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}