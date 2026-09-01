import { useCallback, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '@/theme/tokens';

type ServerUrlFieldProps = {
  value: string;
  onChangeText: (next: string) => void;
  /** Fired by the keyboard's "done" key, so pasting and saving is one gesture. */
  onSubmit: () => void;
};

/** The URL field, with the affordances the tunnel rehearsal showed were missing. */
export function ServerUrlField({ value, onChangeText, onSubmit }: ServerUrlFieldProps) {
  const inputRef = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  const handleClear = useCallback((): void => {
    onChangeText('');
    inputRef.current?.focus();
  }, [onChangeText]);

  return (
    <View style={styles.row}>
      <TextInput
        ref={inputRef}
        accessibilityLabel="URL do servidor"
        style={[styles.input, focused && styles.inputFocused]}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="https://algo.trycloudflare.com"
        placeholderTextColor={colors.text.secondary}
        autoCapitalize="none"
        autoCorrect={false}
        spellCheck={false}
        keyboardType="url"
        // Swapping tunnels is the common case: focusing selects the old URL so
        // pasting replaces it, instead of forcing a trip through "Limpar e
        // voltar ao padrão".
        selectTextOnFocus
        returnKeyType="done"
        onSubmitEditing={onSubmit}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Apagar o texto do campo"
          style={styles.clear}
          onPress={handleClear}
        >
          <Text style={styles.clearGlyph}>×</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text.primary,
    backgroundColor: colors.bg.primary,
    borderRadius: radii.md,
    // A hairline over bg.primary inside a bg.surface card did not read as an
    // editable field once the phone was mirrored to a projector. The border
    // keeps a constant width so focus changes colour without reflowing text.
    borderWidth: 1.5,
    borderColor: colors.text.secondary,
    paddingLeft: spacing.sm + 4,
    // Room for the clear button that sits over the right edge.
    paddingRight: spacing.xl + spacing.md,
    paddingVertical: spacing.sm + 4,
    minHeight: 48,
  },
  inputFocused: {
    borderColor: colors.accent.primary,
  },
  clear: {
    position: 'absolute',
    right: 0,
    width: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearGlyph: {
    ...typography.subtitle,
    color: colors.text.secondary,
  },
});
