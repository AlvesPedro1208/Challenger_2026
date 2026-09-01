import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

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
import { colors, spacing, typography } from '@/theme/tokens';

import { CurrentBaseCard } from './CurrentBaseCard';
import { INVALID_URL, ServerStatus, type Feedback } from './ServerStatus';
import { ServerUrlField } from './ServerUrlField';

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
  // "Limpar e voltar ao padrão" throws away a URL that was just pasted, so it
  // takes two taps: the first one arms it, any other action disarms it.
  const [clearArmed, setClearArmed] = useState(false);

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

  const handleChangeText = useCallback((next: string): void => {
    setInput(next);
    setClearArmed(false);
  }, []);

  const handleSave = useCallback(async (): Promise<void> => {
    setClearArmed(false);
    const saved = await saveServerOverride(input);
    if (!saved) {
      setFeedback(INVALID_URL);
      return;
    }
    setBase(currentServerBase());
    setFeedback({ tone: 'success', label: 'URL salva', text: RESTART_HINT });
  }, [input]);

  const handleClearPress = useCallback(async (): Promise<void> => {
    if (!clearArmed) {
      setClearArmed(true);
      return;
    }
    setClearArmed(false);
    await clearServerOverride();
    setInput('');
    setBase(currentServerBase());
    setFeedback({
      tone: 'purple',
      label: 'URL removida',
      text: `Cole a URL do túnel de novo para voltar a usá-la. ${RESTART_HINT}`,
    });
  }, [clearArmed]);

  const handleTest = useCallback(async (): Promise<void> => {
    // Tests what is typed, so a URL can be checked before being saved; with an
    // empty field it tests whatever the app is using right now.
    setClearArmed(false);
    const typed = input.trim();
    const target = typed ? deriveServerBase(typed) : currentServerBase();
    if (!target) {
      setFeedback(INVALID_URL);
      return;
    }
    setTesting(true);
    setFeedback({
      tone: 'purple',
      label: 'Testando',
      text: `Chamando ${target.httpBaseUrl}/api/health...`,
    });
    const result = await checkServerHealth(target.httpBaseUrl);
    setTesting(false);
    setFeedback(
      result.ok
        ? { tone: 'success', label: 'Conectado', text: result.message }
        : { tone: 'primary', label: 'Sem conexão', text: result.message },
    );
  }, [input]);

  const clearLabel = clearArmed ? 'Tocar de novo para confirmar' : 'Limpar e voltar ao padrão';

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
          <ServerUrlField
            value={input}
            onChangeText={handleChangeText}
            onSubmit={() => void handleSave()}
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

      <ServerStatus feedback={feedback} />

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={clearLabel}
        accessibilityHint="Apaga a URL salva e volta ao endereço padrão do app"
        style={styles.clearRow}
        onPress={() => void handleClearPress()}
      >
        <Text style={[styles.clearLabel, clearArmed && styles.clearLabelArmed]}>{clearLabel}</Text>
      </Pressable>

      <View style={styles.section}>
        <PrimaryButton
          label="Voltar para a viagem"
          variant="purple"
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
  hint: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.sm,
    lineHeight: 18,
  },
  clearRow: {
    alignSelf: 'center',
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  clearLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    textDecorationLine: 'underline',
  },
  clearLabelArmed: {
    color: colors.onTone.warning,
  },
});
