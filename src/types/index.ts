export interface Episode {
  episode_id: number;
  title: string;
  title_en: string;
  duration: number;
  accent: string;
  gender: string;
  difficulty: number;
  word_count: number;
  sentence_count: number;
  tags: string[];
  category: string;
  publish_date: string;
  cover_url: string;
  video_url: string;
  source_type?: 'youtube' | 'local' | 'sample';
  source_url?: string;
  video_id?: string;
  channel?: string;
  thumbnail?: string;
  transcript_source?: 'official' | 'auto' | 'asr';
  sentences?: Sentence[];
  completed?: boolean;
  favorited?: boolean;
  last_position?: number;
}

export interface Sentence {
  sentence_id: number;
  start_time: number;
  end_time: number;
  english: string;
  chinese: string;
  keywords: Keyword[];
  rewrite_casual?: string;
  rewrite_formal?: string;
  rewrite_short?: string;
  discourse_markers?: DiscourseMarker[];
  scenario_tags?: string[];
}

export interface Keyword {
  word: string;
  phonetic?: string;
  pos: string;
  meaning: string;
}

export interface DiscourseMarker {
  marker: string;
  category: string;
}

export interface LearningProgress {
  episode_id: number;
  completed: boolean;
  last_position: number;
  sentence_listen_counts: Record<number, number>;
  favorited_words: string[];
  total_listen_time: number;
}

export interface YouTubeVideoInfo {
  video_id: string;
  title: string;
  channel: string;
  duration: number;
  thumbnail: string;
  subtitle_hint: 'official' | 'auto' | 'none';
}

export type SortOrder = 'asc' | 'desc';
export type AccentFilter = 'all' | 'American' | 'British';
export type GenderFilter = 'all' | 'male' | 'female';
export type CategoryFilter = 'all' | string;
export type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

export interface FilterState {
  sortOrder: SortOrder;
  difficulty: number | null;
  gender: GenderFilter;
  accent: AccentFilter;
  category: CategoryFilter;
}
