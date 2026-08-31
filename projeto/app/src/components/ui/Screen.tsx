import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme/tokens';

/** colors.bg.primary (#17121F) as channels, so the scrim can fade it out. */
const SCRIM_RGB = '23, 18, 31';

/**
 * The fade is exactly as tall as the padding between the safe area and the
 * first line of content, so at rest nothing sits under it and only scrolled
 * content dissolves into the status bar strip.
 */
const SCRIM_FADE_HEIGHT = spacing.md;
const SCRIM_BANDS = 8;

/** Stepped gradient: RN has no native gradient and the app has no gradient dep. */
const SCRIM_STOPS = Array.from({ length: SCRIM_BANDS }, (_, index) => ({
  height: SCRIM_FADE_HEIGHT / SCRIM_BANDS,
  backgroundColor: `rgba(${SCRIM_RGB}, ${1 - index / SCRIM_BANDS})`,
}));

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  /** Screen heading. Renders with the shared display typography so titles stay
   *  consistent across screens instead of each one redeclaring its own style. */
  title?: string;
};

export function Screen({ children, scroll = true, title }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const padding = {
    paddingTop: insets.top + spacing.md,
    paddingBottom: insets.bottom + spacing.lg,
    paddingHorizontal: spacing.md,
  };

  const content = (
    <>
      {title ? (
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
      ) : null}
      {children}
    </>
  );

  if (!scroll) {
    return <View style={[styles.root, padding]}>{content}</View>;
  }

  return (
    <View style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={padding}>
        {content}
      </ScrollView>
      <View pointerEvents="none" style={styles.scrim}>
        <View style={[styles.scrimSolid, { height: insets.top }]} />
        {SCRIM_STOPS.map((stop) => (
          <View key={stop.backgroundColor} style={stop} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  scroll: {
    flex: 1,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  scrimSolid: {
    backgroundColor: colors.bg.primary,
  },
});
