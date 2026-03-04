export interface PMPackPhrase {
  text: string;
  original: string;
  intent: string;
  sentence_id: number;
}

export interface PMPack {
  meeting_phrases: PMPackPhrase[];
  slack_phrases: PMPackPhrase[];
  doc_phrases: PMPackPhrase[];
  connectors: string[];
  total_transferable: number;
}

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
  pm_phrase_count?: number;
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
  pm_pack?: PMPack;
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
  pm_meeting?: string;
  pm_slack?: string;
  pm_doc?: string;
  intent_tag?: string;
  discourse_markers?: DiscourseMarker[];
  scenario_tags?: string[];
  transferability?: number;
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

export interface SavedPhraseCard {
  id: string;
  english: string;
  type: 'meeting' | 'slack' | 'doc';
  intent: string;
  original: string;
  episode_id: number;
  episode_title: string;
  sentence_id: number;
  saved_at: number;
  tags: string[];
}

export interface LearningProgress {
  episode_id: number;
  completed: boolean;
  last_position: number;
  sentence_listen_counts: Record<number, number>;
  favorited_words: string[];
  total_listen_time: number;
}

export interface PMWorkStats {
  saved_phrases_this_week: number;
  sentences_read_this_week: number;
  recaps_this_week: number;
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
export type PMScenarioFilter = 'all' | 'meeting' | 'slack' | 'document' | 'negotiation' | 'alignment' | 'pushback';
export type PlaybackRate = 0.75 | 1 | 1.25 | 1.5;

export interface FilterState {
  sortOrder: SortOrder;
  difficulty: number | null;
  gender: GenderFilter;
  accent: AccentFilter;
  category: CategoryFilter;
  pmScenario: PMScenarioFilter;
}
