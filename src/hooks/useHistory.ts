import { useState, useCallback } from 'react';
import { storage } from '../utils/storage';
import type { HistoryItem } from '../types';

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>(() => storage.getHistory());

  const addHistory = useCallback((item: Omit<HistoryItem, 'id' | 'timestamp'>) => {
    const newItem: HistoryItem = {
      ...item,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
    };
    storage.addHistory(newItem);
    setHistory(prev => [newItem, ...prev].slice(0, 200));
    return newItem;
  }, []);

  const clearHistory = useCallback(() => {
    storage.clearHistory();
    setHistory([]);
  }, []);

  const getModuleHistory = useCallback((moduleId: string) => {
    return history.filter(h => h.moduleId === moduleId).slice(0, 20);
  }, [history]);

  return { history, addHistory, clearHistory, getModuleHistory };
}
