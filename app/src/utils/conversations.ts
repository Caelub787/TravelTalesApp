import { addDoc, collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import { db } from '@/services/firebase';

export type AttachmentType = 'trip' | 'article' | 'story' | 'answer';

// Conversations (like friendships, see hooks/use-friends.ts) use a deterministic ID built
// from both people's uids — sorted so the pair always maps to the same document regardless
// of who opens/shares first.
export function conversationId(a: string, b: string): string {
  return [a, b].sort().join('_');
}

export async function getOrCreateConversationId(myId: string, friendId: string): Promise<string | null> {
  const id = conversationId(myId, friendId);
  const ref = doc(db, 'conversations', id);
  const existing = await getDoc(ref);
  if (!existing.exists()) {
    await setDoc(ref, {
      participants: [myId, friendId],
      createdAt: serverTimestamp(),
    });
  }
  return id;
}

export async function sendSharedAttachment(
  myId: string,
  friendId: string,
  attachmentType: AttachmentType,
  attachment: unknown,
  note?: string
): Promise<string | null> {
  const id = await getOrCreateConversationId(myId, friendId);
  if (!id) return "Couldn't start a conversation with that friend";

  try {
    await addDoc(collection(db, 'conversations', id, 'messages'), {
      senderId: myId,
      body: note?.trim() || null,
      attachmentType,
      attachment,
      createdAt: serverTimestamp(),
    });
    return null;
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}
