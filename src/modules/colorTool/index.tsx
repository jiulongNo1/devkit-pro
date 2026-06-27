/**
 * ColorTool - 颜色工具模块
 * 
 * 【功能说明】
 * - HEX / RGB / HSL 三向互转
 * - 颜色预览与一键复制
 * - 调色板生成（邻近色、互补色、三色方案）
 */

import { useState, useCallback, useEffect } from 'react';
import { Copy, RefreshCw, Palette } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';
import HistoryPanel from '../../components/HistoryPanel';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';

const MODULE_ID = 'colorTool';
const MODULE_NAME = '颜色工具';

// ============ 颜色转换工具函数 ============

/** HEX 转 RGB */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : null;
}

/** RGB 转 HEX */
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/** RGB 转 HSL */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** HSL 转 RGB */
function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }

  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

/** 判断字符串是否为有效 HEX */
function isValidHex(hex: string): boolean {
  return /^#?([a-f\d]{6}|[a-f\d]{3})$/i.test(hex);
}

/** 判断字符串是否为有效 RGB */
function isValidRgb(str: string): boolean {
  return /^rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.test(str);
}

/** 判断字符串是否为有效 HSL */
function isValidHsl(str: string): boolean {
  return /^hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)$/i.test(str);
}

/** 解析 RGB 字符串 */
function parseRgb(str: string): { r: number; g: number; b: number } | null {
  const match = str.match(/rgb\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)/i);
  return match ? { r: parseInt(match[1]), g: parseInt(match[2]), b: parseInt(match[3]) } : null;
}

/** 解析 HSL 字符串 */
function parseHsl(str: string): { h: number; s: number; l: number } | null {
  const match = str.match(/hsl\s*\(\s*(\d{1,3})\s*,\s*(\d{1,3})%?\s*,\s*(\d{1,3})%?\s*\)/i);
  return match ? { h: parseInt(match[1]), s: parseInt(match[2]), l: parseInt(match[3]) } : null;
}

// ============ 调色板生成函数 ============

/** 生成邻近色（色相 ±30°） */
function generateAnalogous(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const colors: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const newH = (hsl.h + i * 30 + 360) % 360;
    const newRgb = hslToRgb(newH, hsl.s, hsl.l);
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  }
  return colors;
}

/** 生成互补色（色相 +180°） */
function generateComplementary(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const colors: string[] = [];
  for (let i = -2; i <= 2; i++) {
    const newH = (hsl.h + 180 + i * 15 + 360) % 360;
    const newRgb = hslToRgb(newH, hsl.s, hsl.l);
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  }
  return colors;
}

/** 生成三色方案（色相 0°、120°、240° 附近各取一个） */
function generateTriadic(hex: string): string[] {
  const rgb = hexToRgb(hex);
  if (!rgb) return [];
  const hsl = rgbToHsl(rgb.r, rgb.g, rgb.b);
  const baseAngles = [0, 120, 240];
  const colors: string[] = [];
  baseAngles.forEach(base => {
    const newH = (base + Math.round((hsl.h - base) / 3)) % 360;
    const newRgb = hslToRgb(newH, hsl.s, hsl.l);
    colors.push(rgbToHex(newRgb.r, newRgb.g, newRgb.b));
  });
  // 补充两个颜色
  const newH1 = (hsl.h + 60) % 360;
  const newH2 = (hsl.h + 180) % 360;
  const rgb1 = hslToRgb(newH1, hsl.s, hsl.l);
  const rgb2 = hslToRgb(newH2, hsl.s, hsl.l);
  colors.push(rgbToHex(rgb1.r, rgb1.g, rgb1.b));
  colors.push(rgbToHex(rgb2.r, rgb2.g, rgb2.b));
  return colors;
}

/** 生成随机颜色 */
function generateRandomColor(): string {
  const r = Math.floor(Math.random() * 256);
  const g = Math.floor(Math.random() * 256);
  const b = Math.floor(Math.random() * 256);
  return rgbToHex(r, g, b);
}

// ============ 组件 ============

