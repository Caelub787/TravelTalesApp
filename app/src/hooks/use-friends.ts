import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/services/supabase';

export interface FriendProfile {
  profileId: string;
  email: string;
  displayName: string | null;
}

export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface FriendRequest extends FriendProfile {
  friendshipId: string;
}

interface ProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

interface FriendshipRow {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'declined';
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: rows } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, status')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
      .returns<FriendshipRow[]>();

    if (!rows) {
      setLoading(false);
      return;
    }

    const otherIds = Array.from(new Set(rows.map((row) => (row.requester_id === user.id ? row.addressee_id : row.requester_id))));
    let profileById = new Map<string, ProfileRow>();
    if (otherIds.length > 0) {
      const { data: profiles } = await supabase.from('profiles').select('id, email, display_name').in('id', otherIds).returns<ProfileRow[]>();
      profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile]));
    }

    const nextFriends: Friend[] = [];
    const nextIncoming: FriendRequest[] = [];
    const nextOutgoing: FriendRequest[] = [];

    for (const row of rows) {
      const isRequester = row.requester_id === user.id;
      const other = profileById.get(isRequester ? row.addressee_id : row.requester_id);
      if (!other) continue;
      const entry = { friendshipId: row.id, profileId: other.id, email: other.email, displayName: other.display_name };
      if (row.status === 'accepted') {
        nextFriends.push(entry);
      } else if (row.status === 'pending') {
        (isRequester ? nextOutgoing : nextIncoming).push(entry);
      }
    }

    setFriends(nextFriends);
    setIncoming(nextIncoming);
    setOutgoing(nextOutgoing);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const sendRequest = useCallback(
    async (email: string): Promise<string | null> => {
      if (!user) return 'Not signed in';
      const trimmed = email.trim().toLowerCase();
      if (!trimmed) return 'Enter an email address';
      if (trimmed === user.email?.toLowerCase()) return "That's your own email";

      const { data: target, error: findError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', trimmed)
        .maybeSingle();
      if (findError) return findError.message;
      if (!target) return "No Travel Tales user found with that email — they'll need to sign up first";

      const { error } = await supabase.from('friendships').insert({ requester_id: user.id, addressee_id: target.id });
      if (error) return error.message.includes('duplicate') ? 'Already friends, or a request is already pending' : error.message;
      await refresh();
      return null;
    },
    [user, refresh]
  );

  const respond = useCallback(
    async (friendshipId: string, accept: boolean) => {
      if (accept) {
        await supabase.from('friendships').update({ status: 'accepted' }).eq('id', friendshipId);
      } else {
        await supabase.from('friendships').delete().eq('id', friendshipId);
      }
      await refresh();
    },
    [refresh]
  );

  const cancelRequest = useCallback(
    async (friendshipId: string) => {
      await supabase.from('friendships').delete().eq('id', friendshipId);
      await refresh();
    },
    [refresh]
  );

  return { friends, incoming, outgoing, loading, sendRequest, respond, cancelRequest, refresh };
}
