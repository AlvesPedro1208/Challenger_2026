import { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  View,
  type DimensionValue,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Card } from '@/components/ui';
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

  // Placeholder blocks sit inside surface cards: the bone tone only reads as
  // "loading" over a card, not straight over the screen background.
  return (
    <Animated.View style={{ opacity: pulse }}>
      <Card>
        <Block height={26} width="60%" />
        <Block height={14} width="80%" style={styles.gapSm} />
        <View style={styles.hero}>
          <Block height={12} width={110} />
          <Block height={88} width={150} style={styles.gapSm} />
          <Block height={26} width={140} style={styles.gapSm} />
        </View>
      </Card>
      <View style={styles.row}>
        <Card style={styles.half}>
          <Block height={12} width="70%" />
          <Block height={34} width="55%" style={styles.gapSm} />
        </Card>
        <Card style={styles.half}>
          <Block height={12} width="70%" />
          <Block height={34} width="55%" style={styles.gapSm} />
        </Card>
      </View>
      <Card style={styles.gapSm}>
        <Block height={12} width="50%" />
        <Block height={24} width="40%" style={styles.gapSm} />
      </Card>
      <Card style={styles.gapMd}>
        <Block height={12} width="60%" />
        <Block height={150} style={styles.gapMd} />
      </Card>
      <Card style={styles.gapMd}>
        <Block height={12} width="60%" />
        <Block height={130} style={styles.gapMd} />
      </Card>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.bone.onDark,
    borderRadius: radii.md,
  },
  hero: {
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
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
