import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

import { ShareSheet } from '@/components/share-sheet';
import { SpeakButton } from '@/components/speak-button';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useArticleAsk } from '@/hooks/use-article-ask';
import { useArticleContent } from '@/hooks/use-article-content';
import { useOfflineArticles } from '@/hooks/use-offline-articles';
import { useReadPreference } from '@/hooks/use-read-preference';
import { useSpeakable } from '@/hooks/use-speakable';
import { useTheme } from '@/hooks/use-theme';
import { useVoiceInput } from '@/hooks/use-voice-input';

interface WikipediaArticleViewProps {
  url: string;
  initialTitle?: string;
  onViewRaw: () => void;
}

// Cross-platform (no DOM APIs) — shared as-is by both the web and native ArticleViewerModal.
export function WikipediaArticleView({ url, initialTitle, onViewRaw }: WikipediaArticleViewProps) {
  const theme = useTheme();
  const { preference } = useReadPreference();
  const { speak } = useSpeakable();
  const { result: liveResult, status, error, load } = useArticleContent();
  const { saveArticle, deleteArticle, findByUrl } = useOfflineArticles();
  const hasAutoSpoken = useRef(false);
  const title = initialTitle ?? url;

  useEffect(() => {
    hasAutoSpoken.current = false;
    load(title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const offlineCopy = findByUrl(url);
  const usingOffline = status === 'error' && offlineCopy !== null;
  const result = status === 'success' ? liveResult : usingOffline ? offlineCopy : null;
  const isDownloaded = offlineCopy !== null;

  useEffect(() => {
    if (result && preference === 'voice' && !hasAutoSpoken.current) {
      hasAutoSpoken.current = true;
      speak(`${result.title}. ${result.extract}`);
    }
  }, [result, preference, speak]);

  const [shareVisible, setShareVisible] = useState(false);
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

  const toggleDownload = () => {
    if (isDownloaded) {
      deleteArticle(url);
    } else if (result) {
      saveArticle({ url, title: result.title, extract: result.extract, downloadedAt: Date.now() });
    }
  };

  const showLoading = status === 'loading' && !offlineCopy;
  const showError = status === 'error' && !offlineCopy;

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {showLoading && (
        <ThemedView style={styles.centerNotice}>
          <ActivityIndicator />
          <ThemedText themeColor="textSecondary">Loading article…</ThemedText>
        </ThemedView>
      )}

      {showError && (
        <ThemedView style={styles.centerNotice}>
          <ThemedText themeColor="textSecondary">Couldn't load this article: {error}</ThemedText>
          <Pressable onPress={onViewRaw}>
            <ThemedText type="linkPrimary">View original page instead</ThemedText>
          </Pressable>
        </ThemedView>
      )}

      {result && (
        <>
          {usingOffline && (
            <ThemedView style={[styles.offlineBanner, { backgroundColor: theme.backgroundSelected, borderColor: theme.accent }]}>
              <Ionicons name="cloud-offline-outline" size={14} color={theme.accent} />
              <ThemedText type="small" themeColor="textSecondary">
                No connection — showing your downloaded copy.
              </ThemedText>
            </ThemedView>
          )}

          <ThemedText type="subtitle" style={styles.articleTitle}>
            {result.title}
          </ThemedText>

          <ThemedView style={styles.actionRow}>
            <SpeakButton text={`${result.title}. ${result.extract}`} />
            <Pressable
              onPress={toggleDownload}
              style={[styles.downloadButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons
                name={isDownloaded ? 'checkmark-circle' : 'cloud-download-outline'}
                size={14}
                color={isDownloaded ? theme.accent : theme.textSecondary}
              />
              <ThemedText type="small" themeColor="textSecondary">
                {isDownloaded ? 'Downloaded' : 'Download for offline'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setShareVisible(true)}
              style={[styles.downloadButton, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
              <Ionicons name="paper-plane-outline" size={14} color={theme.textSecondary} />
              <ThemedText type="small" themeColor="textSecondary">
                Share
              </ThemedText>
            </Pressable>
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
            {usingOffline && (
              <ThemedText type="small" themeColor="textSecondary">
                Asking questions needs a connection — this only works once you're back online.
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

          <ShareSheet
            visible={shareVisible}
            onClose={() => setShareVisible(false)}
            attachmentType="article"
            attachment={{ url, title: result.title, extract: result.extract, downloadedAt: Date.now() }}
          />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  centerNotice: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1.5,
    padding: Spacing.two,
  },
  articleTitle: {
    fontSize: 24,
    lineHeight: 30,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
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
