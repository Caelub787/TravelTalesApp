import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WikipediaArticleView } from '@/components/wikipedia-article-view';
import { Spacing } from '@/constants/theme';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useTheme } from '@/hooks/use-theme';
import { isWikipediaUrl } from '@/utils/wikipedia-url';

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
});
