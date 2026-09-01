import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Card, PrimaryButton, Screen } from '@/components/ui';
import { navigateToPhaseRoute } from '@/navigation/phaseRoutes';
// Same floating glyph every screen the demo can strand the passenger on uses.
import { MapBackButton } from '@/screens/map/MapBackButton';
import {
  checkServerHealth,
  clearServerOverride,
  currentServerBase,
  deriveServerBase,
  loadServerOverride,
  saveServerOverride,
  type ResolvedServerBase,
} from '@/services/serverConfig';
import { selectPhase, useJourneyStore } from '@/state/store';
import { colors, radii, spacing, typography } from '@/theme/tokens';

import { CurrentBaseCard } from './CurrentBaseCard';

type FeedbackTone = 'ok' | 'error' | 'info';

interface Feedback {
  tone: FeedbackTone;
  text: string;
}

const FEEDBACK_COLORS: Record<FeedbackTone, string> = {
  ok: colors.onTone.success,
  error: colors.onTone.primary,
  info: colors.text.secondary,
};

const INVALID_URL: Feedback = {
  tone: 'error',
  text: 'URL inválida. Cole o endereço completo, começando com https:// ou http://.',
};

const RESTART_HINT = 'Feche e abra o app para que a conexão passe a usar este endereço.';

/**
 * Operator screen: points the app at the demo server.
 *
 * A Cloudflare quick tunnel gets a new address on every run, so the URL cannot
 * live in the build. This screen answers one question — "para qual servidor o
 * app está falando?" — and leaves the operator with the obvious next action:
 * colar a URL do túnel, testar e voltar para a viagem.
 */
export function ServerSettingsScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const phase = useJourneyStore(selectPhase);

  const [input, setInput] = useState('');
  const [base, setBase] = useState<ResolvedServerBase>(() => currentServerBase());
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const saved = await loadServerOverride();
      if (cancelled) return;
      setInput(saved ?? '');
      setBase(currentServerBase());
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    const saved = await saveServerOverride(input);
    if (!saved) {
      setFeedback(INVALID_URL);
      return;
    }
    setBase(currentServerBase());
    setFeedback({ tone: 'ok', text: `URL salva. ${RESTART_HINT}` });
  }, [input]);

  const handleClear = useCallback(async (): Promise<void> => {
    await clearServerOverride();
    setInput('');
    setBase(currentServerBase());
    setFeedback({ tone: 'info', text: `URL removida. ${RESTART_HINT}` });
  }, []);

  const handleTest = useCallback(async (): Promise<void> => {
    // Tests what is typed, so a URL can be checked before being saved; with an
    // empty field it tests whatever the app is using right now.
    const typed = input.trim();
    const target = typed ? deriveServerBase(typed) : currentServerBase();
    if (!target) {
      setFeedback(INVALID_URL);
      return;
    }
    setTesting(true);
    setFeedback({ tone: 'info', text: `Testando ${target.httpBaseUrl}/api/health...` });
    const result = await checkServerHealth(target.httpBaseUrl);
    setTesting(false);
    setFeedback({ tone: result.ok ? 'ok' : 'error', text: result.message });
  }, [input]);

  return (
    <Screen>
      <View style={styles.navRow}>
        <MapBackButton onPress={() => navigateToPhaseRoute(router, phase, pathname)} />
      </View>
      <Text accessibilityRole="header" style={styles.title}>
        Servidor da demo
      </Text>
      <Text style={styles.subtitle}>
        Cole aqui a URL do túnel para o app buscar dados e eventos fora da rede local.
      </Text>

      <View style={styles.section}>
        <CurrentBaseCard base={base} />
      </View>

      <View style={styles.section}>
        <Card>
          <Text style={styles.fieldLabel}>URL do servidor</Text>
          <TextInput
            accessibilityLabel="URL do servidor"
            style={styles.input}
            value={input}
            onChangeText={setInput}
            placeholder="https://algo.trycloudflare.com"
            placeholderTextColor={colors.text.secondary}
            autoCapitalize="none"
            autoCorrect={false}
            spellCheck={false}
            keyboardType="url"
          />
          <Text style={styles.hint}>
            O endereço WebSocket é derivado automaticamente: https vira wss, http vira ws.
          </Text>
        </Card>
      </View>

      <View style={styles.section}>
        <PrimaryButton label="Salvar URL" onPress={() => void handleSave()} />
      </View>
      <View style={styles.sectionTight}>
        <PrimaryButton
          label={testing ? 'Testando...' : 'Testar conexão'}
          variant="purple"
          disabled={testing}
          onPress={() => void handleTest()}
        />
      </View>

      {feedback ? (
        <Text style={[styles.feedback, { color: FEEDBACK_COLORS[feedback.tone] }]}>
          {feedback.text}
        </Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Limpar e voltar ao padrão"
        style={styles.clearRow}
        onPress={() => void handleClear()}
      >
        <Text style={styles.clearLabel}>Limpar e voltar ao padrão</Text>
      </Pressable>

      <View style={styles.section}>
        <PrimaryButton
          label="Voltar para a viagem"
          variant="green"
          onPress={() => navigateToPhaseRoute(router, phase, pathname)}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
  },
  subtitle: {
    ...typography.body,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    lineHeight: 21,
  },
  section: {
    marginTop: spacing.md,
  },
  sectionTight: {
    marginTop: spacing.sm,
  },
  fieldLabel: {
    ...typography.sectionLabel,
    color: colors.text.secondary,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.primary,
    borderRadius: radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline.onDark,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm + 4,
    marginTop: spacing.sm,
    minHeight: 44,
  },
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  feedback: {
    ...typography.caption,
    marginTop: spacing.md,
    lineHeight: 18,
  },
  clearRow: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    marginTop: spacing.sm,
  },
  clearLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
});
