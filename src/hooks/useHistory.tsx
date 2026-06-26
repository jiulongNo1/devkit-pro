/**
 * useHistory - 历史记录管理 Hook
 * 
 * 【React 概念说明】
 * - Context: 跨组件层级传递数据，类似于 Qt 的事件冒泡或 Qt Dashboard 的全局变量
 * - useState 初始化函数: () => storage.getHistory() 表示只在首次渲染时执行，类似于构造函数
 * - Omit<Type, Keys>: TypeScript 工具类型，排除某些属性，类似于 Qt 的 std::decay 或类型萃取
 */

import { useState, useCallback, createContext, useContext } from 'react';
import { storage } from '../utils/storage';
import type { HistoryItem } from '../types';

/** 历史记录上下文接口 - 类似于 QAbstractItemModel 的接口 */
interface HistoryContextType {
  history: HistoryItem[];  // 全部历史记录，类似于 QSqlQueryModel 或 QStandardItemModel
  addHistory: (item: Omit<HistoryItem, 'id' | 'timestamp'>) => void;  // 添加记录
  clearHistory: () => void;  // 清空全部历史
  getModuleHistory: (moduleId: string) => HistoryItem[];  // 获取指定模块的历史
  clearModuleHistory: (moduleId: string) => void;  // 清空指定模块的历史
}

/** 创建历史记录上下文 - 类似于 QSettings 或 QFileSystemModel */
const HistoryContext = createContext<HistoryContextType | null>(null);

/**
 * HistoryProvider - 历史记录提供者组件
 * 
 * 类似于 Qt 的：
 * - QFileSystemWatcher - 监听文件变化
 * - QSqlTableModel - 数据库表模型
 * - QStandardItemModel - 标准数据模型
 */
export function HistoryProvider({ children }: { children: React.ReactNode }) {
  /**
   * useState 初始化函数写法
   * 类似于 Qt 构造函数中的初始化：
   *   m_history(storage.getHistory())
   * 只在组件首次创建时执行一次，后续渲染不会再执行
   */
  const [history, setHistory] = useState<HistoryItem[]>(() => storage.getHistory());

  /**
   * 添加历史记录
   * 类似于 QAbstractItemModel::insertRow 或 QSqlTableModel::insert
   */
  const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    // 构建完整的 HistoryItem，添加 id 和 timestamp
    const newItem: HistoryItem = {
      ...item,  // 展开 item 的所有属性，类似于 QVariantMap 或 QJsonObject
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),  // 唯一 ID
      timestamp: Date.now(),  // 时间戳，类似于 QDateTime::currentMSecsSinceEpoch()
    };
    // 同步到 localStorage - 类似于 QSettings::sync() 或保存到数据库
    storage.addHistory(newItem);
    // 更新 React 状态 - 触发 UI 重新渲染，类似于 model->dataChanged() 信号
    setHistory(prev => [newItem, ...prev].slice(0, 200));  // 最多保留 200 条
  }, []);

  /**
   * 清空全部历史
   * 类似于 QSqlTableModel::clear() 或 QAbstractItemModel::removeRows()
   */
  const clearHistory = useCallback(() => {
    storage.clearHistory();
    setHistory([]);
  }, []);

  /**
   * 获取指定模块的历史记录
   * 类似于 QSortFilterProxyModel::filterAcceptsRow 或 QSqlQuery::exec(filter)
   */
  const getModuleHistory = useCallback((moduleId: string) => {
    return history.filter(h => h.moduleId === moduleId).slice(0, 20);
  }, [history]);

  /**
   * 清空指定模块的历史
   * 类似于 QSqlTableModel::removeRows where clause
   */
  const clearModuleHistory = useCallback((moduleId: string) => {
    const newHistory = history.filter(h => h.moduleId !== moduleId);
    storage.saveHistory(newHistory);  // 持久化
    setHistory(newHistory);  // 更新状态
  }, [history]);

  return (
    <HistoryContext.Provider value={{ history, addHistory, clearHistory, getModuleHistory, clearModuleHistory }}>
      {children}
    </HistoryContext.Provider>
  );
}

/**
 * useHistory - 使用历史记录的 Hook
 * 
 * 类似于 Qt 的：
 * - qobject_cast<*>(parent) - 获取父对象的特定接口
 * - d->model - 直接访问模型指针
 * 
 * 使用示例：
 *   const { addHistory, getModuleHistory } = useHistory();
 *   addHistory({ moduleId: 'json', moduleName: 'JSON', input: '...', output: '...' });
 */
export function useHistory() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
