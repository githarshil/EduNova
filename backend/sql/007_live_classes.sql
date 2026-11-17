-- ============================================================================
-- 007_live_classes.sql: Live Class Sessions & Text-Only Transcripts
-- Never stores audio. Students send no audio.
-- ============================================================================

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  title text not null,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  teacher_name text not null,
  status text not null default 'live' check (status in ('live', 'ended')),
  max_students int not null default 30,
  started_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz
);

create index if not exists live_sessions_code_idx on public.live_sessions(room_code);
create index if not exists live_sessions_status_idx on public.live_sessions(status);

create table if not exists public.live_transcripts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  room_code text not null,
  seq int not null,
  hindi text not null,
  kannada text not null,
  created_at timestamptz not null default now(),
  unique (session_id, seq)
);

create index if not exists live_transcripts_session_idx on public.live_transcripts(session_id, seq);

alter table public.live_sessions enable row level security;
alter table public.live_transcripts enable row level security;

drop policy if exists "authenticated read live sessions" on public.live_sessions;
create policy "authenticated read live sessions" on public.live_sessions
  for select to authenticated using (true);

drop policy if exists "authenticated read live transcripts" on public.live_transcripts;
create policy "authenticated read live transcripts" on public.live_transcripts
  for select to authenticated using (true);
