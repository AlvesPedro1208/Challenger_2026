import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { radii, spacing } from '@/theme/tokens';

const BONE = '#EEEBF2';

export function TicketSkeleton() {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View style={[styles.card, { opacity: pulse }]}>
      <View style={styles.qr} />
      <View style={styles.lineWide} />
      <View style={styles.lineNarrow} />
      <View style={styles.row}>
        <View style={styles.block} />
        <View style={styles.block} />
        <View style={styles.block} />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
  },
  qr: {
    width: 188,
    height: 188,
    borderRadius: radii.md,
    backgroundColor: BONE,
  },
  lineWide: {
    width: '70%',
    height: 20,
    borderRadius: radii.sm,
    backgroundColor: BONE,
    marginTop: spacing.lg,
  },
  lineNarrow: {
    width: '45%',
    height: 14,
    borderRadius: radii.sm,
    backgroundColor: BONE,
    marginTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  block: {
    flex: 1,
    height: 40,
    borderRadius: radii.sm,
    backgroundColor: BONE,
  },
});
