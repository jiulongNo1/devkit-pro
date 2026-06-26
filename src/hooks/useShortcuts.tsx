import { useEffect, useCallback, createContext, useContext, useRef } from 'react';

interface ShortcutActions {
  execute: () => void;
  copyOutput: () => void;
}

interface ShortcutsContextType {
  registerActions: (actions: ShortcutActions) => void;
  unregisterActions: () => void;
}

const ShortcutsContext = createContext<ShortcutsContextType | null>(null);

export function ShortcutsProvider({ children }: { children: React.ReactNode }) {
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

export function useShortcutsContext() {
  const context = useContext(ShortcutsContext);
  if (!context) {
    throw new Error('useShortcutsContext must be used within a ShortcutsProvider');
  }
  return context;
}

export function useShortcuts(
  moduleList: string[],
  onSwitchModule: (module: string) => void
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 检查是否在输入框中（排除 Ctrl+Enter）
      const isInputFocused = 
        document.activeElement instanceof HTMLInputElement ||
        document.activeElement instanceof HTMLTextAreaElement ||
        document.activeElement?.getAttribute('role') === 'textbox';

      // Alt+1/2/3/4 切换模块
      if (e.altKey && !e.ctrlKey && !e.shiftKey) {
        const num = parseInt(e.key);
        if (num >= 1 && num <= moduleList.length) {
          if (!isInputFocused) {
            e.preventDefault();
            onSwitchModule(moduleList[num - 1]);
          }
        }
      }

      // Ctrl+Enter 执行主操作（输入框中也生效）
      if (e.ctrlKey && e.key === 'Enter' && !e.shiftKey && !e.altKey) {
        e.preventDefault();
        // 触发全局的主操作事件
        window.dispatchEvent(new CustomEvent('shortcut-execute'));
      }

      // Ctrl+Shift+C 复制输出
      if (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'c' && !e.altKey) {
        if (!isInputFocused) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-copy'));
        }
      }

      // Esc 关闭面板/弹窗
      if (e.key === 'Escape') {
        if (!isInputFocused) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('shortcut-escape'));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [moduleList, onSwitchModule]);
}

export function useModuleShortcuts(execute: () => void, copyOutput: () => void) {
  const { registerActions, unregisterActions } = useShortcutsContext();

  useEffect(() => {
    registerActions({ execute, copyOutput });
    return () => unregisterActions();
  }, [execute, copyOutput, registerActions, unregisterActions]);

  // 监听全局快捷键事件
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