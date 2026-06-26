/**
 * useToast - 全局 Toast 提示 Hook
 * 
 * 【React 概念说明】
 * - createContext: 创建共享数据的容器，类似于 Qt 的信号/槽机制或单例
 * - createPortal: 将子组件渲染到指定 DOM 节点，类似于 QML 的 Portal 或 Overlay
 * - useCallback: 缓存函数引用，避免每次渲染重新创建，类似于 Qt 的 QMetaObject::invokeMethod 缓存
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import { ToastContainer } from '../components/Toast';

/** Toast 类型 - 类似于 QMessageBox 的图标类型 */
type ToastType = 'success' | 'error' | 'info';

/** 单个 Toast 项的数据结构 */
interface ToastItem {
  id: string;       // 唯一标识，类似于 QVariant 或 QUuid
  message: string;  // 显示文本
  type: ToastType;  // Toast 类型
}

/** Toast 上下文的接口定义 - 类似于 Qt 的接口类或抽象基类 */
interface ToastContextType {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

/**
 * 创建 Toast 上下文
 * 类似于 Qt 的 QSettings 或单例模式
 * 初始值为 null，表示"尚未提供"
 */
const ToastContext = createContext<ToastContextType | null>(null);

/** 最多同时显示的 Toast 数量 - 类似于 QMessageBox 的超时设置 */
const MAX_TOASTS = 3;

/**
 * Toast 提供者组件
 * 类似于 Qt 的 QSystemTrayIcon 或 QDesktopServices
 * 
 * 使用方法：在 App.tsx 中用 <ToastProvider> 包裹子组件
 * 子组件通过 useToast() 获取 toast 对象来显示提示
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  // useState - 类似于 Q_PROPERTY 的 QtList<ToastItem>
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  /**
   * 添加 Toast
   * useCallback - 缓存函数，避免每次渲染重新创建
   * 类似于 Qt 的 QSignalSpy 或连接一次性的信号
   */
  const addToast = useCallback((message: string, type: ToastType) => {
    // 生成唯一 ID：时间戳 + 随机数，类似于 QUuid::createUuid()
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    setToasts((prev) => {
      const newToasts = [...prev, { id, message, type }];
      // 超过最大数量时，移除最旧的（数组前面的）
      if (newToasts.length > MAX_TOASTS) {
        return newToasts.slice(-MAX_TOASTS);
      }
      return newToasts;
    });
  }, []);

  /** 移除 Toast - 类似于 QTimer::singleShot 过期后清除 */
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // 封装三个快捷方法 - 类似于 QMessageBox 的静态方法
  const toast = {
    success: (message: string) => addToast(message, 'success'),
    error: (message: string) => addToast(message, 'error'),
    info: (message: string) => addToast(message, 'info'),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/*
        createPortal - 将 Toast 渲染到 body 元素
        类似于 Qt 的 QGraphicsScene::addWidget 或 QML 的 ApplicationWindow.overlay
        这样可以避免 z-index 和 overflow 问题
      */}
      {createPortal(
        <ToastContainer toasts={toasts} onClose={removeToast} />,
        document.body
      )}
    </ToastContext.Provider>
  );
}

/**
 * useToast Hook - 获取 Toast 上下文
 * 
 * 类似于 Qt 的 qobject_cast 或依赖注入
 * 
 * 使用示例：
 *   const toast = useToast();
 *   toast.success('操作成功');
 *   toast.error('出错了');
 */
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
