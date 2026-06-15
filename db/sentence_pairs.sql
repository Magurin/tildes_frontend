-- Sentence pairs power the "translate the sentence" exercise in Learn
-- (Duolingo-style: a Russian prompt, answer assembled from target-language
-- word tiles). Populated from the parallel corpus via
-- scripts/import_sentence_pairs.py. Applied to project duamccwkngwklhuindhp
-- as migration `create_sentence_pairs`.

create table if not exists public.sentence_pairs (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references public.languages(id) on delete cascade,
  source text not null,   -- Russian prompt
  target text not null,   -- target-language answer
  created_at timestamptz not null default now()
);

create index if not exists sentence_pairs_language_idx
  on public.sentence_pairs(language_id);

-- Same posture as the rest of the schema: public read, writes via service role.
alter table public.sentence_pairs enable row level security;

drop policy if exists "public read sentence_pairs" on public.sentence_pairs;
create policy "public read sentence_pairs"
  on public.sentence_pairs for select using (true);
