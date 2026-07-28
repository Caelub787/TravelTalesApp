import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AuthForm } from '@/components/auth-form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CardShadow, MaxContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useFriends, type Friend, type FriendRequest } from '@/hooks/use-friends';
import { useTheme } from '@/hooks/use-theme';

export default function FriendsScreen() {
  const theme = useTheme();
  const { user, loading: authLoading, signOut } = useAuth();
  const { friends, incoming, outgoing, loading, sendRequest, respond, cancelRequest } = useFriends();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendSuccess, setSendSuccess] = useState(false);

  if (authLoading) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ThemedView style={styles.centerNotice}>
            <ActivityIndicator />
          </ThemedView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <ScrollView contentContainerStyle={styles.content}>
            <ThemedText type="title" style={styles.title}>
              Friends
            </ThemedText>
            <AuthForm />
          </ScrollView>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const handleSend = async () => {
    setSendError(null);
    setSendSuccess(false);
    setSending(true);
    const result = await sendRequest(email);
    setSending(false);
    if (result) {
      setSendError(result);
    } else {
      setEmail('');
      setSendSuccess(true);
    }
  };

  const renderFriend = (friend: Friend) => (
    <Pressable
      key={friend.friendshipId}
      onPress={() => router.push({ pathname: '/conversation/[friendId]', params: { friendId: friend.uid, name: friend.displayName ?? friend.email } })}>
      <ThemedView type="backgroundElement" style={[styles.row, { borderColor: theme.border, shadowColor: theme.text }]}>
        <ThemedView style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="accent">
            {(friend.displayName ?? friend.email)[0]?.toUpperCase()}
          </ThemedText>
        </ThemedView>
        <ThemedView style={styles.rowBody}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {friend.displayName ?? friend.email}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {friend.email}
          </ThemedText>
        </ThemedView>
        <Ionicons name="chatbubble-outline" size={18} color={theme.textSecondary} />
      </ThemedView>
    </Pressable>
  );

  const renderIncoming = (request: FriendRequest) => (
    <ThemedView key={request.friendshipId} type="backgroundElement" style={[styles.row, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" themeColor="accent">
          {(request.displayName ?? request.email)[0]?.toUpperCase()}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {request.displayName ?? request.email}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          wants to be friends
        </ThemedText>
      </ThemedView>
      <Pressable onPress={() => respond(request.friendshipId, true)} style={[styles.iconButton, { backgroundColor: theme.accent }]}>
        <Ionicons name="checkmark" size={16} color={theme.accentContrast} />
      </Pressable>
      <Pressable onPress={() => respond(request.friendshipId, false)} style={[styles.iconButton, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="close" size={16} color={theme.text} />
      </Pressable>
    </ThemedView>
  );

  const renderOutgoing = (request: FriendRequest) => (
    <ThemedView key={request.friendshipId} type="backgroundElement" style={[styles.row, { borderColor: theme.border, shadowColor: theme.text }]}>
      <ThemedView style={[styles.avatar, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" themeColor="accent">
          {(request.displayName ?? request.email)[0]?.toUpperCase()}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.rowBody}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {request.displayName ?? request.email}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          Request sent — waiting for them
        </ThemedText>
      </ThemedView>
      <Pressable onPress={() => cancelRequest(request.friendshipId)} style={[styles.iconButton, { backgroundColor: theme.backgroundSelected }]}>
        <Ionicons name="close" size={16} color={theme.text} />
      </Pressable>
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.content}>
          <ThemedView style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Friends
            </ThemedText>
            <Pressable onPress={signOut} style={styles.signOutButton}>
              <ThemedText type="small" themeColor="textSecondary">
                Sign out
              </ThemedText>
            </Pressable>
          </ThemedView>

          <ThemedText type="small" themeColor="textSecondary">
            Signed in as {user.email}
          </ThemedText>

          <ThemedView style={styles.addRow}>
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Friend's email"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement, borderColor: theme.border }]}
            />
            <Pressable onPress={handleSend} disabled={sending} style={[styles.addButton, { backgroundColor: theme.accent, opacity: sending ? 0.6 : 1 }]}>
              {sending ? <ActivityIndicator color={theme.accentContrast} /> : <Ionicons name="person-add" size={18} color={theme.accentContrast} />}
            </Pressable>
          </ThemedView>
          {sendError && (
            <ThemedText type="small" themeColor="textSecondary">
              {sendError}
            </ThemedText>
          )}
          {sendSuccess && (
            <ThemedText type="small" themeColor="textSecondary">
              Friend request sent.
            </ThemedText>
          )}

          {incoming.length > 0 && (
            <>
              <ThemedText type="smallBold" style={styles.sectionSpacing}>
                Friend requests
              </ThemedText>
              {incoming.map(renderIncoming)}
            </>
          )}

          {outgoing.length > 0 && (
            <>
              <ThemedText type="smallBold" style={styles.sectionSpacing}>
                Sent requests
              </ThemedText>
              {outgoing.map(renderOutgoing)}
            </>
          )}

          <ThemedText type="smallBold" style={styles.sectionSpacing}>
            Friends
          </ThemedText>
          {loading && friends.length === 0 && (
            <ThemedView style={styles.centerNotice}>
              <ActivityIndicator />
            </ThemedView>
          )}
          {!loading && friends.length === 0 && (
            <ThemedView style={styles.emptyState}>
              <Ionicons name="people-outline" size={32} color={theme.textSecondary} />
              <ThemedText themeColor="textSecondary">
                Add a friend by email above, then message them and share trips/stories once they accept.
              </ThemedText>
            </ThemedView>
          )}
          {friends.map(renderFriend)}
        </ScrollView>
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
  content: {
    padding: Spacing.four,
    gap: Spacing.three,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  signOutButton: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
  centerNotice: {
    alignItems: 'center',
    paddingVertical: Spacing.six,
  },
  addRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Spacing.three,
    borderWidth: 1,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionSpacing: {
    marginTop: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.six,
    paddingHorizontal: Spacing.four,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Spacing.three,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
    ...CardShadow,
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
    gap: Spacing.half,
  },
  iconButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
