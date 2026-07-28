import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';

type Mode = 'sign-in' | 'sign-up';

export function AuthForm() {
  const theme = useTheme();
  const { configured, signInWithEmail, signUpWithEmail, signInWithGoogle } = useAuth();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (!configured) {
    return (
      <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
        <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
        <ThemedText themeColor="textSecondary" style={styles.noticeText}>
          Friends and messaging aren't set up yet — this needs a Supabase project connected
          (see README).
        </ThemedText>
      </ThemedView>
    );
  }

  const submit = async () => {
    setError(null);
    setNotice(null);
    if (!email.trim() || !password) {
      setError('Enter an email and password.');
      return;
    }
    setBusy(true);
    const result =
      mode === 'sign-in' ? await signInWithEmail(email.trim(), password) : await signUpWithEmail(email.trim(), password);
    setBusy(false);
    if (result) {
      setError(result);
    } else if (mode === 'sign-up') {
      setNotice('Check your email to confirm your account, then sign in.');
      setMode('sign-in');
    }
  };

  const handleGoogle = async () => {
    setError(null);
    setNotice(null);
    setBusy(true);
    const result = await signInWithGoogle();
    setBusy(false);
    if (result) setError(result);
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="subtitle" style={styles.title}>
        {mode === 'sign-in' ? 'Sign in' : 'Create an account'}
      </ThemedText>
      <ThemedText themeColor="textSecondary">
        Sign in to add friends and share trips, articles, and stories with them.
      </ThemedText>

      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        placeholderTextColor={theme.textSecondary}
        autoCapitalize="none"
        keyboardType="email-address"
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        placeholderTextColor={theme.textSecondary}
        secureTextEntry
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
      />

      {error && (
        <ThemedView type="backgroundElement" style={[styles.notice, { borderColor: theme.border }]}>
          <ThemedText themeColor="textSecondary">{error}</ThemedText>
        </ThemedView>
      )}
      {notice && (
        <ThemedView type="backgroundSelected" style={[styles.notice, { borderColor: theme.accent }]}>
          <ThemedText themeColor="textSecondary">{notice}</ThemedText>
        </ThemedView>
      )}

      <Pressable
        onPress={submit}
        disabled={busy}
        style={[styles.primaryButton, { backgroundColor: theme.accent, opacity: busy ? 0.6 : 1 }]}>
        {busy ? (
          <ActivityIndicator color={theme.accentContrast} />
        ) : (
          <ThemedText type="smallBold" themeColor="accentContrast">
            {mode === 'sign-in' ? 'Sign in' : 'Sign up'}
          </ThemedText>
        )}
      </Pressable>

      <Pressable
        onPress={handleGoogle}
        disabled={busy}
        style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border, opacity: busy ? 0.6 : 1 }]}>
        <Ionicons name="logo-google" size={16} color={theme.text} />
        <ThemedText type="smallBold">Continue with Google</ThemedText>
      </Pressable>

      <Pressable onPress={() => setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in')} style={styles.toggleLink}>
        <ThemedText type="linkPrimary">
          {mode === 'sign-in' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
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
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
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
  primaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Spacing.five,
    paddingVertical: Spacing.three,
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.three,
  },
  toggleLink: {
    alignSelf: 'center',
  },
});
