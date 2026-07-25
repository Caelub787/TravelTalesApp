import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useColorScheme } from 'react-native';

import { ContentModeProvider } from '@/hooks/use-content-mode';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <ContentModeProvider>
        <Stack screenOptions={{ headerShown: false }} />
      </ContentModeProvider>
    </ThemeProvider>
  );
}
