import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFriends } from '@/hooks/use-friends';
import { useTheme } from '@/hooks/use-theme';
import type { AttachmentType } from '@/utils/conversations';
import { sendSharedAttachment } from '@/utils/conversations';

interface Props {
  visible: boolean;
  onClose: () => void;
  attachmentType: AttachmentType;
  attachment: unknown;
}

export function ShareSheet({ visible, onClose, attachmentType, attachment }: Props) {
  const theme = useTheme();
  const { user } = useAuth();
  const { friends } = useFriends();
  const [note, setNote] = useState('');
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setNote('');
    setSentTo(null);
    setError(null);
    onClose();
  };

  const handleSend = async (friendId: string) => {
    if (!user) return;
    setError(null);
    setSendingTo(friendId);
    const result = await sendSharedAttachment(user.uid, friendId, attachmentType, attachment, note);
    setSendingTo(null);
    if (result) {
      setError(result);
    } else {
      setSentTo(friendId);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose} presentationStyle="pageSheet">
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={[styles.header, { borderBottomColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.headerTitle}>
              Share
            </ThemedText>
            <Pressable onPress={handleClose} style={[styles.closeButton, { backgroundColor: theme.backgroundElement }]}>
              <Ionicons name="close" size={20} color={theme.text} />
            </Pressable>
          </ThemedView>

          <ScrollView contentContainerStyle={styles.content}>
            {!user && (
              <ThemedText themeColor="textSecondary">Sign in on the Friends tab to share with friends.</ThemedText>
            )}

            {user && (
              <TextInput
                value={note}
                onChangeText={setNote}
                placeholder="Add a message (optional)"
                placeholderTextColor={theme.textSecondary}
                multiline
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
              />
            )}

            {error && (
              <ThemedText type="small" themeColor="textSecondary">
                {error}
              </ThemedText>
            )}

            {user && friends.length === 0 && (
              <ThemedText themeColor="textSecondary">
                Add a friend on the Friends tab first, then you can share with them.
              </ThemedText>
            )}

            {user &&
              friends.map((friend) => {
                const busy = sendingTo === friend.uid;
                const done = sentTo === friend.uid;
                return (
                  <Pressable
                    key={friend.friendshipId}
                    onPress={() => handleSend(friend.uid)}
                    disabled={busy || done}
                    style={[styles.row, { borderColor: theme.border }]}>
                    <ThemedView style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
                      <ThemedText type="smallBold" themeColor="accent">
                        {(friend.displayName ?? friend.email)[0]?.toUpperCase()}
                      </ThemedText>
                    </ThemedView>
                    <ThemedView style={styles.rowBody}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {friend.displayName ?? friend.email}
                      </ThemedText>
                    </ThemedView>
                    {busy && <ActivityIndicator size="small" />}
                    {done && <Ionicons name="checkmark-circle" size={20} color={theme.accent} />}
                  </Pressable>
                );
              })}
          </ScrollView>
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
  headerTitle: {
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  input: {
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 15,
    minHeight: 44,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
  },
});
