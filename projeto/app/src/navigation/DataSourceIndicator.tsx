import { StyleSheet, Text, View } from 'react-native';
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

type DataSourceIndicatorProps = {
  booting?: boolean;
};

/**
 * Discreet badge telling the audience where the live data is coming from.
 *
 * It sits in the top strip, above the first line of content on every screen:
 * the bottom of the screens belongs to the primary action (the ticket button,
 * the map status cards) and the badge used to cover it.
 */
export function DataSourceIndicator({ booting = false }: DataSourceIndicatorProps) {
  const connection = useJourneyStore(selectConnection);
  const insets = useSafeAreaInsets();
  const source = booting ? LOADING : SOURCES[connection];

  return (
    <View pointerEvents="none" style={[styles.wrapper, { top: insets.top, right: spacing.md }]}>
      <View style={styles.badge}>
        <View style={[styles.dot, { backgroundColor: source.color }]} />
        <Text style={[styles.label, { color: source.color }]}>{source.label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    opacity: 0.55,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    backgroundColor: colors.bg.surface,
    borderRadius: radii.pill,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
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
