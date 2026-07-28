import { useCallback, useEffect, useRef, useState } from 'react';

import { useAuth } from '@/hooks/use-auth';
import { supabase } from '@/services/supabase';
import { getOrCreateConversationId, type AttachmentType } from '@/utils/conversations';

export type { AttachmentType };

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string | null;
  attachmentType: AttachmentType | null;
  attachment: unknown;
  createdAt: string;
}

interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string | null;
  attachment_type: AttachmentType | null;
  attachment: unknown;
  created_at: string;
}

function mapRow(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    body: row.body,
    attachmentType: row.attachment_type,
    attachment: row.attachment,
    createdAt: row.created_at,
  };
}

export function useConversation(friendId: string | undefined) {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!user || !friendId) return;
    let cancelled = false;

    async function setup() {
      setLoading(true);
      const id = await getOrCreateConversationId(user!.id, friendId!);

      if (cancelled || !id) {
        setLoading(false);
        return;
      }

      setConversationId(id);

      const { data: rows } = await supabase
        .from('messages')
        .select('id, conversation_id, sender_id, body, attachment_type, attachment, created_at')
        .eq('conversation_id', id)
        .order('created_at', { ascending: true })
        .returns<MessageRow[]>();

      if (!cancelled) {
        setMessages((rows ?? []).map(mapRow));
        setLoading(false);
      }

      const channel = supabase
        .channel(`messages:${id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` },
          (payload) => {
            const row = mapRow(payload.new as MessageRow);
            setMessages((prev) => (prev.some((message) => message.id === row.id) ? prev : [...prev, row]));
          }
        )
        .subscribe();
      channelRef.current = channel;
    }

    setup();

    return () => {
      cancelled = true;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [user, friendId]);

  const sendMessage = useCallback(
    async (body: string | null, attachmentType?: AttachmentType, attachment?: unknown): Promise<string | null> => {
      if (!user || !conversationId) return 'Not ready yet — try again in a moment';
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          body,
          attachment_type: attachmentType ?? null,
          attachment: attachment ?? null,
        })
        .select('id, conversation_id, sender_id, body, attachment_type, attachment, created_at')
        .single<MessageRow>();

      if (error) return error.message;
      if (data) {
        const row = mapRow(data);
        setMessages((prev) => (prev.some((message) => message.id === row.id) ? prev : [...prev, row]));
      }
      return null;
    },
    [user, conversationId]
  );

  return { conversationId, messages, loading, sendMessage };
}
