/**
 * JIBA — useUsername フック
 * ユーザーネームを localStorage に永続化し、Supabase にも非同期で同期する。
 * localStorage キー: 'jiba_username'
 * Supabase 同期失敗はノンクリティカル（ローカル保存は常に成功）。
 */

import { useState, useCallback } from 'react';
import { updateUsername } from '../network/ratingService';
import { MY_PLAYER_ID } from '../network/supabaseClient';

const STORAGE_KEY = 'jiba_username';

function loadUsername(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function saveUsernameToStorage(name: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, name);
  } catch {}
}

export interface UseUsernameReturn {
  username: string | null;
  isSaving: boolean;
  saveUsername: (name: string) => Promise<void>;
}

export function useUsername(): UseUsernameReturn {
  const [username, setUsername] = useState<string | null>(() => loadUsername());
  const [isSaving, setIsSaving] = useState(false);

  const saveUsername = useCallback(async (name: string) => {
    setIsSaving(true);
    try {
      // ローカル保存（即時）
      saveUsernameToStorage(name);
      setUsername(name);
      // Supabase 同期（失敗しても致命的でない）
      await updateUsername(MY_PLAYER_ID, name);
    } catch {
      // Supabase 同期失敗はサイレントに無視
    } finally {
      setIsSaving(false);
    }
  }, []);

  return { username, isSaving, saveUsername };
}
