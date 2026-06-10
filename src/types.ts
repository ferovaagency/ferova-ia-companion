export type BookStatus = "TBR" | "READING" | "READ";

export interface Book {
  id: string;
  user_id: string;
  title: string;
  author: string;
  genre: string;
  pages: number;
  moods: string[];
  series_name: string | null;
  series_index: number | null;
  status: BookStatus;
  cover_url: string | null;
  description: string;
  current_page: number;
  started_reading_at: string | null;
  finished_reading_at: string | null;
  reading_speed_days: number | null;
  created_at: string;
  updated_at: string;
}

export interface EnrichedBook {
  title: string;
  author: string;
  genre: string;
  pages: number;
  moods: string[];
  series_name?: string | null;
  series_index?: number | null;
  description: string;
  cover_url?: string | null;
}

export interface RecommendationResult {
  bookId?: string | null;
  external?: {
    title: string;
    author: string;
    genre?: string;
    pages?: number;
    moods?: string[];
    cover_url?: string | null;
    description?: string;
  } | null;
  reasoning: string;
  errorType?: "PERMISSION_DENIED" | "QUOTA_EXHAUSTED" | "GENERIC";
  errorMessage?: string;
}