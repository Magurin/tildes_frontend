@AGENTS.md

# Tildes AI — project notes

PWA to preserve dying languages: native speakers answer a picture quiz (voice/text)
to build a dataset; users upload dictionaries/textbooks used as RAG; once a language's
dataset passes `DATASET_THRESHOLD`, the Bot screen switches from quiz to chat.

Stack: Next.js 16 App Router (React 19, Tailwind v4) · Supabase (Postgres + pgvector +
Storage) · Gemini (chat + embeddings) · Deepgram (STT). No auth (MVP, RLS disabled).

## Layout
- `app/api/*/route.ts` — `quiz`, `chat`, `upload`, `transcribe`, `languages`,
  `dictionary/[id]` (PATCH/DELETE), `languages/[id]/export` (CSV/CLDF) handlers.
- `lib/` — `supabase/{server,client}.ts`, `gemini.ts`, `deepgram.ts`, `rag.ts`, `config.ts`, `types.ts`.
- `app/components/` — `ActiveLanguageProvider` (active language in localStorage),
  `BottomNav`, `LanguagePicker`, `PWARegister`, `icons.tsx`.
- Pages: `app/page.tsx`, `app/chat`, `app/learn` (flashcards), `app/upload`,
  `app/languages`, `app/languages/[id]`.
- `lib/dictImport.ts` — dependency-free CSV/TSV dictionary parser (upload route).
- `db/seed_quiz_images.sql` — semantic-domain seeds for new quiz images.

## Conventions
- Route handlers use `getSupabaseServer()`; client components read via `/api/*` or the context.
- Services degrade gracefully when AI keys are absent (see `geminiEnabled`/`deepgramEnabled`).
- Deepgram SDK is **v5** (`new DeepgramClient(...).listen.v1.media.transcribeFile`).
- Gemini via `@google/genai` (`ai.models.generateContent` / `embedContent`).
- Supabase project is `tildesai` (ref `duamccwkngwklhuindhp`); schema applied via migrations.

## Commands
- `yarn dev` / `yarn build` / `yarn lint`. PWA over HTTPS: `yarn dev --experimental-https`.
