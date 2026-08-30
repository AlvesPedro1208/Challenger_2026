import { StyleSheet, Text, View } from 'react-native';
import { Callout, Marker } from 'react-native-maps';

import { colors, spacing, typography } from '@/theme/tokens';
import type { Stop } from '@jornada/shared';

type StopMarkersProps = {
  stops: Stop[];
};

export function StopMarkers({ stops }: StopMarkersProps) {
  return (
    <>
      {stops.map((stop) => (
        <Marker
          key={stop.id}
          coordinate={{ latitude: stop.lat, longitude: stop.lng }}
          anchor={{ x: 0.5, y: 0.5 }}
          zIndex={5}
        >
          <View style={styles.dotOuter}>
            <View style={styles.dotInner} />
          </View>
          <Callout>
            <View style={styles.callout}>
              <Text style={styles.calloutTitle}>{stop.name}</Text>
              <Text style={styles.calloutMeta}>
                Parada prevista de {stop.scheduledDwellMin} min
              </Text>
            </View>
          </Callout>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  dotOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.bg.surface,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent.primary,
  },
  callout: {
    minWidth: 180,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  calloutTitle: {
    ...typography.subtitle,
    fontSize: 15,
    color: '#1A1A1A',
  },
  calloutMeta: {
    ...typography.caption,
    color: '#5C5566',
    marginTop: 2,
  },
});
