import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, spacing, typography } from '@/theme/tokens';

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
    <ScrollView style={styles.root} contentContainerStyle={padding}>
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg.primary,
  },
  title: {
    ...typography.display,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
});
