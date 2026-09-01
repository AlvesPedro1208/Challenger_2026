import { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { StatusPill } from '@/components/ui';
import { colors, spacing, typography, type AccentColor } from '@/theme/tokens';

export type FeedbackTone = Extract<AccentColor, 'primary' | 'purple' | 'success'>;

export interface Feedback {
  tone: FeedbackTone;
  /** Short status word. Success and failure differ by this text, not only by hue. */
  label: string;
  /** The diagnosis itself: timeout with seconds, HTTP status, real error. */
  text: string;
}

export const INVALID_URL: Feedback = {
  tone: 'primary',
  label: 'URL inválida',
  text: 'Cole o endereço completo, começando com https:// ou http://.',
};

const IDLE: Feedback = {
  tone: 'purple',
  label: 'Sem teste ainda',
  text: 'Toque em "Testar conexão" para conferir o endereço antes de apresentar.',
};

/**
 * Height reserved for the block, sized for its tallest state (pill plus three
 * lines of body text). The block always renders, so the buttons and the
 * destructive "limpar" row below it never slide when a result arrives — in the
 * tunnel rehearsal that slide cost a mis-tap on a destructive control.
 */
const MIN_HEIGHT = 100;

type ServerStatusProps = {
  feedback: Feedback | null;
};

/** The only informative output of the screen, so it is read, not decoded. */
export function ServerStatus({ feedback }: ServerStatusProps) {
  // accessibilityLiveRegion covers Android; iOS VoiceOver needs the explicit
  // announcement, and the iPhone is the device this screen is operated on.
  useEffect(() => {
    if (!feedback) return;
    AccessibilityInfo.announceForAccessibility(`${feedback.label}. ${feedback.text}`);
  }, [feedback]);

  const status = feedback ?? IDLE;

  return (
    <View accessibilityLiveRegion="polite" style={styles.area}>
      <StatusPill label={status.label} tone={status.tone} />
      <Text style={styles.text}>{status.text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  area: {
    minHeight: MIN_HEIGHT,
    marginTop: spacing.md,
  },
  text: {
    ...typography.body,
    color: colors.text.primary,
    marginTop: spacing.sm,
    lineHeight: 21,
  },
});
