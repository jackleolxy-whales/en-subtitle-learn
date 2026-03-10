import type {
  Sentence,
  Episode,
  YouTubeVideoInfo,
  SpeechAssessment,
  RecapAssessment,
  PMSentence,
  DailySentenceRecord,
} from '../types';

const API_BASE = 'http://localhost:8000';

function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  if (err instanceof Error) {
    return err.message === 'Failed to fetch' || err.message.includes('NetworkError');
  }
  return false;
}

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
  try {
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
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('无法连接后端服务，请先运行 npm run server 启动 API 服务');
    }
    throw err;
  }
}

export async function importYouTube(
  url: string,
  generateTranslation: boolean = true,
  generateExpressions: boolean = true,
): Promise<Episode> {
  try {
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
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('无法连接后端服务，请先运行 npm run server 启动 API 服务');
    }
    throw err;
  }
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

export async function assessSpeech(
  audioBlob: Blob,
  originalSentence: string,
  modelSize: string = 'base',
): Promise<SpeechAssessment> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recording.webm');
  formData.append('original_sentence', originalSentence);
  formData.append('model_size', modelSize);

  try {
    const res = await fetch(`${API_BASE}/api/speech/assess`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('无法连接后端服务，请先运行 npm run server 启动 API 服务');
    }
    throw err;
  }
}

export async function assessRecap(
  audioBlob: Blob,
  referenceText: string,
  modelSize: string = 'base',
): Promise<RecapAssessment> {
  const formData = new FormData();
  formData.append('audio', audioBlob, 'recap.webm');
  formData.append('reference_text', referenceText);
  formData.append('model_size', modelSize);

  try {
    const res = await fetch(`${API_BASE}/api/speech/recap`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(err.detail || `HTTP ${res.status}`);
    }

    return res.json();
  } catch (err) {
    if (isNetworkError(err)) {
      throw new Error('无法连接后端服务，请先运行 npm run server 启动 API 服务');
    }
    throw err;
  }
}

// --- Daily 10 PM Sentences ---

export interface Daily10Response {
  sentences: PMSentence[];
}

export async function fetchDaily10(): Promise<Daily10Response> {
  const res = await fetch(`${API_BASE}/api/daily10`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `获取 Daily 10 失败 (HTTP ${res.status})`);
  }
  return res.json();
}

export async function recordDailySentence(input: DailySentenceRecord): Promise<void> {
  const res = await fetch(`${API_BASE}/api/daily10/record`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail || `记录 Daily 10 进度失败 (HTTP ${res.status})`);
  }
}
