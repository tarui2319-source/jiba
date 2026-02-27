/**
 * JIBA — エントリーポイント
 */

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
