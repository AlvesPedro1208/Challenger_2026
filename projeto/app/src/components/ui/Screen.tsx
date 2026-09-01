import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme/tokens';

/** colors.bg.primary (#17121F) as channels, so the scrim can fade it out. */
const SCRIM_RGB = '23, 18, 31';

/**
 * The fade covers the data-source badge that floats in the same top strip
 * (~24pt tall: an 8pt row between spacing.xs paddings, plus its hairline).
 * A shorter fade left the badge's bottom edge sitting on fully opaque text,
 * which read as a section title chopped in half while it scrolled past.
 *
 * The first line of content starts one spacing.md below the safe area, so at
 * rest only the leading above it falls inside the tail of the fade.
 */
const SCRIM_FADE_HEIGHT = spacing.lg;
/** 2pt bands: the taller fade needs more steps to stay free of banding. */
const SCRIM_BANDS = 12;

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
    // The tab bar is laid out below the screen, not floating over it, so it
    // hides nothing by itself — but it does own the bottom safe area now. The
    // inset stays in this padding on purpose: it is what keeps the last row of
    // content clear of the bar instead of ending flush against its edge.
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
      {/* With the default ('never'), the first tap while a keyboard is open is
          swallowed to dismiss it, and the button under the finger does nothing
          — which reads as a frozen app. 'handled' dismisses the keyboard and
          delivers the tap in one go. */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={padding}
        keyboardShouldPersistTaps="handled"
      >
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
