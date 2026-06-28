/**
 * HashTool - 哈希与校验模块
 *
 * 【功能说明】
 * - 密码学哈希：MD5 / SHA-1 / SHA-256 / SHA-512
 * - 校验和：CRC-8/16/32、Adler-32、Sum、XOR
 * - AES 加解密：AES-CBC / AES-GCM
 * - 支持文本和十六进制两种输入模式
 */

import { useState, useMemo, useCallback } from 'react';
import { Copy, Lock, Key, RefreshCw, ShieldCheck, Hash, FileCode } from 'lucide-react';
import { copyToClipboard } from '../../utils/storage';
import { useToast } from '../../hooks/useToast';
import HistoryPanel from '../../components/HistoryPanel';
import { useHistory } from '../../hooks/useHistory';
import { useModuleShortcuts } from '../../hooks/useShortcuts';

const MODULE_ID = 'hashTool';
const MODULE_NAME = '哈希与校验';

type TabType = 'crypto' | 'checksum' | 'aes';
type InputMode = 'text' | 'hex';

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

async function sha1(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-1', data as unknown as BufferSource);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', data as unknown as BufferSource);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function sha512(data: Uint8Array): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-512', data as unknown as BufferSource);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ CRC 查表法实现 ============

// CRC-8 查表 (多项式 0x07)
const CRC8_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) : (crc << 1);
  }
  CRC8_TABLE[i] = crc & 0xFF;
}

// CRC-16-CCITT 查表 (多项式 0x1021)
const CRC16_CCITT_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let crc = i << 8;
  for (let j = 0; j < 8; j++) {
    crc = (crc & 0x8000) ? ((crc << 1) ^ 0x1021) : (crc << 1);
  }
  CRC16_CCITT_TABLE[i] = crc & 0xFFFF;
}

// CRC-16-MODBUS 查表 (多项式 0x8005, 输入反转)
const CRC16_MODBUS_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = (crc & 1) ? ((crc >> 1) ^ 0xA001) : (crc >> 1);
  }
  CRC16_MODBUS_TABLE[i] = crc & 0xFFFF;
}

// CRC-32 查表 (多项式 0x04C11DB7, 输入反转)
const CRC32_TABLE: number[] = [];
for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    crc = (crc & 1) ? ((crc >> 1) ^ 0xEDB88320) : (crc >> 1);
  }
  CRC32_TABLE[i] = crc >>> 0;
}

// 反转位
function reflectBits(value: number, width: number): number {
  let result = 0;
  for (let i = 0; i < width; i++) {
    if (value & (1 << i)) {
      result |= 1 << (width - 1 - i);
    }
  }
  return result;
}

function calcCRC8(data: Uint8Array): number {
  let crc = 0;
  for (const byte of data) {
    crc = CRC8_TABLE[(crc ^ byte) & 0xFF];
  }
  return crc & 0xFF;
}

function calcCRC16Modbus(data: Uint8Array): number {
  let crc = 0xFFFF;
  for (const byte of data) {
    crc = ((crc >> 8) ^ CRC16_MODBUS_TABLE[(crc ^ byte) & 0xFF]) & 0xFFFF;
  }
  return crc;
}

function calcCRC16Ccitt(data: Uint8Array): number {
  let crc = 0xFFFF;
  for (const byte of data) {
    crc = ((crc << 8) ^ CRC16_CCITT_TABLE[((crc >> 8) ^ byte) & 0xFF]) & 0xFFFF;
  }
  return crc;
}

function calcCRC16Ibm(data: Uint8Array): number {
  let crc = 0x0000;
  for (const byte of data) {
    crc = ((crc >> 8) ^ CRC16_MODBUS_TABLE[(crc ^ byte) & 0xFF]) & 0xFFFF;
  }
  return crc;
}

