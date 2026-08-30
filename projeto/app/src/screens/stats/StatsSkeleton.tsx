import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing } from '@/theme/tokens';

type BlockProps = {
  height: number;
  width?: DimensionValue;
  style?: StyleProp<ViewStyle>;
};

function Block({ height, width = '100%', style }: BlockProps) {
  return <View style={[styles.block, { height, width }, style]} />;
}

export function StatsSkeleton() {
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
    <Animated.View style={{ opacity: pulse }}>
      <Block height={22} width="55%" />
      <Block height={14} width="75%" style={styles.gapSm} />
      <View style={styles.hero}>
        <Block height={12} width={110} />
        <Block height={88} width={150} style={styles.gapSm} />
        <Block height={26} width={140} style={styles.gapSm} />
      </View>
      <View style={styles.row}>
        <Block height={104} style={styles.half} />
        <Block height={104} style={styles.half} />
      </View>
      <Block height={64} style={styles.gapSm} />
      <Block height={210} style={styles.gapMd} />
      <Block height={190} style={styles.gapMd} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.bg.surface,
    borderRadius: radii.md,
  },
  hero: {
    alignItems: 'center',
    marginVertical: spacing.lg,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  half: {
    flex: 1,
  },
  gapSm: {
    marginTop: spacing.sm,
  },
  gapMd: {
    marginTop: spacing.md,
  },
});
