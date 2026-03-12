/**
 * JIBA — useUsername フック
 * ユーザーネームを AsyncStorage に永続化し、Supabase にも非同期で同期する。
 * AsyncStorage キー: 'jiba_username'
 * Supabase 同期失敗はノンクリティカル（ローカル保存は常に成功）。
 */

import { useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUsername } from '../network/ratingService';
import { MY_PLAYER_ID } from '../network/supabaseClient';

const STORAGE_KEY = 'jiba_username';

export interface UseUsernameReturn {
  username: string | null;
  /** AsyncStorage からの読み込みが完了したか */
  isLoaded: boolean;
  isSaving: boolean;
  saveUsername: (name: string) => Promise<void>;
  clearUsername: () => Promise<void>;
}

export function useUsername(): UseUsernameReturn {
  const [username, setUsername] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 起動時に AsyncStorage から読み込む
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then(value => setUsername(value))
      .catch(() => setUsername(null))
      .finally(() => setIsLoaded(true));
  }, []);

  const saveUsername = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      // ローカル保存（即時）
      await AsyncStorage.setItem(STORAGE_KEY, name);
      setUsername(name);
      // Supabase 同期（失敗しても致命的でない）
      await updateUsername(MY_PLAYER_ID, name);
    } catch {
      // Supabase 同期失敗はサイレントに無視
    } finally {
      setIsSaving(false);
    }
  }, []);

  const clearUsername = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {}
    setUsername(null);
  }, []);

  return { username, isLoaded, isSaving, saveUsername, clearUsername };
}
