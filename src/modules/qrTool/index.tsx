/**
 * QrTool - 二维码生成工具模块
 * 
 * 【功能说明】
 * - 输入文本/URL 实时生成二维码
 * - 支持调整大小（128px ~ 512px）
 * - 支持前景色/背景色自定义
 * - 支持添加中心 Logo 图标
 * - 支持下载 PNG 图片
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { QrCode, Download, Image, RefreshCw } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import HistoryPanel from '../../components/HistoryPanel';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';

const MODULE_ID = 'qrTool';
const MODULE_NAME = '二维码工具';

// ============ 组件 ============

export default function QrTool() {
  const [input, setInput] = useState('https://github.com/jiulongNo1/devkit-pro');
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [size, setSize] = useState(256);
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#FFFFFF');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoSize, setLogoSize] = useState(0.3); // Logo 占二维码的比例
  const [error, setError] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toast = useToast();
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  // 生成二维码
  const generateQR = useCallback(async () => {
    if (!input.trim()) {
      setError('请输入内容');
      setQrDataUrl('');
      return;
    }

    try {
      setError('');
      
      // 先生成基础二维码到 canvas
      const canvas = canvasRef.current!;
      await QRCode.toCanvas(canvas, input, {
        width: size,
        margin: 2,
        color: {
          dark: fgColor,
          light: bgColor,
        },
        errorCorrectionLevel: 'H', // 高容错率，支持 Logo
      });

      // 如果有 Logo，绘制到中心
      if (logoUrl) {
        const ctx = canvas.getContext('2d')!;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          const logoWidth = size * logoSize;
          const logoHeight = size * logoSize;
          const logoX = (size - logoWidth) / 2;
          const logoY = (size - logoHeight) / 2;
          
          // 绘制白色背景圆角矩形（可选）
          const padding = 4;
          ctx.fillStyle = bgColor;
          ctx.beginPath();
          const rx = logoX - padding;
          const ry = logoY - padding;
          const rw = logoWidth + padding * 2;
          const rh = logoHeight + padding * 2;
          const radius = 8;
          ctx.moveTo(rx + radius, ry);
          ctx.lineTo(rx + rw - radius, ry);
          ctx.quadraticCurveTo(rx + rw, ry, rx + rw, ry + radius);
          ctx.lineTo(rx + rw, ry + rh - radius);
          ctx.quadraticCurveTo(rx + rw, ry + rh, rx + rw - radius, ry + rh);
          ctx.lineTo(rx + radius, ry + rh);
          ctx.quadraticCurveTo(rx, ry + rh, rx, ry + rh - radius);
          ctx.lineTo(rx, ry + radius);
          ctx.quadraticCurveTo(rx, ry, rx + radius, ry);
          ctx.closePath();
          ctx.fill();
          
          // 绘制 Logo
          ctx.drawImage(img, logoX, logoY, logoWidth, logoHeight);
          
          // 更新 Data URL
          setQrDataUrl(canvas.toDataURL('image/png'));
        };
        img.onerror = () => {
          setError('Logo 加载失败');
          setQrDataUrl(canvas.toDataURL('image/png'));
        };
        img.src = logoUrl;
      } else {
        setQrDataUrl(canvas.toDataURL('image/png'));
      }

      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: input.slice(0, 100),
        output: `QR ${size}px`,
      });
    } catch (e) {
      setError('生成失败: ' + (e as Error).message);
      setQrDataUrl('');
    }
  }, [input, size, fgColor, bgColor, logoUrl, logoSize, addHistory]);

  // 输入变化时自动生成
  useEffect(() => {
    const timer = setTimeout(() => {
      if (input.trim()) generateQR();
    }, 300);
    return () => clearTimeout(timer);
  }, [input, size, fgColor, bgColor, logoUrl, logoSize]);

  // 初始化生成
  useEffect(() => {
    generateQR();
  }, []);

  // 下载二维码
  const handleDownload = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success('已下载二维码图片');
  };

  // 清空 Logo
  const clearLogo = () => {
    setLogoUrl('');
    setError('');
  };

  // 历史记录回填
  const handleSelectHistory = (item: { input: string }) => {
    setInput(item.input);
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  // 快捷键：Ctrl+Enter 生成，Ctrl+Shift+C 下载
  useModuleShortcuts(generateQR, handleDownload);

  return (
    <div>
      <div className="module-header">
        <h2>二维码生成</h2>
        <p>输入文本/URL，生成自定义二维码图片</p>
      </div>

      <div className="tool-panel">
        {/* 输入区 */}
        <div className="tool-row">
          <label>内容</label>
          <div className="field">
            <textarea
              value={input}
              onChange={e => setInput(e.target.value)}
              rows={3}
              placeholder="输入文本、URL、WiFi 配置等..."
            />
          </div>
        </div>

        {/* 尺寸调整 */}
        <div className="tool-row">
          <label>尺寸</label>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <input
                type="range"
                min={128}
                max={512}
                step={32}
                value={size}
                onChange={e => setSize(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span style={{ minWidth: 60, textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                {size}px
              </span>
            </div>
          </div>
        </div>

        {/* 颜色设置 */}
        <div className="tool-row">
          <label>前景色</label>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                style={{ width: 40, height: 32, border: '1px solid var(--rule)', borderRadius: 4 }}
              />
              <input
                type="text"
                value={fgColor}
                onChange={e => setFgColor(e.target.value)}
                style={{ width: 80, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        <div className="tool-row">
          <label>背景色</label>
          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <input
                type="color"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                style={{ width: 40, height: 32, border: '1px solid var(--rule)', borderRadius: 4 }}
              />
              <input
                type="text"
                value={bgColor}
                onChange={e => setBgColor(e.target.value)}
                style={{ width: 80, fontFamily: 'var(--font-mono)' }}
              />
            </div>
          </div>
        </div>

        {/* Logo 设置 */}
        <div className="tool-row">
          <label>中心 Logo</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <input
                type="text"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                placeholder="输入图片 URL（可选）"
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              {logoUrl && (
                <button className="ghost" onClick={clearLogo} title="清除 Logo">
                  <RefreshCw size={16} />
                </button>
              )}
            </div>
            {logoUrl && (
              <div style={{ marginTop: 8 }}>
                <label style={{ fontSize: 12, color: 'var(--muted)', marginRight: 8 }}>Logo 大小:</label>
                <input
                  type="range"
                  min={0.1}
                  max={0.4}
                  step={0.05}
                  value={logoSize}
                  onChange={e => setLogoSize(Number(e.target.value))}
                  style={{ width: 120 }}
                />
                <span style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 8 }}>
                  {Math.round(logoSize * 100)}%
                </span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="tool-row">
            <label></label>
            <div className="field error-text">{error}</div>
          </div>
        )}
      </div>

      {/* 二维码预览 */}
      <div className="tool-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          <QrCode size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          二维码预览
        </h3>

        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          {/* 隐藏的 canvas 用于生成 */}
          <canvas
            ref={canvasRef}
            style={{ display: 'none' }}
          />

          {/* 显示的二维码图片 */}
          {qrDataUrl ? (
            <div
              style={{
                padding: 16,
                background: 'var(--bg3)',
                borderRadius: 12,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <img
                src={qrDataUrl}
                alt="QR Code"
                style={{
                  width: size,
                  height: size,
                  borderRadius: 8,
                  boxShadow: 'var(--shadow-md)',
                }}
              />
              <button onClick={handleDownload}>
                <Download size={16} />
                下载 PNG
              </button>
            </div>
          ) : (
            <div
              style={{
                width: size,
                height: size,
                background: 'var(--bg3)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--muted)',
              }}
            >
              <Image size={48} />
            </div>
          )}
        </div>
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />

      {/* 滑块样式 */}
      <style>{`
        input[type="range"] {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          background: var(--bg3);
          border-radius: 3px;
          cursor: pointer;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: var(--accent);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid var(--bg2);
        }
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          background: var(--accent);
          border-radius: 50%;
          cursor: pointer;
          border: 2px solid var(--bg2);
        }
      `}</style>
    </div>
  );
}