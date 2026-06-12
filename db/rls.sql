-- Lock down direct Supabase access (the anon key ships in the client).
--
-- Reads stay public; ALL writes go through the Next.js API routes, which use
-- the service-role key and bypass RLS. Moderator-only routes additionally
-- check Supabase Auth + MODERATOR_EMAILS (see lib/auth.ts).
--
-- Apply in the Supabase dashboard SQL editor (project tildesai). Idempotent.

-- ── Tables: RLS on, public read, no anon/authenticated writes ──

do $$
declare t text;
begin
  foreach t in array array[
    'languages', 'quiz_images', 'quiz_responses', 'dictionary_entries',
    'documents', 'document_chunks', 'chat_messages'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists public_read on public.%I', t);
    execute format(
      'create policy public_read on public.%I for select to anon, authenticated using (true)', t
    );
  end loop;
end $$;

-- ── Storage: drop the permissive write policies, keep public read ──
-- (buckets quiz-images/audio/documents are public, but REST uploads with the
-- anon key were allowed too — that is the hole being closed)

do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
  loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;

create policy public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id in ('quiz-images', 'audio', 'documents'));
