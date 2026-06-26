/**
 * useShortcuts - 全局快捷键 Hook
 * 
 * 【React 概念说明】
 * - useEffect: 副作用钩子，类似于 Qt 的 QTimer::singleShot 或事件过滤器
 * - useRef: 保存可变引用，类似于 Qt 的 QPointer 或成员变量指针
 * - CustomEvent: 自定义事件，类似于 Qt 的 QEvent::Type 或自定义信号
 */

import { useEffect, useCallback, createContext, useContext, useRef } from 'react';

/** 快捷键动作接口 - 类似于 QAction 或 QShortcut */
interface ShortcutActions {
  execute: () => void;    // 执行主操作，类似于 QAction::trigger
  copyOutput: () => void; // 复制输出，类似于 QAction::setData
}

/** 快捷键上下文接口 */
interface ShortcutsContextType {
  registerActions: (actions: ShortcutActions) => void;  // 注册动作
  unregisterActions: () => void;  // 注销动作
}

/** 创建快捷键上下文 - 类似于 QActionGroup */
const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

/**
 * ShortcutsProvider - 快捷键提供者
 * 
 * 类似于 Qt 的：
 * - QActionGroup - 管理一组 QAction
 * - QShortcutContext - 快捷键上下文
 */
export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
  /**
   * useRef - 保存可变引用，类似于成员变量指针
   * 类似于：
   *   QPointer<QActions> m_actions;
   *   QAction* m_currentAction;
   * 
   * useRef vs useState：
   * - useState 变化会触发重新渲染
   * - useRef 变化不触发重新渲染，适合保存 DOM 节点或临时数据
   */
  const actionsRef = useRef<ShortcutActions | null>(null);

  const registerActions = useCallback((actions: ShortcutActions) => {
    actionsRef.current = actions;
  }, []);

  const unregisterActions = useCallback(() => {
    actionsRef.current = null;
  }, []);

  return (
    <ShortcutsContext.Provider value={{ registerActions, unregisterActions }}>
      {children}
    </ShortcutsContext.Provider>
  );
}

/** 获取快捷键上下文 - 类似于 qobject_cast 或 findChild */
export function useShortcutsContext() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within a ShortcutsProvider');
  }
  return context;
}

/**
 * useShortcuts - 注册全局快捷键
 * 
 * 类似于 Qt 的：
 * - QShortcut - 快捷键
 * - installEventFilter - 事件过滤器
 * - keyPressEvent - 键盘事件处理
 * 
 * @param moduleList - 模块列表，用于 Alt+1/2/3/4 切换
 * @param onSwitchModule - 切换模块的回调，类似于 QStackedWidget::setCurrentIndex
 */
export function useShortcuts(
  moduleList: string[],
  onSwitchModule: (module: string) => void
) {
  /**
   * useEffect - 副作用钩子
   * 
   * 类似于 Qt 的：
   * - constructor 中的 connect
   * - QTimer::singleShot
   * - QEvent::Type 注册
   * 
   * 第二个参数是依赖数组：
   * - [] 空数组：只在首次渲染时执行，类似于 constructor
   * - [a, b]：a 或 b 变化时重新执行
   * - 不提供：每次渲染都执行（容易出 bug）
   */
  useEffect(() => {
    /**
     * 键盘事件处理函数
     * 类似于 QWidget::keyPressEvent 或 QGraphicsScene::keyPressEvent
     */
    const handleKeyDown = (e: KeyboardEvent) => {
      /**
       * 检查当前焦点是否在输入框
       * 类似于 QApplication::focusWidget()
       */
      const isInputFocused = 
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('role') === 'textbox';

      // ========== Alt+1/2/3/4 切换模块 ==========
      // 类似于 QAction::setShortcut 或 QShortcut::setKey
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= moduleList.length) {
          if (!isInputFocused) {
            e.preventDefault();  // 阻止默认行为（如浏览器菜单）
            onSwitchModule(moduleList[num - 1]);
          }
        }
      }

      // ========== Ctrl+Enter 执行主操作 ==========
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        /**
         * CustomEvent - 自定义事件
         * 类似于 Qt 的：
         * - QEvent::Type (用户自定义事件类型)
         * - QCoreApplication::postEvent
         * - 信号与槽机制
         */
        window.dispatchEvent(new CustomEvent('shortcut-execute'));
      }

      // ========== Ctrl+Shift+C 复制输出 ==========
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c' && !e.altKey) {
        if (!isInputFocused) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-copy'));
        }
      }

      // ========== Esc 关闭面板/弹窗 ==========
      if (e.key === 'Escape') {
        if (!isInputFocused) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-escape'));
        }
      }
    };

    // 注册键盘事件监听 - 类似于 installEventFilter
    document.addEventListener('keydown', handleKeyDown);
    
    // cleanup 函数 - 类似于 destructor 或 QObject::disconnect
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moduleList, onSwitchModule]);
}

/**
 * useModuleShortcuts - 模块级快捷键监听
 * 
 * 用于在特定模块中监听快捷键事件
 * 类似于 QWidget::event 或特定窗口的事件处理
 */
export function useModuleShortcuts(execute: () => void, copyOutput: () => void) {
  const { registerActions, unregisterActions } = useShortcutsContext();

  // 注册/注销动作 - 类似于 QActionGroup::addAction / removeAction
  useEffect(() => {
    registerActions({ execute, copyOutput });
    // cleanup - 组件卸载时自动注销
    return () => unregisterActions();
  }, [execute, copyOutput, registerActions, unregisterActions]);

  // 监听全局快捷键事件 - 类似于 event() 或 customEvent()
  useEffect(() => {
    const handleExecute = () => execute();
    const handleCopy = () => copyOutput();

    window.addEventListener('shortcut-execute', handleExecute);
    window.addEventListener('shortcut-copy', handleCopy);

    return () => {
      window.removeEventListener('shortcut-execute', handleExecute);
      window.removeEventListener('shortcut-copy', handleCopy);
    };
  }, [execute, copyOutput]);
}
