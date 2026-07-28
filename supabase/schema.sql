-- TravelTalesApp: accounts, friends, and messaging schema.
--
-- Run this once in the Supabase project's SQL Editor (Dashboard -> SQL Editor -> New query)
-- after enabling Email and Google as sign-in providers under Authentication -> Providers.
--
-- Design: trips/saved articles/history stay entirely on-device (AsyncStorage) as before —
-- this schema only backs accounts, friend relationships, and chat messages. Sharing a trip
-- or article posts its data as a message "attachment"; the recipient's app copies that
-- attachment into their own local storage when they tap Save, the same as any other
-- on-device item from then on.

-- 1. Profiles ---------------------------------------------------------------
-- Mirrors auth.users with only the public-safe fields the app needs to show/search for a
-- person (never expose auth.users directly to the client).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  display_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Profiles are readable by any signed-in user"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Auto-create a profile row whenever someone signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. Friendships -------------------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles (id) on delete cascade,
  addressee_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined')),
  created_at timestamptz not null default now(),
  unique (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);

alter table public.friendships enable row level security;

create policy "See friendships you're part of"
  on public.friendships for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Send a friend request"
  on public.friendships for insert
  to authenticated
  with check (auth.uid() = requester_id);

create policy "Respond to or cancel a friend request"
  on public.friendships for update
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Cancel your own pending request"
  on public.friendships for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- 3. Conversations -------------------------------------------------------------
-- One row per friend pair. user_a/user_b are stored with user_a < user_b (as text) so the
-- pair has a single canonical row regardless of who started the conversation.
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_a, user_b),
  check (user_a < user_b)
);

alter table public.conversations enable row level security;

create policy "See your own conversations"
  on public.conversations for select
  to authenticated
  using (auth.uid() = user_a or auth.uid() = user_b);

create policy "Start a conversation you're part of"
  on public.conversations for insert
  to authenticated
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- 4. Messages -------------------------------------------------------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text,
  attachment_type text check (attachment_type in ('trip', 'article', 'story', 'answer')),
  attachment jsonb,
  created_at timestamptz not null default now(),
  check (body is not null or attachment is not null)
);

alter table public.messages enable row level security;

create policy "See messages in your own conversations"
  on public.messages for select
  to authenticated
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "Send a message in your own conversation"
  on public.messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

-- 5. Realtime -------------------------------------------------------------
-- Lets the chat screen subscribe to new messages live instead of polling.
alter publication supabase_realtime add table public.messages;
