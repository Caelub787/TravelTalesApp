import { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useAddressSearch } from '@/hooks/use-address-search';
import { useTheme } from '@/hooks/use-theme';
import type { AddressSearchResult } from '@/services/api';

interface AddressSearchInputProps {
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  onSelect: (result: AddressSearchResult) => void;
  onFocus?: () => void;
}

export function AddressSearchInput({ placeholder, value, onChangeText, onSelect, onFocus }: AddressSearchInputProps) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const { suggestions, status } = useAddressSearch(focused ? value : '');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showDropdown = focused && (suggestions.length > 0 || status === 'loading');

  const handleSelect = (result: AddressSearchResult) => {
    if (blurTimer.current) clearTimeout(blurTimer.current);
    onSelect(result);
    setFocused(false);
  };

  return (
    <View style={styles.wrapper}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
        onFocus={() => {
          setFocused(true);
          onFocus?.();
        }}
        onBlur={() => {
          // Delay so a tap on a suggestion registers before the dropdown unmounts.
          blurTimer.current = setTimeout(() => setFocused(false), 150);
        }}
      />
      {showDropdown && (
        <View
          style={[
            styles.dropdown,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border, shadowColor: theme.text },
          ]}>
          {status === 'loading' && (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" />
              <ThemedText type="small" themeColor="textSecondary">
                Searching…
              </ThemedText>
            </View>
          )}
          {status === 'success' &&
            suggestions.map((result, index) => (
              <Pressable
                key={`${result.latitude},${result.longitude},${index}`}
                onPress={() => handleSelect(result)}
                style={({ pressed }) => [
                  styles.suggestionRow,
                  index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  pressed && { backgroundColor: theme.background },
                ]}>
                <ThemedText type="small" numberOfLines={2}>
                  {result.label}
                </ThemedText>
              </Pressable>
            ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
    zIndex: 1,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: Spacing.one,
    borderRadius: Spacing.three,
    borderWidth: 1,
    overflow: 'hidden',
    zIndex: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  suggestionRow: {
    padding: Spacing.three,
  },
});
