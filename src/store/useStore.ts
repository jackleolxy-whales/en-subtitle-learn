import { useState, useCallback } from 'react';
import type { LearningProgress } from '../types';

const STORAGE_KEY = 'en-subtitle-learn-progress';

function loadProgress(): Record<number, LearningProgress> {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch {
    return {};
  }
}

function saveProgress(progress: Record<number, LearningProgress>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

export function useLearningProgress() {
  const [progressMap, setProgressMap] = useState<Record<number, LearningProgress>>(loadProgress);

  const getProgress = useCallback(
    (episodeId: number): LearningProgress => {
      return (
        progressMap[episodeId] || {
          episode_id: episodeId,
          completed: false,
          last_position: 0,
          sentence_listen_counts: {},
          favorited_words: [],
          total_listen_time: 0,
        }
      );
    },
    [progressMap],
  );

  const updateProgress = useCallback(
    (episodeId: number, update: Partial<LearningProgress>) => {
      setProgressMap((prev) => {
        const current = prev[episodeId] || {
          episode_id: episodeId,
          completed: false,
          last_position: 0,
          sentence_listen_counts: {},
          favorited_words: [],
          total_listen_time: 0,
        };
        const next = { ...prev, [episodeId]: { ...current, ...update } };
        saveProgress(next);
        return next;
      });
    },
    [],
  );

  const toggleWordFavorite = useCallback(
    (episodeId: number, word: string) => {
      const progress = getProgress(episodeId);
      const words = progress.favorited_words.includes(word)
        ? progress.favorited_words.filter((w) => w !== word)
        : [...progress.favorited_words, word];
      updateProgress(episodeId, { favorited_words: words });
    },
    [getProgress, updateProgress],
  );

  const stats = {
    total: 0,
    completed: 0,
    uncompleted: 0,
    favoriteWords: 0,
  };

  Object.values(progressMap).forEach((p) => {
    stats.total++;
    if (p.completed) stats.completed++;
    else stats.uncompleted++;
    stats.favoriteWords += p.favorited_words.length;
  });

  return { progressMap, getProgress, updateProgress, toggleWordFavorite, stats };
}
