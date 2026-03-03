import type { Sentence, Episode, YouTubeVideoInfo } from '../types';

const API_BASE = 'http://localhost:8000';

export interface TranscribeResponse {
  sentences: Sentence[];
  duration: number;
  word_count: number;
  language: string;
}

export async function transcribeVideo(
  videoUrl: string,
  modelSize: string = 'base',
): Promise<TranscribeResponse> {
  const res = await fetch(`${API_BASE}/api/transcribe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ video_url: videoUrl, model_size: modelSize }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchYouTubeInfo(url: string): Promise<YouTubeVideoInfo> {
  const res = await fetch(`${API_BASE}/api/youtube/info`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function importYouTube(
  url: string,
  generateTranslation: boolean = true,
  generateExpressions: boolean = true,
): Promise<Episode> {
  const res = await fetch(`${API_BASE}/api/youtube/import`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url,
      generate_translation: generateTranslation,
      generate_expressions: generateExpressions,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

export async function fetchEpisodes(): Promise<Episode[]> {
  const res = await fetch(`${API_BASE}/api/episodes`);
  if (!res.ok) return [];
  return res.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
