import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ArticleViewerModal } from '@/components/article-viewer-modal';
import { CrashBoundary } from '@/components/crash-boundary';
import { ArticleHistoryProvider } from '@/hooks/use-article-history';
import { ArticleViewerProvider } from '@/hooks/use-article-viewer';
import { ContentModeProvider } from '@/hooks/use-content-mode';
import { ReadPreferenceProvider } from '@/hooks/use-read-preference';
import { SavedItemsProvider } from '@/hooks/use-saved-items';
import { SearchRadiusProvider } from '@/hooks/use-search-radius';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <CrashBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <ContentModeProvider>
          <ReadPreferenceProvider>
            <SearchRadiusProvider>
              <SavedItemsProvider>
                <ArticleHistoryProvider>
                  <ArticleViewerProvider>
                    <Stack screenOptions={{ headerShown: false }} />
                    <ArticleViewerModal />
                  </ArticleViewerProvider>
                </ArticleHistoryProvider>
              </SavedItemsProvider>
            </SearchRadiusProvider>
          </ReadPreferenceProvider>
        </ContentModeProvider>
      </ThemeProvider>
    </CrashBoundary>
  );
}
