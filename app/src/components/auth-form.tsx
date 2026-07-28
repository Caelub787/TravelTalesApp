import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export function AuthForm() {
  const theme = useTheme();
  const { configured, signInWithGoogle } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!configured) {
    return (
      <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.noticeText}>
          Friends and messaging aren't set up yet — this needs a Firebase project connected
          (see README).
        </ThemedText>
      </ThemedView>
    );
  }

  const handleGoogle = async () => {
    setError(null);
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (result) setError(result);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        Sign in
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Sign in to add friends and share trips, articles, and stories with them.
      </ThemedText>

      {error && (
        <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        </ThemedView>
      )}

      <Pressable
        onPress={handleGoogle}
        disabled={busy}
        style={[styles.googleButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: busy ? 0.6 : 1 }]}>
        {busy ? (
          <ActivityIndicator color={theme.text} />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color={theme.text} />
            <ThemedText type="smallBold">Continue with Google</ThemedText>
          </>
        )}
      </Pressable>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  title: {
    fontSize: 22,
    lineHeight: 28,
  },
  notice: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: 1,
  },
  noticeText: {
    flex: 1,
    lineHeight: 20,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.three,
  },
});
