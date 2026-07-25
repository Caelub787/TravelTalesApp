import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ContentModeProvider } from '@/hooks/use-content-mode';
import { SavedItemsProvider } from '@/hooks/use-saved-items';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ContentModeProvider>
        <SavedItemsProvider>
          <Stack screenOptions={{ headerShown: false }} />
        </SavedItemsProvider>
      </ContentModeProvider>
    </ThemeProvider>
  );
}
