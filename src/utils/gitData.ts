import type { LearningProgress, Episode, SavedPhraseCard } from '../types';

const STORAGE_KEYS = {
  progress: 'en-subtitle-learn-progress',
  episodes: 'en-subtitle-imported-episodes',
  phrases: 'en-subtitle-pm-phrases',
} as const;

export const GIT_DATA_VERSION = 1;

export interface GitDataExport {
  version: number;
  exportedAt: string;
  progress: Record<number, LearningProgress>;
  episodes: Episode[];
  phrases: SavedPhraseCard[];
}

export function exportGitData(): GitDataExport {
  const progressRaw = localStorage.getItem(STORAGE_KEYS.progress);
  const episodesRaw = localStorage.getItem(STORAGE_KEYS.episodes);
  const phrasesRaw = localStorage.getItem(STORAGE_KEYS.phrases);

  const progress: Record<number, LearningProgress> = progressRaw ? JSON.parse(progressRaw) : {};
  const episodes: Episode[] = episodesRaw ? JSON.parse(episodesRaw) : [];
  const phrases: SavedPhraseCard[] = phrasesRaw ? JSON.parse(phrasesRaw) : [];

  return {
    version: GIT_DATA_VERSION,
    exportedAt: new Date().toISOString(),
    progress,
    episodes,
    phrases,
  };
}

export function exportGitDataAsFile(): void {
  const data = exportGitData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `learn-data-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importGitData(data: GitDataExport): { success: boolean; error?: string } {
  try {
    if (typeof data.version !== 'number' || data.version > GIT_DATA_VERSION) {
      return { success: false, error: '不支持的数据版本' };
    }

    if (data.progress && typeof data.progress === 'object') {
      localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(data.progress));
    }
    if (Array.isArray(data.episodes)) {
      localStorage.setItem(STORAGE_KEYS.episodes, JSON.stringify(data.episodes));
    }
    if (Array.isArray(data.phrases)) {
      localStorage.setItem(STORAGE_KEYS.phrases, JSON.stringify(data.phrases));
    }

    return { success: true };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : '导入失败',
    };
  }
}

export function importGitDataFromFile(file: File): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const data = JSON.parse(text) as GitDataExport;
        const result = importGitData(data);
        resolve(result);
      } catch (e) {
        resolve({
          success: false,
          error: e instanceof Error ? e.message : '文件解析失败',
        });
      }
    };
    reader.onerror = () => resolve({ success: false, error: '文件读取失败' });
    reader.readAsText(file, 'utf-8');
  });
}
