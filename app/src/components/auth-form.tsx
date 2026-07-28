import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

export function AuthForm() {
  const theme = useTheme();
  const { configured, signIn, signUp } = useAuth();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleSubmit = async () => {
    setError(null);
    setBusy(true);
    const result = mode === 'signIn' ? await signIn(email, password) : await signUp(email, password);
    setBusy(false);
    if (result) setError(result);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        {mode === 'signIn' ? 'Sign in' : 'Create account'}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Sign in to add friends and share trips, articles, and stories with them.
      </ThemedText>

      {error && (
        <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        </ThemedView>
      )}

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        secureTextEntry
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />

      <Pressable
        onPress={handleSubmit}
        disabled={busy || !email.trim() || !password}
        style={[
          styles.submitButton,
          { backgroundColor: theme.accent, opacity: busy || !email.trim() || !password ? 0.6 : 1 },
        ]}>
        {busy ? (
          <ActivityIndicator color={theme.accentContrast} />
        ) : (
          <ThemedText type="smallBold" themeColor="accentContrast">
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </ThemedText>
        )}
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} style={styles.switchModeButton}>
        <ThemedText type="small" themeColor="textSecondary">
          {mode === 'signIn' ? "Don't have an account? Create one" : 'Already have an account? Sign in'}
        </ThemedText>
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
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  submitButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
  },
  switchModeButton: {
    alignItems: 'center',
    paddingVertical: Spacing.one,
  },
});
