import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { selectConnection, useJourneyStore, type ConnectionMode } from '@/state/store';
import { colors, radii, spacing } from '@/theme/tokens';

type SourceStyle = { label: string; color: string };

const SOURCES: Record<ConnectionMode, SourceStyle> = {
  panel: { label: 'Painel ao vivo', color: colors.accent.success },
  autoplay: { label: 'Modo demonstração', color: colors.accent.purple },
  offline: { label: 'Offline', color: colors.text.secondary },
};

const LOADING: SourceStyle = { label: 'Carregando', color: colors.text.secondary };

/** Long press, so a stray tap during the presentation never opens it. */
const SETTINGS_LONG_PRESS_MS = 800;

/** The screen behind the badge. */
const SETTINGS_ROUTE = '/server-settings';

/** The badge row is ~20pt tall; the slop brings its target to the 44pt minimum. */
const TOUCH_SLOP = 12;

type DataSourceIndicatorProps = {
  booting?: boolean;
};

/**
 * Discreet badge telling the audience where the live data is coming from.
 *
 * It sits in the top strip, above the first line of content on every screen:
 * the bottom of the screens belongs to the primary action (the ticket button,
 * the map status cards) and the badge used to cover it.
 *
 * It doubles as the only way into the server settings: a long press on the
 * badge opens them. The badge already answers "de onde vêm os dados?", so the
 * screen that changes that answer belongs behind it — and a gesture with no
 * visible affordance keeps the demo interface clean. Only the badge itself
 * takes touches; the rest of the strip stays transparent to the screen below.
 */
export function DataSourceIndicator({ booting = false }: DataSourceIndicatorProps) {
  const connection = useJourneyStore(selectConnection);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const source = booting ? LOADING : SOURCES[connection];

  // The badge floats above every screen, the settings screen included, so a
  // long press there used to stack a second copy of it — each one needing its
  // own way back. Opening it only from somewhere else keeps the gesture
  // idempotent.
  const openSettings = (): void => {
    if (pathname === SETTINGS_ROUTE) return;
    router.push(SETTINGS_ROUTE);
  };

  return (
    <View pointerEvents="box-none" style={[styles.wrapper, { top: insets.top, right: spacing.md }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Fonte dos dados: ${source.label}. Toque longo para configurar o servidor.`}
        delayLongPress={SETTINGS_LONG_PRESS_MS}
        hitSlop={TOUCH_SLOP}
        onLongPress={openSettings}
        style={({ pressed }) => [styles.badge, pressed && styles.pressed]}
      >
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: source.color }]} />
          <Text style={[styles.label, { color: source.color }]}>{source.label}</Text>
        </View>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
  },
  // Opaque on purpose: the badge floats over scrolling content, and a
  // translucent pill let text stay readable underneath it. Discretion comes
  // from the muted row inside, not from fading the whole badge out.
  badge: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.hairline.onDark,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    opacity: 0.85,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    opacity: 0.62,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
