import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useArticleAsk } from '@/hooks/use-article-ask';
import { useArticleContent } from '@/hooks/use-article-content';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useReadPreference } from '@/hooks/use-read-preference';
import { useSpeakable } from '@/hooks/use-speakable';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceInput } from '@/hooks/use-voice-input';
import { deriveWikipediaTitle, isWikipediaUrl } from '@/utils/wikipedia-url';

interface WikipediaArticleViewProps {
  url: string;
  initialTitle?: string;
  onViewRaw: () => void;
}

function WikipediaArticleView({ url, initialTitle, onViewRaw }: WikipediaArticleViewProps) {
  const theme = useTheme();
  const { preference } = useReadPreference();
  const { speak } = useSpeakable();
  const { result, status, error, load } = useArticleContent();
  const hasAutoSpoken = useRef(false);
  const title = initialTitle ?? deriveWikipediaTitle(url);

  useEffect(() => {
    hasAutoSpoken.current = false;
    load(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    if (status === 'success' && result && preference === 'voice' && !hasAutoSpoken.current) {
      hasAutoSpoken.current = true;
      speak(`${result.title}. ${result.extract}`);
    }
  }, [status, result, preference, speak]);

  const [question, setQuestion] = useState('');
  const questionRef = useRef('');
  const { result: askResult, status: askStatus, error: askError, ask } = useArticleAsk();
  const lastAskWasVoiceRef = useRef(false);

  const submitQuestion = (text: string, viaVoice: boolean) => {
    const trimmed = text.trim();
    if (!trimmed || !result) return;
    lastAskWasVoiceRef.current = viaVoice;
    ask(result.title, result.extract, trimmed);
  };

  const { listening, error: voiceError, start, stop } = useVoiceInput(
    (transcript) => {
      questionRef.current = transcript;
      setQuestion(transcript);
    },
    () => {
      if (questionRef.current.trim()) {
        submitQuestion(questionRef.current, true);
        setQuestion('');
        questionRef.current = '';
      }
    }
  );

  useEffect(() => {
    if (askStatus === 'success' && askResult && (lastAskWasVoiceRef.current || preference === 'voice')) {
      speak(askResult.answer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [askResult]);

  const handleSubmitTyped = () => {
    submitQuestion(question, false);
    setQuestion('');
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {status === 'loading' && (
        <ThemedView style={styles.centerNotice}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">Loading article…</ThemedText>
        </ThemedView>
      )}

      {status === 'error' && (
        <ThemedView style={styles.centerNotice}>
          <ThemedText themeColor="textSecondary">Couldn't load this article: {error}</ThemedText>
          <Pressable onPress={onViewRaw}>
            <ThemedText type="linkPrimary">View original page instead</ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {status === 'success' && result && (
        <>
          <ThemedText type="subtitle" style={styles.articleTitle}>
            {result.title}
          </ThemedText>

          <ThemedView style={styles.actionRow}>
            <SpeakButton text={`${result.title}. ${result.extract}`} />
          </ThemedView>

          <ThemedView style={styles.bodyText}>
            {result.extract.split('\n\n').map((paragraph, index) => (
              <ThemedText key={index}>{paragraph}</ThemedText>
            ))}
          </ThemedView>

          <ThemedView style={[styles.askSection, { borderTopColor: theme.border }]}>
            <ThemedText type="smallBold">Ask about this article</ThemedText>
            <ThemedView
              style={[styles.askPill, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="sparkles-outline" size={16} color={theme.textSecondary} />
              <TextInput
                value={question}
                onChangeText={setQuestion}
                placeholder="e.g. Why is it called that?"
                placeholderTextColor={theme.textSecondary}
                style={[styles.askInput, { color: theme.text }]}
                onSubmitEditing={handleSubmitTyped}
                returnKeyType="send"
              />
              <Pressable
                onPress={listening ? stop : start}
                style={[styles.miniIconButton, { backgroundColor: listening ? theme.accent : 'transparent' }]}>
                <Ionicons
                  name={listening ? 'stop-circle' : 'mic-outline'}
                  size={18}
                  color={listening ? theme.accentContrast : theme.textSecondary}
                />
              </Pressable>
              <Pressable
                onPress={handleSubmitTyped}
                disabled={question.trim().length === 0}
                style={[
                  styles.miniIconButton,
                  { backgroundColor: theme.accent, opacity: question.trim().length === 0 ? 0.4 : 1 },
                ]}>
                <Ionicons name="arrow-up" size={16} color={theme.accentContrast} />
              </Pressable>
            </ThemedView>

            {listening && (
              <ThemedText type="small" themeColor="textSecondary">
                Listening…
              </ThemedText>
            )}
            {voiceError && (
              <ThemedText type="small" themeColor="textSecondary">
                {voiceError}
              </ThemedText>
            )}
            {askStatus === 'loading' && <ActivityIndicator style={styles.askLoading} />}
            {askStatus === 'error' && (
              <ThemedText type="small" themeColor="textSecondary">
                Couldn't get an answer: {askError}
              </ThemedText>
            )}
            {askStatus === 'success' && askResult && (
              <ThemedView style={[styles.answerBox, { backgroundColor: theme.backgroundSelected }]}>
                <Ionicons name="sparkles" size={14} color={theme.accent} />
                <ThemedText style={styles.answerText}>{askResult.answer}</ThemedText>
              </ThemedView>
            )}
          </ThemedView>

          <ThemedView style={[styles.attribution, { borderTopColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              From Wikipedia, the free encyclopedia. Text available under the Creative Commons
              Attribution-ShareAlike 4.0 License.
            </ThemedText>
            <Pressable onPress={onViewRaw}>
              <ThemedText type="linkPrimary">View original article & edit history →</ThemedText>
            </Pressable>
          </ThemedView>
        </>
      )}
    </ScrollView>
  );
}

// Only ever opens on web (see useArticleViewer) — native sources open in
// expo-web-browser's in-app sheet instead, so this stays unmounted there.
export function ArticleViewerModal() {
  const { article, close } = useArticleViewer();
  const theme = useTheme();
  const [showRaw, setShowRaw] = useState(false);

  useEffect(() => {
    setShowRaw(false);
  }, [article?.url]);

  const wiki = article ? isWikipediaUrl(article.url) : false;

  return (
    <Modal visible={article !== null} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
            {wiki && showRaw && (
              <Pressable onPress={() => setShowRaw(false)} style={styles.backButton} accessibilityLabel="Back">
                <Ionicons name="arrow-back" size={20} color={theme.text} />
              </Pressable>
            )}
            <ThemedText type="smallBold" numberOfLines={1} style={styles.title}>
              {article?.title ?? 'Source'}
            </ThemedText>
            <Pressable
              onPress={close}
              style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}
              accessibilityLabel="Close">
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </ThemedView>

          {article && wiki && !showRaw && (
            <WikipediaArticleView url={article.url} initialTitle={article.title} onViewRaw={() => setShowRaw(true)} />
          )}

          {article && (!wiki || showRaw) && (
            <iframe
              key={article.url}
              src={article.url}
              title={article.title ?? 'Source'}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
              style={{ flex: 1, width: '100%', height: '100%', border: 'none' }}
            />
          )}
        </SafeAreaView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
    gap: Spacing.two,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerNotice: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  articleTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  bodyText: {
    gap: Spacing.three,
  },
  askSection: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.two,
  },
  askPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingLeft: Spacing.three,
    paddingRight: Spacing.one,
    paddingVertical: Spacing.one,
    gap: Spacing.one,
  },
  askInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: Spacing.two,
  },
  miniIconButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.five,
    alignItems: 'center',
    justifyContent: 'center',
  },
  askLoading: {
    alignSelf: 'flex-start',
  },
  answerBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    padding: Spacing.three,
  },
  answerText: {
    flex: 1,
  },
  attribution: {
    marginTop: Spacing.two,
    paddingTop: Spacing.three,
    borderTopWidth: 1,
    gap: Spacing.one,
  },
});
