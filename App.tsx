/**
 * JIBA — エントリーポイント
 */

// uuid が crypto.getRandomValues を使うため、最初にポリフィルを読み込む（React Native 必須）
import 'react-native-get-random-values';
import { StatusBar } from 'expo-status-bar';
import { I18nProvider } from './src/i18n';
import { GameScreen } from './src/screens/GameScreen';

export default function App() {
  return (
    <I18nProvider>
      <StatusBar style="light" />
      <GameScreen />
    </I18nProvider>
  );
}
