import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ArticleViewerModal } from '@/components/article-viewer-modal';
import { CrashBoundary } from '@/components/crash-boundary';
import { NotificationResponseHandler } from '@/components/notification-response-handler';
import { AlwaysOnModeProvider } from '@/hooks/use-always-on-mode';
import { ArticleHistoryProvider } from '@/hooks/use-article-history';
import { ArticleViewerProvider } from '@/hooks/use-article-viewer';
import { AuthProvider } from '@/hooks/use-auth';
import { ContentModeProvider } from '@/hooks/use-content-mode';
import { OfflineAreasProvider } from '@/hooks/use-offline-areas';
import { OfflineArticlesProvider } from '@/hooks/use-offline-articles';
import { OfflineTripsProvider } from '@/hooks/use-offline-trips';
import { ReadPreferenceProvider } from '@/hooks/use-read-preference';
import { SavedItemsProvider } from '@/hooks/use-saved-items';
import { SearchRadiusProvider } from '@/hooks/use-search-radius';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <CrashBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AuthProvider>
          <ContentModeProvider>
            <ReadPreferenceProvider>
              <SearchRadiusProvider>
                <SavedItemsProvider>
                  <ArticleHistoryProvider>
                    <ArticleViewerProvider>
                      <OfflineTripsProvider>
                        <OfflineAreasProvider>
                          <OfflineArticlesProvider>
                            <AlwaysOnModeProvider>
                              <Stack screenOptions={{ headerShown: false }} />
                              <ArticleViewerModal />
                              <NotificationResponseHandler />
                            </AlwaysOnModeProvider>
                          </OfflineArticlesProvider>
                        </OfflineAreasProvider>
                      </OfflineTripsProvider>
                    </ArticleViewerProvider>
                  </ArticleHistoryProvider>
                </SavedItemsProvider>
              </SearchRadiusProvider>
            </ReadPreferenceProvider>
          </ContentModeProvider>
        </AuthProvider>
      </ThemeProvider>
    </CrashBoundary>
  );
}
