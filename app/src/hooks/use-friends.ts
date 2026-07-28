import { collection, deleteDoc, doc, documentId, getDocs, onSnapshot, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/services/firebase';

export interface FriendProfile {
  uid: string;
  email: string;
  displayName: string | null;
}

export interface Friend extends FriendProfile {
  friendshipId: string;
}

export interface FriendRequest extends FriendProfile {
  friendshipId: string;
}

interface FriendshipData {
  uidA: string;
  uidB: string;
  requestedBy: string;
  status: 'pending' | 'accepted';
}

interface UserDoc {
  email: string;
  displayName: string | null;
}

// Friendships (and conversations, see utils/conversations.ts) use a deterministic ID built
// from both people's uids — sorted so the pair always maps to the same document regardless
// of who acts first, which also gives free enforcement of "only one relationship per pair"
// without needing a uniqueness constraint.
export function friendshipId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incoming, setIncoming] = useState<FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setFriends([]);
      setIncoming([]);
      setOutgoing([]);
      return;
    }

    setLoading(true);
    let rowsA: (FriendshipData & { id: string })[] = [];
    let rowsB: (FriendshipData & { id: string })[] = [];

    const apply = async () => {
      const rows = [...rowsA, ...rowsB];
      const otherUids = Array.from(new Set(rows.map((row) => (row.uidA === user.uid ? row.uidB : row.uidA))));

      const profileByUid = new Map<string, UserDoc>();
      // Firestore's "in" filter caps at 30 values — plenty for a personal friends list.
      if (otherUids.length > 0) {
        const usersSnap = await getDocs(query(collection(db, 'users'), where(documentId(), 'in', otherUids.slice(0, 30))));
        usersSnap.forEach((docSnap) => profileByUid.set(docSnap.id, docSnap.data() as UserDoc));
      }

      const nextFriends: Friend[] = [];
      const nextIncoming: FriendRequest[] = [];
      const nextOutgoing: FriendRequest[] = [];

      for (const row of rows) {
        const otherUid = row.uidA === user.uid ? row.uidB : row.uidA;
        const profile = profileByUid.get(otherUid);
        if (!profile) continue;
        const entry = { friendshipId: row.id, uid: otherUid, email: profile.email, displayName: profile.displayName };
        if (row.status === 'accepted') {
          nextFriends.push(entry);
        } else if (row.requestedBy === user.uid) {
          nextOutgoing.push(entry);
        } else {
          nextIncoming.push(entry);
        }
      }

      setFriends(nextFriends);
      setIncoming(nextIncoming);
      setOutgoing(nextOutgoing);
      setLoading(false);
    };

    const unsubA = onSnapshot(query(collection(db, 'friendships'), where('uidA', '==', user.uid)), (snap) => {
      rowsA = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as FriendshipData) }));
      apply();
    });
    const unsubB = onSnapshot(query(collection(db, 'friendships'), where('uidB', '==', user.uid)), (snap) => {
      rowsB = snap.docs.map((docSnap) => ({ id: docSnap.id, ...(docSnap.data() as FriendshipData) }));
      apply();
    });

    return () => {
      unsubA();
      unsubB();
    };
  }, [user]);

  const sendRequest = async (email: string): Promise<string | null> => {
    if (!user) return 'Not signed in';
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return 'Enter an email address';
    if (trimmed === user.email?.toLowerCase()) return "That's your own email";

    const matches = await getDocs(query(collection(db, 'users'), where('email', '==', trimmed)));
    if (matches.empty) return "No Travel Tales user found with that email — they'll need to sign in first";
    const targetUid = matches.docs[0]!.id;

    const id = friendshipId(user.uid, targetUid);
    const existing = await getDocs(query(collection(db, 'friendships'), where(documentId(), '==', id)));
    if (!existing.empty) return 'Already friends, or a request is already pending';

    try {
      await setDoc(doc(db, 'friendships', id), {
        uidA: user.uid < targetUid ? user.uid : targetUid,
        uidB: user.uid < targetUid ? targetUid : user.uid,
        requestedBy: user.uid,
        status: 'pending',
        createdAt: serverTimestamp(),
      });
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : String(err);
    }
  };

  const respond = async (id: string, accept: boolean) => {
    if (accept) {
      await setDoc(doc(db, 'friendships', id), { status: 'accepted' }, { merge: true });
    } else {
      await deleteDoc(doc(db, 'friendships', id));
    }
  };

  const cancelRequest = async (id: string) => {
    await deleteDoc(doc(db, 'friendships', id));
  };

  return { friends, incoming, outgoing, loading, sendRequest, respond, cancelRequest };
}
