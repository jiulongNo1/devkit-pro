/**
 * SettingsPanel - 设置面板组件
 * 
 * 【React 概念说明】
 * - Props: 组件属性，类似于 Qt 的构造函数参数或 Q_PROPERTY
 * - useRef: 持有 DOM 元素引用，类似于 QObject::findChild 或 QWidget* 指针
 * - 条件渲染: {condition && <Component />} 类似于 QWidget::setVisible(condition)
 */

import { useState, useRef } from 'react';
import { X, Download, Upload, Trash2, Settings } from 'lucide-react';
import { useToast } from '../hooks/useToast';

/** Props 接口定义 - 类似于 QWidget 的构造函数参数 */
interface Props {
  open: boolean;           // 是否显示面板，类似于 QWidget::isVisible
  onClose: () => void;     // 关闭回调，类似于 QCloseEvent 或 reject
  onDataChange?: () => void;  // 数据变化回调，可选，类似于 QSqlTableModel::dataChanged
}

/** localStorage 的 key 列表 - 类似于 QSettings 的组或键 */
const STORAGE_KEYS = [
  'devkit_pro_history',
  'devkit_pro_favorites',
  'devkit_pro_theme',
];

/**
 * SettingsPanel 组件
 * 
 * 类似于 Qt 的：
 * - QDialog 或 QWidget
 * - QFileDialog::getOpenFileName
 * - QMessageBox::warning
 */
export default function SettingsPanel({ open, onClose, onDataChange }: Props) {
  // 二次确认状态 - 类似于 QMessageBox::Yes/No 的状态
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  
  /**
   * useRef - 获取 DOM 元素引用
   * 类似于 Qt 的：
   * - findChild<QPushButton*>
   * - ui->pushButton
   * - QTimer pointer
   * 
   * useRef vs useState：
   * - useState 变化会触发重新渲染
   * - useRef 变化不触发渲染，只保存引用
   */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  /**
   * 导出数据功能
   * 
   * 类似于 Qt 的：
   * - QFileDialog::getSaveFileName
   * - QFile::write
   * - QJsonDocument::toJson
   */
  const exportData = () => {
    try {
      // 收集所有 localStorage 数据
      const data: Record<string, string | null> = {};
      STORAGE_KEYS.forEach(key => {
        data[key] = localStorage.getItem(key);  // 类似于 QSettings::value
      });

      // 序列化为 JSON - 类似于 QJsonDocument::toJson
      const jsonStr = JSON.stringify(data, null, 2);

      // 创建 Blob 对象 - 类似于 QBuffer 或 QByteArray
      const blob = new Blob([jsonStr], { type: 'application/json' });

      // 创建下载链接 - 类似于 QDesktopServices::openUrl
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');

      // 生成文件名：devkit-pro-backup-YYYYMMDD-HHmmss.json
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const filename = `devkit-pro-backup-${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}.json`;

      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();  // 触发下载
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('导出成功');
    } catch (e) {
      toast.error('导出失败: ' + (e as Error).message);
    }
  };

  /** 触发文件选择对话框 - 类似于 QFileDialog::getOpenFileName */
  const handleImportClick = () => {
    // 通过 ref 调用 DOM 元素的 click 方法
    fileInputRef.current?.click();
  };

  /**
   * 处理文件选择
   * 
   * 类似于 Qt 的：
   * - QFileDialog::getOpenFileName 回调
   * - QFile::readAll
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];  // 获取选择的文件
    if (!file) return;

    // FileReader - 类似于 QFile 或 QTextStream
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);  // 解析 JSON

        // 校验格式 - 类似于 QJsonObject 验证
        if (typeof data !== 'object' || data === null) {
          throw new Error('JSON 格式无效');
        }

        // 恢复到 localStorage
        STORAGE_KEYS.forEach(key => {
          if (data[key] !== undefined && data[key] !== null) {
            localStorage.setItem(key, data[key]);
          } else if (data[key] === null) {
            localStorage.removeItem(key);
          }
        });

        toast.success('导入成功，页面将刷新');
        onDataChange?.();
        // 延迟刷新页面 - 类似于 QTimer::singleShot(1000, this, SLOT(reload()))
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

    // 重置文件输入，允许再次选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /** 清除所有数据 - 类似于 QSettings::clear */
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

  /**
   * 条件渲染 - open 为 false 时不渲染任何内容
   * 类似于 QWidget::setVisible(false) 或 QDialog::reject
   */
  if (!open) return null;

  /**
   * JSX 返回的面板结构
   * 
   * 类似于 Qt 的：
   * - QDialog 布局
   * - QFormLayout 或 QVBoxLayout
   */
  return (
    <>
      {/* 遮罩层 - 类似于 QDialog::setModal 或 QGraphicsView 的背景 */}
      <div className="settings-overlay" onClick={onClose} />
      
      {/* 设置面板主体 - 类似于 QDialog */}
      <div className="settings-panel">
        {/* 标题栏 */}
        <div className="settings-header">
          <div className="settings-title">
            <Settings size={18} />
            <span>设置</span>
          </div>
          <button className="ghost" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* 内容区 */}
        <div className="settings-content">
          {/* 数据管理区块 */}
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
              {/*
                隐藏的文件输入框 - 用于触发文件选择对话框
                类似于 QFileDialog::getOpenFileName，但使用了原生 input
              */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
            </div>
          </div>

          {/* 危险操作区块 */}
          <div className="settings-section">
            <h3>危险操作</h3>
            <p className="settings-desc">清除所有本地数据，此操作不可恢复</p>
            <div className="settings-actions">
              {/* 条件渲染：显示确认框或按钮 */}
              {!showClearConfirm ? (
                <button className="danger" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 size={16} />
                  清除所有数据
                </button>
              ) : (
                /* 二次确认 UI - 类似于 QMessageBox::warning */
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
