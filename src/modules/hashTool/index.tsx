/**
 * HashTool - 哈希计算与加密工具模块
 * 
 * 【功能说明】
 * - MD5 / SHA-1 / SHA-256 / SHA-512 哈希计算
 * - AES-CBC / AES-GCM 加解密（Web Crypto API）
 * - 一键复制结果
 */

import { useState, useCallback } from 'react';
import { Copy, Lock, Key, RefreshCw } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';
import HistoryPanel from '../../components/HistoryPanel';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';

const MODULE_ID = 'hashTool';
const MODULE_NAME = '哈希计算';

// ============ MD5 实现（纯 JS） ============

function md5(str: string): string {
  function rotateLeft(val: number, shift: number): number {
    return (val << shift) | (val >>> (32 - shift));
  }

  function addUnsigned(x: number, y: number): number {
    const x8 = x & 0x80000000;
    const y8 = y & 0x80000000;
    const x4 = x & 0x40000000;
    const y4 = y & 0x40000000;
    const result = (x & 0x3FFFFFFF) + (y & 0x3FFFFFFF);
    if (x4 & y4) return result ^ 0x80000000 ^ x8 ^ y8;
    if (x4 | y4) {
      if (result & 0x40000000) return result ^ 0xC0000000 ^ x8 ^ y8;
      else return result ^ 0x40000000 ^ x8 ^ y8;
    } else return result ^ x8 ^ y8;
  }

  function F(x: number, y: number, z: number): number { return (x & y) | ((~x) & z); }
  function G(x: number, y: number, z: number): number { return (x & z) | (y & (~z)); }
  function H(x: number, y: number, z: number): number { return x ^ y ^ z; }
  function I(x: number, y: number, z: number): number { return y ^ (x | (~z)); }

  function FF(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(F(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function GG(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(G(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function HH(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(H(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }
  function II(a: number, b: number, c: number, d: number, x: number, s: number, ac: number): number {
    a = addUnsigned(a, addUnsigned(addUnsigned(I(b, c, d), x), ac));
    return addUnsigned(rotateLeft(a, s), b);
  }

  function convertToWordArray(str: string): number[] {
    let wordCount;
    const messageLen = str.length;
    const numberOfWords = ((messageLen + 8) - ((messageLen + 8) % 64)) / 64 + 1;
    const wordArray: number[] = new Array(numberOfWords * 16 - 1).fill(0);
    let bytePosition = 0;
    let byteCount = 0;
    while (byteCount < messageLen) {
      wordCount = (byteCount - (byteCount % 4)) / 4;
      bytePosition = (byteCount % 4) * 8;
      wordArray[wordCount] = wordArray[wordCount] | (str.charCodeAt(byteCount) << bytePosition);
      byteCount++;
    }
    wordCount = (byteCount - (byteCount % 4)) / 4;
    bytePosition = (byteCount % 4) * 8;
    wordArray[wordCount] = wordArray[wordCount] | (0x80 << bytePosition);
    wordArray[numberOfWords * 16 - 2] = messageLen << 3;
    wordArray[numberOfWords * 16 - 1] = messageLen >>> 29;
    return wordArray;
  }

  function wordToHex(value: number): string {
    let hex = '';
    for (let i = 0; i <= 3; i++) {
      const byte = (value >>> (i * 8)) & 255;
      hex += ('0' + byte.toString(16)).slice(-2);
    }
    return hex;
  }

  const x = convertToWordArray(str);
  let a = 0x67452301, b = 0xEFCDAB89, c = 0x98BADCFE, d = 0x10325476;
  const S11 = 7, S12 = 12, S13 = 17, S14 = 22;
  const S21 = 5, S22 = 9, S23 = 14, S24 = 20;
  const S31 = 4, S32 = 11, S33 = 16, S34 = 23;
  const S41 = 6, S42 = 10, S43 = 15, S44 = 21;

  for (let k = 0; k < x.length; k += 16) {
    const AA = a, BB = b, CC = c, DD = d;
    a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
    d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
    c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
    b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
    a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
    d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
    c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
    b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
    a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
    d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
    c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
    b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
    a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
    d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
    c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
    b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
    a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
    d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
    c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
    b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
    a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
    d = GG(d, a, b, c, x[k + 10], S22, 0x02441453);
    c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
    b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
    a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
    d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
    c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
    b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
    a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
    d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
    c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
    b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
    a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
    d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
    c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
    b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
    a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
    d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
    c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
    b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
    a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
    d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
    c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
    b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
    a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
    d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
    c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
    b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
    a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
    d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
    c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
    b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
    a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
    d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
    c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
    b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
    a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
    d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
    c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
    b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
    a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
    d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
    c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
    b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
    a = addUnsigned(a, AA);
    b = addUnsigned(b, BB);
    c = addUnsigned(c, CC);
    d = addUnsigned(d, DD);
  }
  return (wordToHex(a) + wordToHex(b) + wordToHex(c) + wordToHex(d)).toLowerCase();
}

// ============ SHA 系列（Web Crypto API） ============

async function sha1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-1', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha512(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hash = await crypto.subtle.digest('SHA-512', data);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ AES 加解密（Web Crypto API） ============

function str2ab(str: string): ArrayBuffer {
  return new TextEncoder().encode(str).buffer;
}

function ab2hex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function hex2ab(hex: string): ArrayBuffer {
  const cleanHex = hex.replace(/[^0-9a-fA-F]/g, '');
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes.buffer;
}

async function aesEncrypt(text: string, keyStr: string, ivStr: string, mode: 'CBC' | 'GCM'): Promise<string> {
  const keyData = str2ab(keyStr.padEnd(32, '\0').slice(0, 32));
  const ivData = str2ab(ivStr.padEnd(16, '\0').slice(0, 16));
  const key = await crypto.subtle.importKey('raw', keyData, { name: `AES-${mode}` }, false, ['encrypt']);
  const encrypted = await crypto.subtle.encrypt(
    { name: `AES-${mode}`, iv: ivData },
    key,
    str2ab(text)
  );
  return ab2hex(encrypted);
}

async function aesDecrypt(hexStr: string, keyStr: string, ivStr: string, mode: 'CBC' | 'GCM'): Promise<string> {
  const keyData = str2ab(keyStr.padEnd(32, '\0').slice(0, 32));
  const ivData = str2ab(ivStr.padEnd(16, '\0').slice(0, 16));
  const key = await crypto.subtle.importKey('raw', keyData, { name: `AES-${mode}` }, false, ['decrypt']);
  const data = hex2ab(hexStr);
  const decrypted = await crypto.subtle.decrypt(
    { name: `AES-${mode}`, iv: ivData },
    key,
    data
  );
  return new TextDecoder().decode(decrypted);
}

// ============ 组件 ============

export default function HashTool() {
  const [input, setInput] = useState('Hello, DevKit Pro!');
  const [md5Hash, setMd5Hash] = useState('');
  const [sha1Hash, setSha1Hash] = useState('');
  const [sha256Hash, setSha256Hash] = useState('');
  const [sha512Hash, setSha512Hash] = useState('');
  const [computed, setComputed] = useState(false);

  const [aesMode, setAesMode] = useState<'CBC' | 'GCM'>('CBC');
  const [aesKey, setAesKey] = useState('mysecretkey12345');
  const [aesIv, setAesIv] = useState('1234567890123456');
  const [aesInput, setAesInput] = useState('Hello, AES!');
  const [aesOutput, setAesOutput] = useState('');
  const [aesError, setAesError] = useState('');
  const [isAesEncrypt, setIsAesEncrypt] = useState(true);

  const toast = useToast();
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  // 计算所有哈希
  const computeAll = useCallback(async () => {
    if (!input.trim()) {
      toast.error('请输入内容');
      return;
    }
    setMd5Hash(md5(input));
    setSha1Hash(await sha1(input));
    setSha256Hash(await sha256(input));
    setSha512Hash(await sha512(input));
    setComputed(true);
    addHistory({
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      input: input.slice(0, 100),
      output: 'SHA-256: ' + (await sha256(input)).slice(0, 32) + '...',
    });
  }, [input, addHistory, toast]);

  // 复制哈希值
  const handleCopy = async (value: string, label: string) => {
    if (!value) return;
    await copyToClipboard(value);
    toast.success(`已复制 ${label}`);
  };

  // AES 加密
  const handleAesEncrypt = async () => {
    try {
      setAesError('');
      const result = await aesEncrypt(aesInput, aesKey, aesIv, aesMode);
      setAesOutput(result);
      setIsAesEncrypt(true);
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: `AES-${aesMode} 加密: ${aesInput.slice(0, 50)}`,
        output: result.slice(0, 50) + '...',
      });
    } catch (e) {
      setAesError('加密失败: ' + (e as Error).message);
    }
  };

  // AES 解密
  const handleAesDecrypt = async () => {
    try {
      setAesError('');
      const result = await aesDecrypt(aesInput, aesKey, aesIv, aesMode);
      setAesOutput(result);
      setIsAesEncrypt(false);
      addHistory({
        moduleId: MODULE_ID,
        moduleName: MODULE_NAME,
        input: `AES-${aesMode} 解密: ${aesInput.slice(0, 50)}`,
        output: result.slice(0, 50),
      });
    } catch (e) {
      setAesError('解密失败: ' + (e as Error).message);
    }
  };

  // 随机生成密钥
  const generateRandomKey = () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    setAesKey(Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''));
  };

  const generateRandomIv = () => {
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    setAesIv(Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join(''));
  };

  // 历史记录回填
  const handleSelectHistory = (item: { input: string; output: string }) => {
    setInput(item.input);
    setComputed(false);
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  // 快捷键：Ctrl+Enter 计算哈希
  useModuleShortcuts(computeAll, () => handleCopy(sha256Hash, 'SHA-256'));

  const hashItems = [
    { label: 'MD5', value: md5Hash, length: 32 },
    { label: 'SHA-1', value: sha1Hash, length: 40 },
    { label: 'SHA-256', value: sha256Hash, length: 64 },
    { label: 'SHA-512', value: sha512Hash, length: 128 },
  ];

  return (
    <div>
      <div className="module-header">
        <h2>哈希计算 / AES 加解密</h2>
        <p>MD5 / SHA-1 / SHA-256 / SHA-512 & AES</p>
      </div>

      {/* 哈希计算区 */}
      <div className="tool-panel">
        <div className="tool-row">
          <label>输入文本</label>
          <div className="field">
            <textarea
              value={input}
              onChange={e => { setInput(e.target.value); setComputed(false); }}
              rows={4}
              placeholder="输入要计算哈希的文本..."
            />
          </div>
        </div>

        <div className="tool-row">
          <label></label>
          <div className="field btn-group">
            <button onClick={computeAll}>
              <Lock size={16} /> 计算哈希
            </button>
            <button className="secondary" onClick={() => { setInput(''); setComputed(false); }}>
              清空
            </button>
          </div>
        </div>

        {computed && hashItems.map(item => (
          <div key={item.label} className="tool-row">
            <label>{item.label}</label>
            <div className="field">
              <div className="output-box">
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all' }}>
                  {item.value}
                </code>
                <button className="ghost copy-btn" onClick={() => handleCopy(item.value, item.label)} title="复制">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* AES 加解密区 */}
      <div className="tool-panel">
        <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: 'var(--muted)' }}>
          <Key size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          AES 加解密
        </h3>

        <div className="tool-row">
          <label>模式</label>
          <div className="field btn-group" style={{ maxWidth: 200 }}>
            <button
              className={aesMode === 'CBC' ? '' : 'secondary'}
              onClick={() => setAesMode('CBC')}
            >
              CBC
            </button>
            <button
              className={aesMode === 'GCM' ? '' : 'secondary'}
              onClick={() => setAesMode('GCM')}
            >
              GCM
            </button>
          </div>
        </div>

        <div className="tool-row">
          <label>密钥</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={aesKey}
                onChange={e => setAesKey(e.target.value)}
                placeholder="密钥（最长32字节）"
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              <button className="ghost" onClick={generateRandomKey} title="随机生成">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="tool-row">
          <label>IV</label>
          <div className="field">
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={aesIv}
                onChange={e => setAesIv(e.target.value)}
                placeholder="偏移量（最长16字节）"
                style={{ flex: 1, fontFamily: 'var(--font-mono)' }}
              />
              <button className="ghost" onClick={generateRandomIv} title="随机生成">
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="tool-row">
          <label>{isAesEncrypt ? '明文' : '密文'}</label>
          <div className="field">
            <textarea
              value={aesInput}
              onChange={e => { setAesInput(e.target.value); setAesOutput(''); setAesError(''); }}
              rows={3}
              placeholder={isAesEncrypt ? '输入要加密的文本...' : '输入要解密的十六进制...'}
              style={{ fontFamily: 'var(--font-mono)' }}
            />
          </div>
        </div>

        <div className="tool-row">
          <label></label>
          <div className="field btn-group">
            <button onClick={handleAesEncrypt}>
              <Lock size={16} /> 加密
            </button>
            <button className="secondary" onClick={handleAesDecrypt}>
              解密
            </button>
            <button className="secondary" onClick={() => { setAesInput(''); setAesOutput(''); setAesError(''); }}>
              清空
            </button>
          </div>
        </div>

        {aesError && (
          <div className="tool-row">
            <label></label>
            <div className="field error-text">{aesError}</div>
          </div>
        )}

        {aesOutput && (
          <div className="tool-row">
            <label>{isAesEncrypt ? '密文' : '明文'}</label>
            <div className="field">
              <div className="output-box">
                <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all' }}>
                  {aesOutput}
                </code>
                <button className="ghost copy-btn" onClick={() => handleCopy(aesOutput, isAesEncrypt ? '密文' : '明文')} title="复制">
                  <Copy size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}
