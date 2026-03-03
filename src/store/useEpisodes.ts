import { useState, useEffect, useCallback } from 'react';
import type { Episode } from '../types';
import { episodes as sampleEpisodes } from '../data/episodes';
import { fetchEpisodes } from '../api';

const STORAGE_KEY = 'en-subtitle-imported-episodes';

function loadImported(): Episode[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveImported(episodes: Episode[]) {
  const toStore = episodes.map(({ sentences, ...rest }) => rest);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}

export function useEpisodes() {
  const [importedEpisodes, setImportedEpisodes] = useState<Episode[]>(loadImported);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchEpisodes()
      .then((serverEpisodes) => {
        if (serverEpisodes.length > 0) {
          setImportedEpisodes((prev) => {
            const merged = [...serverEpisodes];
            for (const local of prev) {
              if (!merged.find((e) => e.episode_id === local.episode_id)) {
                merged.push(local);
              }
            }
            saveImported(merged);
            return merged;
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const addEpisode = useCallback((episode: Episode) => {
    setImportedEpisodes((prev) => {
      const filtered = prev.filter((e) => e.episode_id !== episode.episode_id);
      const next = [episode, ...filtered];
      saveImported(next);
      return next;
    });
  }, []);

  const allEpisodes = [
    ...importedEpisodes,
    ...sampleEpisodes.filter(
      (s) => !importedEpisodes.find((i) => i.episode_id === s.episode_id),
    ),
  ];

  return { allEpisodes, importedEpisodes, addEpisode, loading };
}
