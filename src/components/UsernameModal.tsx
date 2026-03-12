/**
 * JIBA — UsernameModal コンポーネント
 * ユーザーネーム設定・変更用モーダル。
 * - 1〜12文字バリデーション
 * - onCancel が undefined の場合（初回設定）はキャンセル不可
 * - visible が true になるたびに入力欄をリセット
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Colors, FontSize, Spacing, Radius } from '../constants/theme';
import { useI18n } from '../i18n';

// ──────────────────────────────────────────────────────────────
// 型定義
// ──────────────────────────────────────────────────────────────

interface UsernameModalProps {
  visible: boolean;
  /** 編集時は現在の username を渡す。初回設定時は null/undefined */
  initialValue?: string | null;
  /** Supabase 同期中フラグ */
  isSaving?: boolean;
  onSave: (name: string) => void;
  /** undefined = キャンセル不可（初回設定） */
  onCancel?: () => void;
}

const MAX_LENGTH = 12;

// ──────────────────────────────────────────────────────────────
// コンポーネント
// ──────────────────────────────────────────────────────────────

export const UsernameModal = React.memo<UsernameModalProps>(({
  visible, initialValue, isSaving, onSave, onCancel,
}) => {
  const { t } = useI18n();
  const [value, setValue] = useState(initialValue ?? '');
  const [error, setError] = useState<string | null>(null);

  // visible が true になるたびに入力欄をリセット
  // initialValue は visible=true になる前（呼び出し側のステート更新）で確定するため
  // visible の変化だけを監視すれば十分。initialValue を依存配列に含めると
  // visible=true のまま initialValue が変わった場合に入力中の値が上書きされる。
  useEffect(() => {
    if (visible) {
      setValue(initialValue ?? '');
      setError(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const handleChange = useCallback((text: string) => {
    setValue(text);
    if (error) setError(null);
  }, [error]);

  const handleSave = useCallback(() => {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError(t('username_error_empty'));
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(t('username_error_long'));
      return;
    }
    setError(null);
    onSave(trimmed);
  }, [value, t, onSave]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel ?? (() => {})}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>{t('username_title')}</Text>

          <TextInput
            style={[styles.input, error ? styles.inputError : null]}
            value={value}
            onChangeText={handleChange}
            placeholder={t('username_placeholder')}
            placeholderTextColor={Colors.textMuted}
            maxLength={MAX_LENGTH}  // OS レベルで MAX_LENGTH に制限
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleSave}
          />

          {error && <Text style={styles.errorText}>{error}</Text>}

          <View style={styles.buttonRow}>
            {onCancel != null && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={onCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={isSaving}
              activeOpacity={0.8}
            >
              <Text style={styles.saveBtnText}>
                {isSaving ? '...' : t('username_save')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

UsernameModal.displayName = 'UsernameModal';

// ──────────────────────────────────────────────────────────────
// スタイル
// ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing.xl,
    width: '82%',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: '700',
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  input: {
    backgroundColor: Colors.bg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  inputError: {
    borderColor: Colors.error,
  },
  errorText: {
    fontSize: FontSize.sm,
    color: Colors.error,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  cancelBtnText: {
    color: Colors.textSecondary,
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  saveBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.blue,
    alignItems: 'center',
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
});
