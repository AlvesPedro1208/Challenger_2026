import { StyleSheet, View } from 'react-native';

import { PrimaryButton } from '@/components/ui';
import { spacing } from '@/theme/tokens';

type MapActionBarProps = {
  onOpenStats: () => void;
  onOpenTicket: () => void;
};

/**
 * The two next actions available while the trip is on the map: the on-time
 * record of the leg, and the ticket the passenger may need again on board.
 */
export function MapActionBar({ onOpenStats, onOpenTicket }: MapActionBarProps) {
  return (
    <View style={styles.row}>
      <View style={styles.slot}>
        <PrimaryButton label="Pontualidade" onPress={onOpenStats} />
      </View>
      <View style={styles.slot}>
        <PrimaryButton label="Ver bilhete" variant="purple" onPress={onOpenTicket} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  slot: {
    flex: 1,
  },
});