export default function ColorTool() {
  const [hex, setHex] = useState('#2563EB');
  const [rgb, setRgb] = useState('rgb(37, 99, 235)');
  const [hsl, setHsl] = useState('hsl(217, 91%, 53%)');
  const [inputValue, setInputValue] = useState('#2563EB');
  const [inputError, setInputError] = useState('');

  const toast = useToast();
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  // 解析并更新颜色
  const updateColor = useCallback((input: string) => {
    const trimmed = input.trim();

    // 尝试 HEX
    if (isValidHex(trimmed)) {
      const normalizedHex = trimmed.startsWith('#') ? trimmed : '#' + trimmed;
      const rgbVal = hexToRgb(normalizedHex);
      if (rgbVal) {
        setHex(normalizedHex.toUpperCase());
        setRgb(`rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b})`);
        const hslVal = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b);
        setHsl(`hsl(${hslVal.h}, ${hslVal.s}%, ${hslVal.l}%)`);
        setInputError('');
        return true;
      }
    }

    // 尝试 RGB
    if (isValidRgb(trimmed)) {
      const rgbVal = parseRgb(trimmed)!;
      const hexVal = rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b);
      setHex(hexVal);
      setRgb(trimmed);
      const hslVal = rgbToHsl(rgbVal.r, rgbVal.g, rgbVal.b);
      setHsl(`hsl(${hslVal.h}, ${hslVal.s}%, ${hslVal.l}%)`);
      setInputError('');
      return true;
    }

    // 尝试 HSL
    if (isValidHsl(trimmed)) {
      const hslVal = parseHsl(trimmed)!;
      const rgbVal = hslToRgb(hslVal.h, hslVal.s, hslVal.l);
      const hexVal = rgbToHex(rgbVal.r, rgbVal.g, rgbVal.b);
      setHex(hexVal);
      setRgb(`rgb(${rgbVal.r}, ${rgbVal.g}, ${rgbVal.b})`);
      setHsl(trimmed);
      setInputError('');
      return true;
    }

    setInputError('无效的颜色格式');
    return false;
  }, []);

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    updateColor(value);
  };

  // 处理输入失焦（保存历史）
  const handleInputBlur = () => {
    if (!inputError && inputValue.trim()) {
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: inputValue.slice(0, 200),
        output: hex,
      });
    }
  };

  // 复制颜色值
  const handleCopy = async (value: string) => {
    await copyToClipboard(value);
    toast.success('已复制: ' + value);
  };

  // 随机颜色
  const handleRandom = () => {
    const newColor = generateRandomColor();
    setInputValue(newColor);
    updateColor(newColor);
  };

  // 从历史记录回填
  const handleSelectHistory = (item: { input: string }) => {
    setInputValue(item.input);
    updateColor(item.input);
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  // 注册快捷键：Ctrl+Enter 随机颜色，Ctrl+Shift+C 复制 HEX
  useModuleShortcuts(handleRandom, () => handleCopy(hex));

  // 生成调色板
  const analogousColors = generateAnalogous(hex);
  const complementaryColors = generateComplementary(hex);
  const triadicColors = generateTriadic(hex);

  return (
    <div>
      <div className="module-header">
        <h2>颜色工具</h2>
        <p>HEX / RGB / HSL 三向互转，调色板生成</p>
      </div>

      <div className="tool-panel">
        {/* 颜色预览与输入 */}
        <div className="tool-row" style={{ alignItems: 'flex-start' }}>
          {/* 颜色预览块 */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 12,
              backgroundColor: hex,
              boxShadow: 'var(--shadow-lg)',
              flexShrink: 0,
              border: '1px solid var(--rule)',
            }}
          />

          {/* 输入区 */}
          <div className="field" style={{ flex: 1 }}>
            <div className="tool-row" style={{ marginBottom: 12 }}>
              <label>输入</label>
              <div className="field">
                <input
                  type="text"
                  value={inputValue}
                  onChange={handleInputChange}
                  onBlur={handleInputBlur}
                  placeholder="输入 HEX / RGB / HSL 颜色值"
                  style={{ fontFamily: 'var(--font-mono)' }}
                />
                {inputError && <div className="error-text" style={{ fontSize: 12, marginTop: 4 }}>{inputError}</div>}
              </div>
            </div>

            {/* 颜色值显示与复制 */}
            <div className="color-values">
              <div className="color-value-row">
                <span className="color-label">HEX</span>
                <code className="color-code">{hex}</code>
                <button className="ghost" onClick={() => handleCopy(hex)} title="复制">
                  <Copy size={14} />
                </button>
              </div>
              <div className="color-value-row">
                <span className="color-label">RGB</span>
                <code className="color-code">{rgb}</code>
                <button className="ghost" onClick={() => handleCopy(rgb)} title="复制">
                  <Copy size={14} />
                </button>
              </div>
              <div className="color-value-row">
                <span className="color-label">HSL</span>
                <code className="color-code">{hsl}</code>
                <button className="ghost" onClick={() => handleCopy(hsl)} title="复制">
                  <Copy size={14} />
                </button>
              </div>
            </div>

            <button className="secondary" onClick={handleRandom} style={{ marginTop: 12 }}>
              <RefreshCw size={16} />
              随机颜色
            </button>
          </div>
        </div>
      </div>

      {/* 调色板 */}
      <div className="tool-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          <Palette size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          调色板生成
        </h3>

        {/* 邻近色 */}
        <div style={{ marginBottom: 16 }}>
          <div className="palette-label">邻近色</div>
          <div className="palette-row">
            {analogousColors.map((color, i) => (
              <div
                key={i}
                className="palette-block"
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => { setInputValue(color); updateColor(color); }}
              />
            ))}
          </div>
        </div>

        {/* 互补色 */}
        <div style={{ marginBottom: 16 }}>
          <div className="palette-label">互补色</div>
          <div className="palette-row">
            {complementaryColors.map((color, i) => (
              <div
                key={i}
                className="palette-block"
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => { setInputValue(color); updateColor(color); }}
              />
            ))}
          </div>
        </div>

        {/* 三色方案 */}
        <div>
          <div className="palette-label">三色方案</div>
          <div className="palette-row">
            {triadicColors.map((color, i) => (
              <div
                key={i}
                className="palette-block"
                style={{ backgroundColor: color }}
                title={color}
                onClick={() => { setInputValue(color); updateColor(color); }}
              />
            ))}
          </div>
        </div>
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />

      {/* 样式 */}
      <style>{`
        .color-values {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .color-value-row {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 10px;
          background: var(--bg3);
          border-radius: var(--radius-sm);
        }
        .color-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--muted);
          min-width: 32px;
        }
        .color-code {
          flex: 1;
          font-size: 13px;
          color: var(--ink);
        }
        .palette-label {
          font-size: 12px;
          color: var(--muted);
          margin-bottom: 6px;
        }
        .palette-row {
          display: flex;
          gap: 8px;
        }
        .palette-block {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          cursor: pointer;
          border: 1px solid var(--rule);
          transition: transform 0.15s, box-shadow 0.15s;
        }
        .palette-block:hover {
          transform: scale(1.1);
          box-shadow: var(--shadow-lg);
        }

        @media (max-width: 600px) {
          .palette-row {
            flex-wrap: wrap;
          }
          .palette-block {
            width: calc((100% - 32px) / 5);
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
