import { supabase } from '@/services/supabase';

export type AttachmentType = 'trip' | 'article' | 'story' | 'answer';

// Conversations are keyed by an ordered pair so both people always land on the same row
// regardless of who opens/shares first.
export function pairIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

export async function getOrCreateConversationId(myId: string, friendId: string): Promise<string | null> {
  const [userA, userB] = pairIds(myId, friendId);

  const { data: existing } = await supabase.from('conversations').select('id').eq('user_a', userA).eq('user_b', userB).maybeSingle();
  if (existing?.id) return existing.id;

  const { data: created, error } = await supabase.from('conversations').insert({ user_a: userA, user_b: userB }).select('id').single();
  if (!error && created) return created.id;

  // Likely a concurrent insert from the other person opening/sharing at the same moment.
  const { data: retry } = await supabase.from('conversations').select('id').eq('user_a', userA).eq('user_b', userB).maybeSingle();
  return retry?.id ?? null;
}

export async function sendSharedAttachment(
  myId: string,
  friendId: string,
  attachmentType: AttachmentType,
  attachment: unknown,
  note?: string
): Promise<string | null> {
  const conversationId = await getOrCreateConversationId(myId, friendId);
  if (!conversationId) return "Couldn't start a conversation with that friend";

  const { error } = await supabase.from('messages').insert({
    conversation_id: conversationId,
    sender_id: myId,
    body: note?.trim() || null,
    attachment_type: attachmentType,
    attachment,
  });
  return error?.message ?? null;
}
