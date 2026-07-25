import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useArticleViewer } from '@/hooks/use-article-viewer';
import { useTheme } from '@/hooks/use-theme';

// Only ever opens on web (see useArticleViewer) — native sources open in
// expo-web-browser's in-app sheet instead, so this stays unmounted there.
export function ArticleViewerModal() {
  const { article, close } = useArticleViewer();
  const theme = useTheme();

  return (
    <Modal visible={article !== null} animationType="slide" onRequestClose={close} presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
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

          {article && (
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
  },
  title: {
    flex: 1,
    marginRight: Spacing.two,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
