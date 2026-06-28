/**
 * QssEditor - QSS 样式编辑器
 *
 * 【功能说明】
 * - QSS 代码编辑与实时预览
 * - Qt 控件样式模拟（纯 CSS）
 * - 常用 QSS 模板库
 * - 属性速查
 */

import { useState, useMemo, useCallback } from 'react';
import { Paintbrush, Copy, Check, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';

// QSS 模板
const QSS_TEMPLATES = [
  {
    name: '浅色主题',
    code: `QPushButton {
    background-color: #f0f0f0;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    min-width: 80px;
}
QPushButton:hover {
    background-color: #e0e0e0;
}
QPushButton:pressed {
    background-color: #d0d0d0;
}

QLineEdit {
    background-color: white;
    border: 1px solid #d0d0d0;
    border-radius: 4px;
    padding: 6px;
    font-size: 13px;
}
QLineEdit:focus {
    border-color: #4a90d9;
}

QGroupBox {
    border: 1px solid #d0d0d0;
    border-radius: 6px;
    margin-top: 10px;
    padding-top: 16px;
    font-weight: bold;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 6px;
}

QLabel {
    font-size: 13px;
}`
  },
  {
    name: '深色主题',
    code: `QPushButton {
    background-color: #3c3c3c;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 6px 12px;
    font-size: 13px;
    color: #eee;
    min-width: 80px;
}
QPushButton:hover {
    background-color: #4c4c4c;
}
QPushButton:pressed {
    background-color: #5c5c5c;
}

QLineEdit {
    background-color: #2d2d2d;
    border: 1px solid #555;
    border-radius: 4px;
    padding: 6px;
    font-size: 13px;
    color: #eee;
}
QLineEdit:focus {
    border-color: #4a90d9;
}

QGroupBox {
    border: 1px solid #555;
    border-radius: 6px;
    margin-top: 10px;
    padding-top: 16px;
    font-weight: bold;
    color: #eee;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 6px;
}

QLabel {
    font-size: 13px;
    color: #eee;
}`
  },
  {
    name: '扁平化主题',
    code: `QPushButton {
    background-color: #4a90d9;
    border: none;
    border-radius: 2px;
    padding: 6px 16px;
    font-size: 13px;
    color: white;
    min-width: 80px;
}
QPushButton:hover {
    background-color: #3a80c9;
}
QPushButton:pressed {
    background-color: #2a70b9;
}

QLineEdit {
    background-color: transparent;
    border: none;
    border-bottom: 2px solid #ddd;
    padding: 6px 0;
    font-size: 13px;
}
QLineEdit:focus {
    border-bottom-color: #4a90d9;
}

QComboBox {
    background-color: transparent;
    border: none;
    border-bottom: 2px solid #ddd;
    padding: 6px 0;
}
QComboBox:focus {
    border-bottom-color: #4a90d9;
}`
  },
  {
    name: 'macOS 风格',
    code: `QPushButton {
    background-color: linear-gradient(to bottom, #f5f5f5, #e5e5e5);
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 6px 14px;
    font-size: 13px;
    min-width: 80px;
}
QPushButton:hover {
    background-color: linear-gradient(to bottom, #e5e5e5, #d5d5d5);
}
QPushButton:pressed {
    background-color: #d0d0d0;
    box-shadow: inset 0 1px 3px rgba(0,0,0,0.2);
}

QLineEdit {
    background-color: white;
    border: 1px solid #ccc;
    border-radius: 5px;
    padding: 6px;
    font-size: 13px;
    box-shadow: inset 0 1px 2px rgba(0,0,0,0.1);
}
QLineEdit:focus {
    border-color: #4a90d9;
}

QGroupBox {
    border: 1px solid #ddd;
    border-radius: 8px;
    margin-top: 10px;
    padding-top: 16px;
    font-weight: bold;
}
QGroupBox::title {
    subcontrol-origin: margin;
    left: 10px;
    padding: 0 8px;
}`
  },
  {
    name: '自定义渐变按钮',
    code: `QPushButton {
    background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #64b5f6, stop: 0.5 #42a5f5, stop: 1 #2196f3);
    border: none;
    border-radius: 6px;
    padding: 8px 20px;
    font-size: 14px;
    font-weight: bold;
    color: white;
    min-width: 100px;
}
QPushButton:hover {
    background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #90caf9, stop: 0.5 #64b5f6, stop: 1 #42a5f5);
}
QPushButton:pressed {
    background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #1976d2, stop: 0.5 #1565c0, stop: 1 #0d47a1);
}

QPushButton#cancelBtn {
    background: qlineargradient(x1: 0, y1: 0, x2: 0, y2: 1,
        stop: 0 #e0e0e0, stop: 0.5 #bdbdbd, stop: 1 #9e9e9e);
    color: #333;
}`
  }
];

// 属性速查
const QSS_PROPERTIES = {
  QPushButton: [
    { name: 'background-color', desc: '背景色' },
    { name: 'border', desc: '边框' },
    { name: 'border-radius', desc: '圆角' },
    { name: 'padding', desc: '内边距' },
    { name: 'min-width', desc: '最小宽度' },
    { name: 'font-size', desc: '字体大小' },
    { name: 'color', desc: '文字颜色' },
  ],
  QLineEdit: [
    { name: 'background-color', desc: '背景色' },
    { name: 'border', desc: '边框' },
    { name: 'border-radius', desc: '圆角' },
    { name: 'padding', desc: '内边距' },
    { name: 'font-size', desc: '字体大小' },
    { name: 'color', desc: '文字颜色' },
  ],
  QComboBox: [
    { name: 'background-color', desc: '背景色' },
    { name: 'border', desc: '边框' },
    { name: 'border-radius', desc: '圆角' },
    { name: 'padding', desc: '内边距' },
  ],
  QSlider: [
    { name: 'background', desc: '背景' },
    { name: 'border', desc: '边框' },
    { name: 'height', desc: '高度' },
    { name: 'border-radius', desc: '圆角' },
  ],
  QProgressBar: [
    { name: 'background-color', desc: '背景色' },
    { name: 'border', desc: '边框' },
    { name: 'border-radius', desc: '圆角' },
    { name: 'text-align', desc: '文字对齐' },
  ],
  QCheckBox: [
    { name: 'spacing', desc: '间距' },
    { name: 'color', desc: '文字颜色' },
  ],
  QGroupBox: [
    { name: 'border', desc: '边框' },
    { name: 'border-radius', desc: '圆角' },
    { name: 'margin-top', desc: '顶部间距' },
    { name: 'padding-top', desc: '顶部内边距' },
  ],
};

// QSS 到 CSS 的转换
function qssToCss(qss: string): string {
  let css = qss;
  
  // 替换 QSS 特有语法
  css = css.replace(/qlineargradient\(([^)]+)\)/g, (_, gradient) => {
    const parts = gradient.split(',').map((p: string) => p.trim());
    const stops: string[] = [];
    
    for (const part of parts) {
      const stopMatch = part.match(/stop:\s*([\d.]+)\s+([^,]+)/);
      if (stopMatch) {
        const [_, pos, color] = stopMatch;
        stops.push(`${parseFloat(pos) * 100}% ${color.trim()}`);
      }
    }
    
    return `linear-gradient(to bottom, ${stops.join(', ')})`;
  });
  
  // 替换选择器
  css = css.replace(/QPushButton\b/g, '.qpushbutton');
  css = css.replace(/QLineEdit\b/g, '.qlineedit');
  css = css.replace(/QTextEdit\b/g, '.qtextedit');
  css = css.replace(/QComboBox\b/g, '.qcombobox');
  css = css.replace(/QSlider\b/g, '.qslider');
  css = css.replace(/QProgressBar\b/g, '.qprogressbar');
  css = css.replace(/QCheckBox\b/g, '.qcheckbox');
  css = css.replace(/QRadioButton\b/g, '.qradiobutton');
  css = css.replace(/QGroupBox\b/g, '.qgroupbox');
  css = css.replace(/QLabel\b/g, '.qlabel');
  
  // 替换伪状态
  css = css.replace(/:hover\b/g, ':hover');
  css = css.replace(/:pressed\b/g, ':active');
  css = css.replace(/:focus\b/g, ':focus');
  css = css.replace(/:checked\b/g, ':checked');
  
  // 替换子控件
  css = css.replace(/::title\b/g, '.qtitle');
  css = css.replace(/::indicator\b/g, '.qindicator');
  
  // 替换 ID 选择器
  css = css.replace(/#(\w+)/g, '[data-id="$1"]');
  
  return css;
}

export default function QssEditor() {
  const [qssCode, setQssCode] = useState(QSS_TEMPLATES[0].code);
  const [copied, setCopied] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<string | null>('QPushButton');
  const [activeTab, setActiveTab] = useState<'template' | 'properties'>('template');
  const toast = useToast();

  // 转换后的 CSS
  const cssCode = useMemo(() => {
    return qssToCss(qssCode);
  }, [qssCode]);

  // 复制代码
  const handleCopy = useCallback(() => {
    copyToClipboard(qssCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('QSS 代码已复制');
  }, [qssCode, toast]);

  // 加载模板
  const handleLoadTemplate = useCallback((template: typeof QSS_TEMPLATES[0]) => {
    setQssCode(template.code);
    toast.success(`已加载模板：${template.name}`);
  }, [toast]);

  // 清空代码
  const handleClear = useCallback(() => {
    setQssCode('');
    toast.success('代码已清空');
  }, [toast]);

  // 插入属性
  const handleInsertProperty = useCallback((property: string) => {
    setQssCode(prev => prev + `\n    ${property}: ;`);
    toast.success(`已插入属性: ${property}`);
  }, [toast]);

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto' }}>
      <div className="module-header">
        <h2>QSS 样式编辑器</h2>
        <p>QSS 代码编辑 · 实时预览 · 模板库 · 属性速查</p>
      </div>

      {/* 顶部操作栏 */}
      <div className="tool-panel" style={{ marginBottom: 16 }}>
        <div className="tool-row">
          <label>快速操作</label>
          <div className="field">
            <button onClick={handleCopy} style={{ marginRight: 8 }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? '已复制' : '复制 QSS'}
            </button>
            <button className="secondary" onClick={handleClear} style={{ marginRight: 8 }}>
              <Trash2 size={14} />
              清空
            </button>
            <div className="btn-group">
              <button
                className={activeTab === 'template' ? '' : 'secondary'}
                onClick={() => setActiveTab('template')}
              >
                模板库
              </button>
              <button
                className={activeTab === 'properties' ? '' : 'secondary'}
                onClick={() => setActiveTab('properties')}
              >
                属性速查
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 主编辑区 */}
      <div className="grid-2-col" style={{ marginBottom: 16 }}>
        {/* 左侧：QSS 编辑区 */}
        <div className="tool-panel">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paintbrush size={16} color="var(--accent)" />
              QSS 代码编辑
            </h3>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>
              {qssCode.split('\n').length} 行
            </span>
          </div>

          <textarea
            value={qssCode}
            onChange={e => setQssCode(e.target.value)}
            placeholder='/* 输入 QSS 代码 */\nQPushButton {\n    background-color: #f0f0f0;\n}'
            rows={30}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 12,
              width: '100%',
              minHeight: '400px'
            }}
          />
        </div>

        {/* 右侧：实时预览 */}
        <div className="tool-panel">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 12
          }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paintbrush size={16} color="var(--accent)" />
              实时预览
            </h3>
          </div>

          {/* 样式注入 */}
          <style>{cssCode}</style>

          {/* 控件预览区 */}
          <div style={{
            padding: 16,
            background: '#fafafa',
            borderRadius: 8,
            minHeight: '400px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}>
            {/* QPushButton */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QPushButton:</span>
              <button className="qpushbutton">确定</button>
              <button className="qpushbutton" data-id="cancelBtn">取消</button>
              <button className="qpushbutton">应用</button>
            </div>

            {/* QLineEdit */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QLineEdit:</span>
              <input className="qlineedit" type="text" placeholder="输入文本..." />
            </div>

            {/* QTextEdit */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666', flexShrink: 0 }}>QTextEdit:</span>
              <textarea className="qtextedit" rows={3} placeholder="多行文本..." style={{ flex: 1 }} />
            </div>

            {/* QComboBox */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QComboBox:</span>
              <select className="qcombobox">
                <option>选项 1</option>
                <option>选项 2</option>
                <option>选项 3</option>
              </select>
            </div>

            {/* QSlider */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QSlider:</span>
              <input className="qslider" type="range" min="0" max="100" defaultValue="50" style={{ flex: 1 }} />
            </div>

            {/* QProgressBar */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QProgressBar:</span>
              <div className="qprogressbar-wrapper" style={{ flex: 1, height: 20, background: '#e0e0e0', borderRadius: 4, overflow: 'hidden' }}>
                <div className="qprogressbar" style={{ width: '60%', height: '100%', background: '#4a90d9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12 }}>60%</div>
              </div>
            </div>

            {/* QCheckBox / QRadioButton */}
            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QCheckBox:</span>
              <label className="qcheckbox" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked />
                <span>选项 A</span>
              </label>
              <label className="qcheckbox" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="checkbox" />
                <span>选项 B</span>
              </label>
            </div>

            <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QRadioButton:</span>
              <label className="qradiobutton" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="radio" defaultChecked />
                <span>单选 1</span>
              </label>
              <label className="qradiobutton" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                <input type="radio" name="radio" />
                <span>单选 2</span>
              </label>
            </div>

            {/* QGroupBox */}
            <div className="qgroupbox" style={{ padding: 16 }}>
              <div className="qtitle" style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 12 }}>分组框</div>
              <div style={{ display: 'flex', gap: 12 }}>
                <input className="qlineedit" type="text" placeholder="输入..." style={{ flex: 1 }} />
                <button className="qpushbutton">确定</button>
              </div>
            </div>

            {/* QLabel */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <span className="qlabel" style={{ width: 100, fontSize: 12, color: '#666' }}>QLabel:</span>
              <span className="qlabel">普通标签文本</span>
            </div>
          </div>
        </div>
      </div>

      {/* 模板库 / 属性速查 */}
      <div className="tool-panel">
        {activeTab === 'template' ? (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paintbrush size={16} color="var(--accent)" />
              QSS 模板库
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {QSS_TEMPLATES.map((template, idx) => (
                <div
                  key={idx}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => handleLoadTemplate(template)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg2)',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    {template.name}
                    <ChevronRight size={16} />
                  </button>
                  <pre style={{
                    padding: 12,
                    background: 'var(--bg3)',
                    fontSize: 11,
                    fontFamily: 'var(--font-mono)',
                    maxHeight: 120,
                    overflowY: 'auto',
                    margin: 0
                  }}>
                    {template.code.split('\n').slice(0, 10).join('\n')}
                    {template.code.split('\n').length > 10 && '...'}
                  </pre>
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Paintbrush size={16} color="var(--accent)" />
              属性速查
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 12 }}>
              {Object.entries(QSS_PROPERTIES).map(([widget, properties]) => (
                <div
                  key={widget}
                  style={{
                    border: '1px solid var(--border)',
                    borderRadius: 8,
                    overflow: 'hidden'
                  }}
                >
                  <button
                    onClick={() => setExpandedCategory(expandedCategory === widget ? null : widget)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      background: 'var(--bg2)',
                      border: 'none',
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontWeight: 500,
                      fontSize: 13,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between'
                    }}
                  >
                    <code>{widget}</code>
                    {expandedCategory === widget ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  {expandedCategory === widget && (
                    <div style={{ padding: 8 }}>
                      {properties.map((prop, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleInsertProperty(prop.name)}
                          style={{
                            width: '100%',
                            padding: '6px 8px',
                            background: 'var(--bg3)',
                            border: 'none',
                            borderRadius: 4,
                            textAlign: 'left',
                            cursor: 'pointer',
                            marginBottom: 4,
                            fontSize: 12,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            transition: 'all 0.15s'
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = 'var(--accent-bg)';
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = 'var(--bg3)';
                          }}
                        >
                          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)' }}>
                            {prop.name}
                          </span>
                          <span style={{ color: 'var(--muted)', fontSize: 11 }}>
                            {prop.desc}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* QSS vs CSS 语法说明 */}
      <div className="tool-panel" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>QSS vs CSS 语法差异</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 180 }}>QSS 语法</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)', width: 180 }}>CSS 等效</th>
              <th style={{ padding: 8, textAlign: 'left', borderBottom: '1px solid var(--border)' }}>说明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>QPushButton</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>.qpushbutton</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>控件类名作为选择器</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>QPushButton:pressed</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>:active</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>QSS 使用 :pressed，CSS 使用 :active</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>QGroupBox::title</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>.qtitle</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>子控件使用 :: 前缀</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>QCheckBox::indicator</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>.qindicator</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>指示器子控件</td>
            </tr>
            <tr>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>qlineargradient(...)</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-mono)' }}>linear-gradient(...)</td>
              <td style={{ padding: 8, borderBottom: '1px solid var(--border)' }}>渐变函数语法差异</td>
            </tr>
            <tr>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>QPushButton#btnOk</td>
              <td style={{ padding: 8, fontFamily: 'var(--font-mono)' }}>[data-id="btnOk"]</td>
              <td style={{ padding: 8 }}>ID 选择器使用 # 符号</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
