/**
 * JIBA — エントリーポイント
 */

// uuid が crypto.getRandomValues を使うため、最初にポリフィルを読み込む（React Native 必須）
import 'react-native-get-random-values';
import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from './src/i18n';
import { GameScreen } from './src/screens/GameScreen';
import { initPlayer } from './src/network/supabaseClient';

export default function App() {
  const [playerReady, setPlayerReady] = useState(false);

  useEffect(() => {
    // 匿名認証を初期化して MY_PLAYER_ID を確立する。
    // エラー時も起動を止めない（フォールバック ID で動作継続）。
    initPlayer()
      .catch(() => {})
      .finally(() => setPlayerReady(true));
  }, []);

  // initPlayer() が完了するまでレンダリングを保留
  // （ネットワーク呼び出しが MY_PLAYER_ID を使う前に初期化を完了させる）
  if (!playerReady) return null;

  return (
    <I18nProvider>
      <StatusBar style="light" />
      <GameScreen />
    </I18nProvider>
  );
}
