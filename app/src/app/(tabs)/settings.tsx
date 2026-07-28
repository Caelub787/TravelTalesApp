import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAlwaysOnMode } from '@/hooks/use-always-on-mode';
import { READ_FREQUENCY_OPTIONS_MINUTES, useAlwaysOnFrequency } from '@/hooks/use-always-on-frequency';
import { useContentMode, type ContentMode } from '@/hooks/use-content-mode';
import { useReadPreference, type ReadPreference } from '@/hooks/use-read-preference';
import { useTheme } from '@/hooks/use-theme';

interface ModeOption {
  id: ContentMode;
  label: string;
  icon: 'sparkles' | 'book';
  description: string;
}

const OPTIONS: ModeOption[] = [
  {
    id: 'story',
    label: 'Story Mode',
    icon: 'sparkles',
    description:
      "AI-written narratives that research each spot fresh — historical and modern — grounded in nearby Wikipedia articles and open-web search, with cited sources. Powered by Groq's free tier, subject to its rate limits.",
  },
  {
    id: 'wiki',
    label: 'Wiki Facts',
    icon: 'book',
    description:
      "Browse nearby Wikipedia articles directly — always free, no rate limits. Asking a question here still uses Groq's free tier to write a real answer from those articles, so it needs the same key as Story Mode to feel conversational.",
  },
];

interface ReadOption {
  id: ReadPreference;
  label: string;
  icon: 'document-text-outline' | 'volume-high-outline';
  description: string;
}

const READ_OPTIONS: ReadOption[] = [
  {
    id: 'text',
    label: 'Show text',
    icon: 'document-text-outline',
    description: 'Answers and articles appear as text — tap Read aloud whenever you want to hear them.',
  },
  {
    id: 'voice',
    label: 'Read aloud automatically',
    icon: 'volume-high-outline',
    description:
      'Answers and articles play out loud as soon as they load. Voice questions always get a spoken answer either way.',
  },
];

export default function SettingsScreen() {
  const { mode, setMode } = useContentMode();
  const { preference, setPreference } = useReadPreference();
  const { enabled: alwaysOnEnabled, loading: alwaysOnLoading, error: alwaysOnError, setEnabled: setAlwaysOnEnabled } = useAlwaysOnMode();
  const { frequencyMinutes, setFrequencyMinutes } = useAlwaysOnFrequency();
  const theme = useTheme();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedText type="title" style={styles.title}>
            Settings
          </ThemedText>

          <ThemedText type="smallBold">Content source</ThemedText>

          {OPTIONS.map((option) => {
            const selected = option.id === mode;
            return (
              <Pressable key={option.id} onPress={() => setMode(option.id)}>
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.card, { borderColor: selected ? theme.accent : theme.border }]}>
                  <ThemedView style={styles.cardHeader}>
                    <Ionicons name={option.icon} size={18} color={selected ? theme.accent : theme.text} />
                    <ThemedText type="smallBold" style={styles.cardLabel}>
                      {option.label}
                    </ThemedText>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? theme.accent : theme.textSecondary}
                    />
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                    {option.description}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}

          <ThemedText type="smallBold" style={styles.sectionSpacing}>
            Reading style
          </ThemedText>

          {READ_OPTIONS.map((option) => {
            const selected = option.id === preference;
            return (
              <Pressable key={option.id} onPress={() => setPreference(option.id)}>
                <ThemedView
                  type={selected ? 'backgroundSelected' : 'backgroundElement'}
                  style={[styles.card, { borderColor: selected ? theme.accent : theme.border }]}>
                  <ThemedView style={styles.cardHeader}>
                    <Ionicons name={option.icon} size={18} color={selected ? theme.accent : theme.text} />
                    <ThemedText type="smallBold" style={styles.cardLabel}>
                      {option.label}
                    </ThemedText>
                    <Ionicons
                      name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                      size={20}
                      color={selected ? theme.accent : theme.textSecondary}
                    />
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                    {option.description}
                  </ThemedText>
                </ThemedView>
              </Pressable>
            );
          })}

          <ThemedText type="smallBold" style={styles.sectionSpacing}>
            Always On mode
          </ThemedText>
          <ThemedView type="backgroundElement" style={[styles.card, { borderColor: theme.border }]}>
            <ThemedView style={styles.cardHeader}>
              <Ionicons name="radio-outline" size={18} color={alwaysOnEnabled ? theme.accent : theme.text} />
              <ThemedText type="smallBold" style={styles.cardLabel}>
                Notify me near attractions
              </ThemedText>
              <Switch
                value={alwaysOnEnabled}
                disabled={alwaysOnLoading}
                onValueChange={setAlwaysOnEnabled}
                trackColor={{ false: theme.border, true: theme.accent }}
                thumbColor={theme.backgroundElement}
              />
            </ThemedView>
            <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
              While driving or exploring, get a notification whenever you pass a popular
              attraction, lookout, or historical site — even with the app closed. If "Read
              aloud automatically" is on above, it'll play a soft chime and read the story out
              loud too. This keeps a location check running in the background (shown as an
              ongoing notification) and uses more battery than normal.
            </ThemedText>
            {alwaysOnError && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
                {alwaysOnError}
              </ThemedText>
            )}

            <ThemedView style={[styles.frequencyRow, { borderTopColor: theme.border }]}>
              <ThemedText type="small" themeColor="textSecondary">
                Minimum time between readings
              </ThemedText>
              <ThemedView style={styles.frequencyChips}>
                {READ_FREQUENCY_OPTIONS_MINUTES.map((minutes) => {
                  const selected = minutes === frequencyMinutes;
                  return (
                    <Pressable
                      key={minutes}
                      onPress={() => setFrequencyMinutes(minutes)}
                      style={[
                        styles.frequencyChip,
                        { backgroundColor: selected ? theme.accent : theme.backgroundSelected, borderColor: selected ? theme.accent : theme.border },
                      ]}>
                      <ThemedText type="smallBold" themeColor={selected ? 'accentContrast' : 'text'}>
                        {minutes}m
                      </ThemedText>
                    </Pressable>
                  );
                })}
              </ThemedView>
            </ThemedView>
          </ThemedView>

          <ThemedText type="smallBold" style={styles.sectionSpacing}>
            Downloads
          </ThemedText>
          <Pressable onPress={() => router.push('/(tabs)/trip')}>
            <ThemedView type="backgroundElement" style={[styles.linkRow, { borderColor: theme.border }]}>
              <Ionicons name="navigate-outline" size={18} color={theme.text} />
              <ThemedText type="smallBold" style={styles.cardLabel}>
                Manage downloaded trips
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ThemedView>
          </Pressable>
          <Pressable onPress={() => router.push('/(tabs)/saved')}>
            <ThemedView type="backgroundElement" style={[styles.linkRow, { borderColor: theme.border }]}>
              <Ionicons name="cloud-download-outline" size={18} color={theme.text} />
              <ThemedText type="smallBold" style={styles.cardLabel}>
                Manage downloaded areas & articles
              </ThemedText>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </ThemedView>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  safeArea: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  sectionSpacing: {
    marginTop: Spacing.two,
  },
  card: {
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  cardLabel: {
    flex: 1,
  },
  description: {
    lineHeight: 20,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1.5,
    padding: Spacing.three,
  },
  frequencyRow: {
    marginTop: Spacing.one,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  frequencyChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  frequencyChip: {
    borderRadius: Spacing.five,
    borderWidth: 1.5,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
  },
});
