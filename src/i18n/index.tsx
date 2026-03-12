/**
 * JIBA — i18n コンテキスト
 * React Context + AsyncStorage で言語設定を永続化する。
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ja, I18nKey } from './ja';
import { en } from './en';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

export type Locale = 'ja' | 'en';

type Strings = Record<I18nKey, string>;

const STRINGS: Record<Locale, Strings> = { ja, en };

const STORAGE_KEY = 'jiba_locale';

// ──────────────────────────────────────────────────────────────
// Context
// ──────────────────────────────────────────────────────────────

interface I18nContextValue {
  locale: Locale;
  /** 文字列を取得する。{key} 形式のプレースホルダーをパラメータで置換可能 */
  t: (key: I18nKey, params?: Record<string, string | number>) => string;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nContextValue>({
  locale: 'ja',
  t: (key) => ja[key],
  setLocale: () => {},
});

// ──────────────────────────────────────────────────────────────
// Provider
// ──────────────────────────────────────────────────────────────

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ja');

  // 起動時に AsyncStorage から読み込む
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(saved => {
        if (saved === 'ja' || saved === 'en') setLocaleState(saved);
      })
      .catch(() => {});
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    AsyncStorage.setItem(STORAGE_KEY, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: I18nKey, params?: Record<string, string | number>): string => {
      let str: string = STRINGS[locale][key] ?? ja[key] ?? key;
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          str = str.replace(`{${k}}`, String(v));
        });
      }
      return str;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={{ locale, t, setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────
// フック
// ──────────────────────────────────────────────────────────────

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
