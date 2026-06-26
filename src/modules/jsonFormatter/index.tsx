/**
 * JsonFormatter - JSON 格式化模块
 * 
 * 【React 组件概念说明】
 * - export default: 默认导出，类似于 Qt 的 Q_INVOKABLE 或导出函数
 * - 函数式组件: 类似于 QWidget::paintEvent 或 QML 的 Item
 * - JSX: 类似于 Qt 的 .ui 文件或 QML，描述 UI 结构
 */

import { useState, useCallback } from 'react';
import { Copy, Sparkles, Minimize2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useHistory } from '../../hooks/useHistory';
import { useToast } from '../../hooks/useToast';
import { useModuleShortcuts } from '../../hooks/useShortcuts';
import HistoryPanel from '../../components/HistoryPanel';

/** 模块标识 - 类似于 Q_OBJECT 或 staticMetaObject */
const MODULE_ID = 'jsonFormatter';
const MODULE_NAME = 'JSON 格式化';

/**
 * JsonFormatter 组件
 * 
 * 类似于 Qt 的：
 * - QWidget 派生类
 * - QML Item
 * - QWizardPage 或 QWizard
 * 
 * 组件结构：
 * - module-header: 页面标题区
 * - tool-panel: 工具面板
 * - HistoryPanel: 历史记录面板（位于底部）
 */
export default function JsonFormatter() {
  /**
   * useState - 状态管理
   * 
   * 类似于 Qt 的：
   * - Q_PROPERTY + Q_INVOKABLE + notify 信号
   * - QSignalSpy 监听的属性
   * - QAbstractItemModel 的 dataChanged 信号
   * 
   * 语法：const [变量名, set变量名] = useState(初始值)
   * - 变量名：当前值
   * - set变量名：修改值的方法，类似于 setter 或 Q_INVOKABLE
   */
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  /** 从 HistoryProvider 获取历史记录功能 - 类似于 QSqlTableModel */
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  /** 获取 Toast 功能 - 类似于 QMessageBox::information */
  const toast = useToast();

  /**
   * useCallback - 缓存函数
   * 
   * 类似于 Qt 的：
   * - QMetaObject::invokeMethod 缓存
   * - std::function 缓存
   * - QTimer::singleShot 包装的 lambda
   * 
   * 第一个参数：函数体
   * 第二个参数：依赖数组，数组中的变量变化时重新创建函数
   */
  const formatJson = useCallback((compress = false) => {
    // 校验输入 - 类似于 QValidator 或 inputMask
    if (!input.trim()) {
      setError('请输入 JSON 内容');
      setOutput('');
      return;
    }

    try {
      // JSON.parse - 类似于 QJsonDocument::fromJson
      const parsed = JSON.parse(input);
      
      // JSON.stringify - 类似于 QJsonDocument::toJson
      // 第二个参数 null 表示不格式化，第二个参数 2 表示缩进 2 空格
      const formatted = compress
        ? JSON.stringify(parsed)
        : JSON.stringify(parsed, null, 2);
      
      setOutput(formatted);
      setError('');

      // 保存到历史记录 - 类似于 QSqlTableModel::submitAll
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 200),  // 截取前 200 字符，避免存储过多
        output: compress ? '压缩' : '格式化',
      });
    } catch (e) {
      // 捕获异常 - 类似于 try-catch 或 Q_ASSERT
      setError('JSON 格式错误: ' + (e as Error).message);
      setOutput('');
    }
  }, [input, addHistory]);

  /** 复制输出 - 类似于 QClipboard::setText */
  const handleCopy = useCallback(async () => {
    if (!output) return;
    await copyToClipboard(output);
    toast.success('已复制');
  }, [output, toast]);

  // 注册快捷键 - 类似于 QShortcut 或 QAction
  // 参数1：Ctrl+Enter 时执行的函数
  // 参数2：Ctrl+Shift+C 时执行的函数
  useModuleShortcuts(() => formatJson(false), handleCopy);

  /** 从历史记录回填 - 类似于 QCompleter 或 QComboBox::setCurrentText */
  const handleSelectHistory = (item: { input: string }) => {
    setInput(item.input);
    setOutput('');
    setError('');
  };

  /** 清空当前模块历史 - 类似于 QSqlTableModel::clear */
  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  /**
   * render / return JSX
   * 
   * 类似于 Qt 的：
   * - QWidget::render() 或 QPainter
   * - QML 的 Item {} 块
   * - .ui 文件生成的代码
   */
  return (
    <div>
      {/* 页面标题区 */}
      <div className="module-header">
        <h2>JSON 格式化 / 压缩</h2>
        <p>JSON 美化、压缩、校验与树形预览</p>
      </div>

      {/* 工具面板 */}
      <div className="tool-panel">
        {/* 输入行 */}
        <div className="tool-row">
          <label>输入</label>
          <div className="field">
            {/*
              textarea - 多行文本输入
              类似于 QTextEdit 或 QPlainTextEdit
              
              JSX 语法说明：
              - value={input} 类似于 QTextEdit::toPlainText() 绑定
              - onChange 类似于 textChanged() 信号
              - onChange={e => setInput(e.target.value)} 
                相当于 Qt 的：
                connect(textEdit, &QTextEdit::textChanged, [this](){
                  m_input = textEdit->toPlainText();
                });
            */}
            <textarea
              placeholder="在此粘贴 JSON 内容..."
              value={input}
              onChange={e => { setInput(e.target.value); setError(''); }}
              rows={8}
            />
          </div>
        </div>

        {/* 操作按钮行 */}
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

        {/* 错误提示 - 条件渲染，类似于 QLabel::setVisible */}
        {error && (
          <div className="tool-row">
            <label></label>
            <div className="field error-text">{error}</div>
          </div>
        )}

        {/* 输出区 */}
        <div className="tool-row">
          <label>输出</label>
          <div className="field">
            <div className="output-box">
              {/* 条件渲染：output 存在时显示内容，否则显示占位符 */}
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

      {/* 历史记录面板 */}
      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}
