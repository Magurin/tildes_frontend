export type Language = {
  id: string;
  name: string;
  native_name: string | null;
  iso_code: string | null;
  status: string;
  description: string | null;
  speaker_count: number | null;
  created_at: string;
};

export type QuizImage = {
  id: string;
  image_path: string;
  category: string | null;
  label_hint: string | null;
  sort_order: number;
};

export type DictionaryEntry = {
  id: string;
  language_id: string;
  term: string;
  translation: string | null;
  definition: string | null;
  example: string | null;
  source: string;
  audio_url: string | null;
  image_url: string | null;
  created_at: string;
};

export type DocumentRow = {
  id: string;
  language_id: string;
  filename: string;
  storage_path: string | null;
  mime: string | null;
  status: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  language_id: string;
  role: "user" | "model";
  content: string;
  created_at: string;
};
