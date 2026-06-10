# Tildes AI

PWA для спасения умирающих языков через общение с носителем. Носитель проходит
викторину по рисункам (отвечает голосом/текстом) — так растёт датасет; параллельно
можно загружать словари и учебники, которые используются как **RAG**. Когда датасета
по языку достаточно, раздел «Бот» переключается из викторины в режим живого чата.

Стек: **Next.js 16** (App Router, React 19, Tailwind v4) · **Supabase** (Postgres +
pgvector + Storage) · **Gemini** (чат + эмбеддинги) · **Deepgram** (распознавание речи).

## Возможности

- **Бот** (`/chat`) — викторина по картинкам с записью голоса (`MediaRecorder`),
  авто-переход в чат после `DATASET_THRESHOLD` ответов.
- **Загрузка** (`/upload`) — PDF/TXT → Storage → извлечение текста → чанки + эмбеддинги;
  CSV/TSV (`слово, перевод[, определение, пример]`) импортируются сразу в словарь.
- **Языки** (`/languages`, `/languages/[id]`) — список языков, словарь и прогресс датасета;
  поиск по словарю, правка/удаление статей (курирование), экспорт **CSV** и **CLDF**.
- **Учить** (`/learn`) — карточки из собранного словаря для изучающих язык
  (перевод/рисунок/аудио → вспомнить слово; незнакомые возвращаются в колоду).
- **PWA** — манифест, service worker, устанавливается на домашний экран.

## Запуск

```bash
yarn install
yarn dev          # http://localhost:3000
```

PWA-функции (установка, push) требуют HTTPS — для локальной проверки:

```bash
yarn dev --experimental-https
```

## Переменные окружения

`.env.local` (Supabase уже заполнен для провизионенного проекта). Добавьте ключи ИИ:

| Переменная | Назначение |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Клиент Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Опционально для серверных роутов (RLS отключён в MVP) |
| `GEMINI_API_KEY` | Чат и эмбеддинги; без него `/chat` вернёт 503, загрузки сохранятся без эмбеддингов |
| `GEMINI_MODEL` / `GEMINI_EMBED_MODEL` | Модели Gemini (по умолчанию `gemini-3.1-flash-lite` / `gemini-embedding-001`) |
| `DEEPGRAM_API_KEY` | Распознавание речи; без него аудио просто сохраняется |

Сервис деградирует мягко: без ключей ИИ UI и сбор датасета работают, генерация — нет.

## Архитектура

- `app/api/*` — route handlers: `quiz`, `chat`, `upload`, `transcribe`, `languages`.
- `lib/` — клиенты Supabase (`supabase/`), `gemini.ts`, `deepgram.ts`, `rag.ts`, `config.ts`.
- `app/components/` — `ActiveLanguageProvider` (активный язык в localStorage), `BottomNav`,
  `LanguagePicker`, `PWARegister`, иконки.

## База данных

Схема накатана миграциями в Supabase (проект `tildesai`): `languages`, `quiz_images`,
`quiz_responses`, `dictionary_entries`, `documents`, `document_chunks` (pgvector 768d),
`chat_messages`, RPC `match_document_chunks`. Storage-бакеты: `quiz-images`, `audio`,
`documents`. Картинки викторины — сиды в `public/quiz/*.svg`; новые картинки и семантические
домены (Rapid Word Collection) — `db/seed_quiz_images.sql`.

## ⚠️ Перед продакшеном

- **RLS отключён** (MVP без авторизации) — включить Row Level Security и политики на все
  таблицы и storage-бакеты перед публичным запуском; сейчас политики storage разрешают
  анонимную запись.
- Чат использует `gemini-3.1-flash-lite`, эмбеддинги — `gemini-embedding-001` (768d); меняется через `GEMINI_MODEL` / `GEMINI_EMBED_MODEL`.
- Deepgram не покрывает большинство редких языков — аудио всегда хранится как первичные данные.
