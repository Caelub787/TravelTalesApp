import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, type Timestamp } from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { db } from '@/services/firebase';
import { getOrCreateConversationId, type AttachmentType } from '@/utils/conversations';

export type { AttachmentType };

export interface ChatMessage {
  id: string;
  senderId: string;
  body: string | null;
  attachmentType: AttachmentType | null;
  attachment: unknown;
  createdAt: number;
}

interface MessageDoc {
  senderId: string;
  body: string | null;
  attachmentType: AttachmentType | null;
  attachment: unknown;
  createdAt: Timestamp | null;
}

export function useConversation(friendId: string | undefined) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !friendId) return;
    let cancelled = false;
    let unsubscribe: (() => void) | null = null;

    (async () => {
      setLoading(true);
      const id = await getOrCreateConversationId(user.uid, friendId);
      if (cancelled || !id) {
        setLoading(false);
        return;
      }

      setConversationId(id);

      const messagesQuery = query(collection(db, 'conversations', id, 'messages'), orderBy('createdAt', 'asc'));
      unsubscribe = onSnapshot(messagesQuery, (snap) => {
        setMessages(
          snap.docs.map((docSnap) => {
            const data = docSnap.data() as MessageDoc;
            return {
              id: docSnap.id,
              senderId: data.senderId,
              body: data.body,
              attachmentType: data.attachmentType,
              attachment: data.attachment,
              createdAt: data.createdAt?.toMillis() ?? Date.now(),
            };
          })
        );
        setLoading(false);
      });
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [user, friendId]);

  const sendMessage = useCallback(
    async (body: string | null, attachmentType?: AttachmentType, attachment?: unknown): Promise<string | null> => {
      if (!conversationId) return 'Not ready yet — try again in a moment';
      try {
        await addDoc(collection(db, 'conversations', conversationId, 'messages'), {
          senderId: user!.uid,
          body,
          attachmentType: attachmentType ?? null,
          attachment: attachment ?? null,
          createdAt: serverTimestamp(),
        });
        return null;
      } catch (err) {
        return err instanceof Error ? err.message : String(err);
      }
    },
    [user, conversationId]
  );

  return { conversationId, messages, loading, sendMessage };
}
