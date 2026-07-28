import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { MessageAttachment } from '@/components/message-attachment';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useConversation } from '@/hooks/use-conversation';
import { useTheme } from '@/hooks/use-theme';
import { formatRelativeTime } from '@/utils/format-time';

export default function ConversationScreen() {
  const { friendId, name } = useLocalSearchParams<{ friendId: string; name?: string }>();
  const theme = useTheme();
  const { user } = useAuth();
  const { messages, loading, sendMessage } = useConversation(friendId);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  const handleSend = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setSending(true);
    await sendMessage(text);
    setSending(false);
  };

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={20} color={theme.text} />
          </Pressable>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.headerTitle}>
            {name ?? 'Chat'}
          </ThemedText>
        </ThemedView>

        {loading ? (
          <ThemedView style={styles.centerNotice}>
            <ActivityIndicator />
          </ThemedView>
        ) : (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.messageList}>
            {messages.length === 0 && (
              <ThemedView style={styles.emptyState}>
                <Ionicons name="chatbubbles-outline" size={32} color={theme.textSecondary} />
                <ThemedText themeColor="textSecondary">
                  Say hi, or share a trip, article, or story with {name ?? 'your friend'} from anywhere in the app.
                </ThemedText>
              </ThemedView>
            )}
            {messages.map((message) => {
              const mine = message.senderId === user?.id;
              return (
                <ThemedView key={message.id} style={[styles.bubbleRow, mine ? styles.bubbleRowMine : styles.bubbleRowTheirs]}>
                  <ThemedView
                    style={[
                      styles.bubble,
                      message.attachmentType ? styles.attachmentBubble : null,
                      {
                        backgroundColor: message.attachmentType
                          ? 'transparent'
                          : mine
                            ? theme.accent
                            : theme.backgroundElement,
                        borderColor: theme.border,
                        borderWidth: message.attachmentType ? 0 : mine ? 0 : 1,
                      },
                    ]}>
                    {message.attachmentType && (
                      <MessageAttachment messageId={message.id} attachmentType={message.attachmentType} attachment={message.attachment} />
                    )}
                    {message.body && (
                      <ThemedText themeColor={mine && !message.attachmentType ? 'accentContrast' : 'text'}>
                        {message.body}
                      </ThemedText>
                    )}
                  </ThemedView>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.timestamp}>
                    {formatRelativeTime(new Date(message.createdAt).getTime())}
                  </ThemedText>
                </ThemedView>
              );
            })}
          </ScrollView>
        )}

        <ThemedView style={[styles.composerRow, { borderTopColor: theme.border }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Message"
            placeholderTextColor={theme.textSecondary}
            style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            onSubmitEditing={handleSend}
            returnKeyType="send"
          />
          <Pressable
            onPress={handleSend}
            disabled={sending || draft.trim().length === 0}
            style={[styles.sendButton, { backgroundColor: theme.accent, opacity: draft.trim().length === 0 ? 0.4 : 1 }]}>
            <Ionicons name="arrow-up" size={18} color={theme.accentContrast} />
          </Pressable>
        </ThemedView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
  },
  centerNotice: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  messageList: {
    padding: Spacing.four,
    gap: Spacing.three,
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
  },
  bubbleRow: {
    gap: Spacing.half,
    maxWidth: '85%',
  },
  bubbleRowMine: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  bubbleRowTheirs: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  bubble: {
    borderRadius: Spacing.four,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  attachmentBubble: {
    padding: 0,
    width: '100%',
  },
  timestamp: {
    marginHorizontal: Spacing.one,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.five,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
