import { useState, useRef } from 'react';
import { X, Download, Upload, Trash2, Settings } from 'lucide-react';
import { useToast } from '../hooks/useToast';

interface Props {
  open: boolean;
  onClose: () => void;
  onDataChange?: () => void;
}

const STORAGE_KEYS = [
  'devkit_pro_history',
  'devkit_pro_favorites',
  'devkit_pro_theme',
];

export default function SettingsPanel({ open, onClose, onDataChange }: Props) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const exportData = () => {
    try {
      const data: Record<string, string | null> = {};
      STORAGE_KEYS.forEach(key => {
        data[key] = localStorage.getItem(key);
      });
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `devkit-pro-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('导出成功');
    } catch (e) {
      toast.error('导出失败: ' + (e as Error).message);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (typeof data !== 'object' || data === null) {
          throw new Error('JSON 格式无效');
        }

        STORAGE_KEYS.forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            localStorage.setItem(key, data[key]);
          } else if (data[key] === null) {
            localStorage.removeItem(key);
          }
        });

        toast.success('导入成功，页面将刷新');
        onDataChange?.();
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      } catch (err) {
        toast.error('导入失败: JSON 格式错误');
      }
    };
    reader.onerror = () => {
      toast.error('读取文件失败');
    };
    reader.readAsText(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const clearAllData = () => {
    try {
      STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(key);
      });
      setShowClearConfirm(false);
      toast.success('已清除所有数据，页面将刷新');
      onDataChange?.();
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (e) {
      toast.error('清除失败: ' + (e as Error).message);
    }
  };

  if (!open) return null;

  return (
    <>
      <div className="settings-overlay" onClick={onClose} />
      <div className="settings-panel">
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={18} />
            <span>设置</span>
          </div>
          <button className="ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>数据管理</h3>
            <p className="settings-desc">导出或导入您的所有数据，包括历史记录、收藏等</p>
            
            <div className="settings-actions">
              <button className="secondary" onClick={exportData}>
                <Download size={16} />
                导出数据
              </button>
              <button className="secondary" onClick={handleImportClick}>
                <Upload size={16} />
                导入数据
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          <div className="settings-section">
            <h3>危险操作</h3>
            <p className="settings-desc">清除所有本地数据，此操作不可恢复</p>
            <div className="settings-actions">
              {!showClearConfirm ? (
                <button className="danger" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 size={16} />
                  清除所有数据
                </button>
              ) : (
                <div className="clear-confirm">
                  <span>确定要清除所有数据吗？</span>
                  <div className="clear-confirm-btns">
                    <button className="danger" onClick={clearAllData}>确定清除</button>
                    <button className="secondary" onClick={() => setShowClearConfirm(false)}>取消</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}