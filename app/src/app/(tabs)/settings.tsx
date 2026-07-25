import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useContentMode, type ContentMode } from '@/hooks/use-content-mode';
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
      "AI-written narratives and free-form question answering, grounded in live web search with cited sources. Powered by Gemini's free tier — subject to its rate limits.",
  },
  {
    id: 'wiki',
    label: 'Wiki Facts',
    icon: 'book',
    description:
      "Real facts pulled directly from nearby Wikipedia articles. No AI, no rate limits, always free — but less conversational, and \"ask a question\" just returns matching article snippets instead of a written answer.",
  },
];

export default function SettingsScreen() {
  const { mode, setMode } = useContentMode();
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
});