function calcCRC32(data: Uint8Array): number {
  let crc = 0xFFFFFFFF;
  for (const byte of data) {
    crc = ((crc >> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xFF]) >>> 0;
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// 自定义 CRC
function calcCustomCRC(data: Uint8Array, width: number, poly: number, init: number, xorOut: number, refIn: boolean, refOut: boolean): number {
  const mask = (1 << width) - 1;
  const table: number[] = [];

  for (let i = 0; i < 256; i++) {
    let crc = refIn ? i : (i << (width - 8));
    for (let j = 0; j < 8; j++) {
      if (refIn) {
        crc = (crc & 1) ? ((crc >> 1) ^ (reflectBits(poly, width) & mask)) : (crc >> 1);
      } else {
        crc = (crc & (1 << (width - 1))) ? ((crc << 1) ^ poly) : (crc << 1);
      }
    }
    table[i] = crc & mask;
  }

  let crc = refIn ? reflectBits(init, width) : init;
  for (const byte of data) {
    if (refIn) {
      crc = ((crc >> 8) ^ table[(crc ^ byte) & 0xFF]) & mask;
    } else {
      crc = ((crc << 8) ^ table[((crc >> (width - 8)) ^ byte) & 0xFF]) & mask;
    }
  }

  if (refOut && !refIn) {
    crc = reflectBits(crc, width);
  }

  return (crc ^ xorOut) & mask;
}

// ============ Adler-32 ============

function calcAdler32(data: Uint8Array): number {
  let a = 1, b = 0;
  for (const byte of data) {
    a = (a + byte) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// ============ 校验和 ============

function calcSum8(data: Uint8Array): number {
  let sum = 0;
  for (const byte of data) sum += byte;
  return sum & 0xFF;
}

function calcSum16(data: Uint8Array): number {
  let sum = 0;
  for (const byte of data) sum += byte;
  return sum & 0xFFFF;
}

function calcSum32(data: Uint8Array): number {
  let sum = 0;
  for (const byte of data) sum += byte;
  return sum >>> 0;
}

function calcXOR8(data: Uint8Array): number {
  let xor = 0;
  for (const byte of data) xor ^= byte;
  return xor & 0xFF;
}

// ============ AES 加解密 ============

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
  const [activeTab, setActiveTab] = useState<TabType>('crypto');
  const [inputMode, setInputMode] = useState<InputMode>('text');
  const [input, setInput] = useState('Hello, DevKit Pro!');

  // 密码学哈希结果
  const [md5Hash, setMd5Hash] = useState('');
  const [sha1Hash, setSha1Hash] = useState('');
  const [sha256Hash, setSha256Hash] = useState('');
  const [sha512Hash, setSha512Hash] = useState('');
  const [cryptoComputed, setCryptoComputed] = useState(false);

  // 校验和结果
  const [selectedChecksum, setSelectedChecksum] = useState('crc32');

  // 自定义 CRC 参数
  const [customPoly, setCustomPoly] = useState('0x04C11DB7');
  const [customInit, setCustomInit] = useState('0xFFFFFFFF');
  const [customXorOut, setCustomXorOut] = useState('0xFFFFFFFF');
  const [customRefIn, setCustomRefIn] = useState(true);
  const [customRefOut, setCustomRefOut] = useState(true);
  const [customWidth, setCustomWidth] = useState(32);

  // AES
  const [aesMode, setAesMode] = useState<'CBC' | 'GCM'>('CBC');
  const [aesKey, setAesKey] = useState('mysecretkey12345');
  const [aesIv, setAesIv] = useState('1234567890123456');
  const [aesInput, setAesInput] = useState('Hello, AES!');
  const [aesOutput, setAesOutput] = useState('');
  const [aesError, setAesError] = useState('');
  const [isAesEncrypt, setIsAesEncrypt] = useState(true);

  const [copied, setCopied] = useState<string | null>(null);
  const toast = useToast();
  const { addHistory, getModuleHistory, clearModuleHistory } = useHistory();

  // 解析输入数据
  const inputData = useMemo(() => {
    if (!input.trim()) return new Uint8Array(0);
    if (inputMode === 'text') {
      return new TextEncoder().encode(input);
    } else {
      const hexStr = input.replace(/[^0-9A-Fa-f]/g, '');
      const bytes: number[] = [];
      for (let i = 0; i < hexStr.length; i += 2) {
        const byteHex = hexStr.slice(i, i + 2);
        if (byteHex.length === 2) bytes.push(parseInt(byteHex, 16));
      }
      return new Uint8Array(bytes);
    }
  }, [input, inputMode]);

  // 计算所有密码学哈希
  const computeCrypto = useCallback(async () => {
    if (inputData.length === 0) {
      toast.error('请输入内容');
      return;
    }
    const text = inputMode === 'text' ? input : new TextDecoder().decode(inputData);
    setMd5Hash(md5(text));
    setSha1Hash(await sha1(inputData));
    setSha256Hash(await sha256(inputData));
    setSha512Hash(await sha512(inputData));
    setCryptoComputed(true);
    addHistory({
      moduleId: MODULE_ID,
      moduleName: MODULE_NAME,
      input: input.slice(0, 100),
      output: 'SHA-256: ' + (await sha256(inputData)).slice(0, 32) + '...',
    });
  }, [inputData, inputMode, input, addHistory, toast]);

  // 校验和结果（实时计算）
  const checksumResults = useMemo(() => {
    if (inputData.length === 0) return {};

    const res: Record<string, { hex: string; dec: string; bits: number }> = {};

    const crc32 = calcCRC32(inputData);
    res['crc32'] = { hex: crc32.toString(16).toUpperCase().padStart(8, '0'), dec: crc32.toString(), bits: 32 };

    const crc16Modbus = calcCRC16Modbus(inputData);
    res['crc16-modbus'] = { hex: crc16Modbus.toString(16).toUpperCase().padStart(4, '0'), dec: crc16Modbus.toString(), bits: 16 };

    const crc16Ccitt = calcCRC16Ccitt(inputData);
    res['crc16-ccitt'] = { hex: crc16Ccitt.toString(16).toUpperCase().padStart(4, '0'), dec: crc16Ccitt.toString(), bits: 16 };

    const crc16Ibm = calcCRC16Ibm(inputData);
    res['crc16-ibm'] = { hex: crc16Ibm.toString(16).toUpperCase().padStart(4, '0'), dec: crc16Ibm.toString(), bits: 16 };

    const crc8 = calcCRC8(inputData);
    res['crc8'] = { hex: crc8.toString(16).toUpperCase().padStart(2, '0'), dec: crc8.toString(), bits: 8 };

    const adler32 = calcAdler32(inputData);
    res['adler32'] = { hex: adler32.toString(16).toUpperCase().padStart(8, '0'), dec: adler32.toString(), bits: 32 };

    res['sum8'] = { hex: calcSum8(inputData).toString(16).toUpperCase().padStart(2, '0'), dec: calcSum8(inputData).toString(), bits: 8 };
    res['sum16'] = { hex: calcSum16(inputData).toString(16).toUpperCase().padStart(4, '0'), dec: calcSum16(inputData).toString(), bits: 16 };
    res['sum32'] = { hex: calcSum32(inputData).toString(16).toUpperCase().padStart(8, '0'), dec: calcSum32(inputData).toString(), bits: 32 };
    res['xor8'] = { hex: calcXOR8(inputData).toString(16).toUpperCase().padStart(2, '0'), dec: calcXOR8(inputData).toString(), bits: 8 };

    // 自定义 CRC
    try {
      const poly = parseInt(customPoly, 16);
      const init = parseInt(customInit, 16);
      const xorOut = parseInt(customXorOut, 16);
      const customCrc = calcCustomCRC(inputData, customWidth, poly, init, xorOut, customRefIn, customRefOut);
      const hexDigits = Math.ceil(customWidth / 4);
      res['custom'] = { hex: customCrc.toString(16).toUpperCase().padStart(hexDigits, '0'), dec: customCrc.toString(), bits: customWidth };
    } catch {
      res['custom'] = { hex: '参数错误', dec: '-', bits: customWidth };
    }

    return res;
  }, [inputData, customPoly, customInit, customXorOut, customRefIn, customRefOut, customWidth]);

  // 复制
  const handleCopy = useCallback((value: string, key: string) => {
    if (!value) return;
    copyToClipboard(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
    toast.success('已复制');
  }, [toast]);

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
    setCryptoComputed(false);
  };

  const handleClearHistory = () => {
    clearModuleHistory(MODULE_ID);
  };

  // 快捷键
  useModuleShortcuts(computeCrypto, () => handleCopy(sha256Hash, 'sha256'));

  const tabs = [
    { id: 'crypto' as TabType, name: '密码学哈希', icon: Lock },
    { id: 'checksum' as TabType, name: '校验和/CRC', icon: ShieldCheck },
    { id: 'aes' as TabType, name: 'AES 加解密', icon: Key },
  ];

  const hashItems = [
    { label: 'MD5', value: md5Hash, length: 32 },
    { label: 'SHA-1', value: sha1Hash, length: 40 },
    { label: 'SHA-256', value: sha256Hash, length: 64 },
    { label: 'SHA-512', value: sha512Hash, length: 128 },
  ];

  const checksumList = [
    { id: 'crc32', name: 'CRC-32 (IEEE)' },
    { id: 'crc16-modbus', name: 'CRC-16 (Modbus)' },
    { id: 'crc16-ccitt', name: 'CRC-16 (CCITT)' },
    { id: 'crc16-ibm', name: 'CRC-16 (IBM)' },
    { id: 'crc8', name: 'CRC-8' },
    { id: 'adler32', name: 'Adler-32' },
    { id: 'sum32', name: 'Sum32' },
    { id: 'sum16', name: 'Sum16' },
    { id: 'sum8', name: 'Sum8' },
    { id: 'xor8', name: 'XOR8' },
    { id: 'custom', name: '自定义 CRC' },
  ];

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>
      <div className="module-header">
        <h2>哈希与校验</h2>
        <p>密码学哈希 · 校验和/CRC · AES 加解密</p>
      </div>

      {/* Tab 切换 */}
      <div style={{
        display: 'flex',
        gap: 4,
        marginBottom: 16,
        background: 'var(--bg3)',
        padding: 4,
        borderRadius: 8
      }}>
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '10px 12px',
                fontSize: 13,
                fontWeight: activeTab === tab.id ? 600 : 400,
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                background: activeTab === tab.id ? 'var(--accent)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'var(--ink)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              <Icon size={16} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* 密码学哈希 Tab */}
      {activeTab === 'crypto' && (
        <div className="tool-panel">
          {/* 输入模式切换 */}
          <div className="tool-row">
            <label>输入模式</label>
            <div className="field btn-group" style={{ maxWidth: 200 }}>
              <button
                className={inputMode === 'text' ? '' : 'secondary'}
                onClick={() => { setInputMode('text'); setCryptoComputed(false); }}
              >
                文本
              </button>
              <button
                className={inputMode === 'hex' ? '' : 'secondary'}
                onClick={() => { setInputMode('hex'); setCryptoComputed(false); }}
              >
                十六进制
              </button>
            </div>
          </div>

          <div className="tool-row">
            <label>输入内容</label>
            <div className="field">
              <textarea
                value={input}
                onChange={e => { setInput(e.target.value); setCryptoComputed(false); }}
                rows={4}
                placeholder={inputMode === 'text' ? '输入要计算哈希的文本...' : '输入十六进制字节，如：48 65 6C 6C 6F'}
                style={{ fontFamily: inputMode === 'hex' ? 'var(--font-mono)' : 'inherit' }}
              />
            </div>
          </div>

          <div className="tool-row">
            <label></label>
            <div className="field btn-group">
              <button onClick={computeCrypto}>
                <Lock size={16} /> 计算哈希
              </button>
              <button className="secondary" onClick={() => { setInput(''); setCryptoComputed(false); }}>
                清空
              </button>
              <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Hash size={14} />
                {inputData.length} 字节
              </div>
            </div>
          </div>

          {cryptoComputed && hashItems.map(item => (
            <div key={item.label} className="tool-row">
              <label>{item.label}</label>
              <div className="field">
                <div className="output-box">
                  <code style={{ fontFamily: 'var(--font-mono)', fontSize: 13, wordBreak: 'break-all' }}>
                    {item.value}
                  </code>
                  <button
                    className="ghost copy-btn"
                    onClick={() => handleCopy(item.value, item.label.toLowerCase())}
                    title="复制"
                  >
                    {copied === item.label.toLowerCase() ? <FileCode size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 校验和 Tab */}
      {activeTab === 'checksum' && (
        <div className="tool-panel">
          {/* 输入模式切换 */}
          <div className="tool-row">
            <label>输入模式</label>
            <div className="field btn-group" style={{ maxWidth: 200 }}>
              <button
                className={inputMode === 'text' ? '' : 'secondary'}
                onClick={() => setInputMode('text')}
              >
                文本
              </button>
              <button
                className={inputMode === 'hex' ? '' : 'secondary'}
                onClick={() => setInputMode('hex')}
              >
                十六进制
              </button>
            </div>
          </div>

          <div className="tool-row">
            <label>输入内容</label>
            <div className="field">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={4}
                placeholder={inputMode === 'text' ? '输入要计算校验和的文本...' : '输入十六进制字节，如：48 65 6C 6C 6F'}
                style={{ fontFamily: inputMode === 'hex' ? 'var(--font-mono)' : 'inherit' }}
              />
            </div>
          </div>

          <div className="tool-row">
            <label></label>
            <div className="field">
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <Hash size={14} />
                {inputData.length} 字节
              </div>
            </div>
          </div>

          {/* 自定义 CRC 参数 */}
          {selectedChecksum === 'custom' && (
            <div style={{
              background: 'var(--bg3)',
              padding: 12,
              borderRadius: 6,
              marginBottom: 12
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>自定义 CRC 参数：</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>宽度 (bits)</label>
                  <select
                    value={customWidth}
                    onChange={e => setCustomWidth(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: 6,
                      fontSize: 12,
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--ink)'
                    }}
                  >
                    <option value={8}>8</option>
                    <option value={16}>16</option>
                    <option value={32}>32</option>
                    <option value={64}>64</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>多项式 (hex)</label>
                  <input
                    type="text"
                    value={customPoly}
                    onChange={e => setCustomPoly(e.target.value)}
                    placeholder="0x..."
                    style={{
                      width: '100%',
                      padding: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--ink)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>初始值 (hex)</label>
                  <input
                    type="text"
                    value={customInit}
                    onChange={e => setCustomInit(e.target.value)}
                    placeholder="0x..."
                    style={{
                      width: '100%',
                      padding: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--ink)'
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>输出异或 (hex)</label>
                  <input
                    type="text"
                    value={customXorOut}
                    onChange={e => setCustomXorOut(e.target.value)}
                    placeholder="0x..."
                    style={{
                      width: '100%',
                      padding: 6,
                      fontSize: 12,
                      fontFamily: 'var(--font-mono)',
                      background: 'var(--bg2)',
                      border: '1px solid var(--border)',
                      borderRadius: 4,
                      color: 'var(--ink)'
                    }}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customRefIn}
                    onChange={e => setCustomRefIn(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  输入反转
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--ink)', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={customRefOut}
                    onChange={e => setCustomRefOut(e.target.checked)}
                    style={{ cursor: 'pointer' }}
                  />
                  输出反转
                </label>
              </div>
            </div>
          )}

          {inputData.length > 0 && checksumResults[selectedChecksum] && (
            <div style={{
              background: 'var(--bg3)',
              padding: 16,
              borderRadius: 6,
              marginBottom: 12
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 12,
                fontSize: 14,
                fontWeight: 600
              }}>
                <ShieldCheck size={18} color="var(--accent)" />
                {checksumList.find(c => c.id === selectedChecksum)?.name}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>HEX 格式</div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    background: 'var(--bg2)',
                    borderRadius: 4
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--accent)'
                    }}>
                      {checksumResults[selectedChecksum].hex}
                    </span>
                    <button
                      onClick={() => handleCopy(checksumResults[selectedChecksum].hex, 'chk-hex')}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: copied === 'chk-hex' ? 'var(--accent)' : 'var(--muted)'
                      }}
                    >
                      {copied === 'chk-hex' ? <FileCode size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>DEC 格式</div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: 8,
                    background: 'var(--bg2)',
                    borderRadius: 4
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 16,
                      fontWeight: 600,
                      color: 'var(--ink)'
                    }}>
                      {checksumResults[selectedChecksum].dec}
                    </span>
                    <button
                      onClick={() => handleCopy(checksumResults[selectedChecksum].dec, 'chk-dec')}
                      style={{
                        padding: 4,
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: copied === 'chk-dec' ? 'var(--accent)' : 'var(--muted)'
                      }}
                    >
                      {copied === 'chk-dec' ? <FileCode size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 所有算法列表 */}
          <div className="tool-row">
            <label>选择算法</label>
            <div className="field">
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: 8
              }}>
                {checksumList.map(alg => {
                  const r = checksumResults[alg.id];
                  return (
                    <div
                      key={alg.id}
                      onClick={() => setSelectedChecksum(alg.id)}
                      style={{
                        padding: 10,
                        background: selectedChecksum === alg.id ? 'var(--bg3)' : 'var(--bg2)',
                        borderRadius: 6,
                        border: selectedChecksum === alg.id ? '1px solid var(--accent)' : '1px solid var(--border)',
                        cursor: 'pointer',
                        transition: 'all 0.15s'
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 500, marginBottom: 4 }}>{alg.name}</div>
                      {r && (
                        <div style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: 13,
                          color: selectedChecksum === alg.id ? 'var(--accent)' : 'var(--muted)'
                        }}>
                          {r.hex}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AES 加解密 Tab */}
      {activeTab === 'aes' && (
        <div className="tool-panel">
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
                  <button className="ghost copy-btn" onClick={() => handleCopy(aesOutput, 'aes-out')} title="复制">
                    {copied === 'aes-out' ? <FileCode size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <HistoryPanel
        history={getModuleHistory(MODULE_ID)}
        onSelect={handleSelectHistory}
        onClear={handleClearHistory}
      />
    </div>
  );
}