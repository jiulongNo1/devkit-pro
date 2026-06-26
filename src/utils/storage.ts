const STORAGE_KEY = 'devkit_pro_history';
const FAVORITES_KEY = 'devkit_pro_favorites';
const THEME_KEY = 'devkit_pro_theme';

import type { HistoryItem, Theme } from '../types';

export const storage = {
  getHistory(): HistoryItem[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  saveHistory(items: HistoryItem[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  },

  addHistory(item: HistoryItem): void {
    const history = this.getHistory();
    history.unshift(item);
    // 最多保留200条
    if (history.length > 200) {
      history.length = 200;
    }
    this.saveHistory(history);
  },

  clearHistory(): void {
    localStorage.removeItem(STORAGE_KEY);
  },

  getFavorites(): string[] {
    try {
      const data = localStorage.getItem(FAVORITES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  },

  toggleFavorite(id: string): boolean {
    const favorites = this.getFavorites();
    const index = favorites.indexOf(id);
    if (index > -1) {
      favorites.splice(index, 1);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return false;
    } else {
      favorites.push(id);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
      return true;
    }
  },

  getTheme(): Theme {
    try {
      const data = localStorage.getItem(THEME_KEY);
      return (data as Theme) || 'system';
    } catch {
      return 'system';
    }
  },

  setTheme(theme: Theme): void {
    localStorage.setItem(THEME_KEY, theme);
  },
};

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
