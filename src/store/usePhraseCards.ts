import { useState, useCallback, useMemo } from 'react';
import type { SavedPhraseCard } from '../types';

const STORAGE_KEY = 'en-subtitle-pm-phrases';

function loadCards(): SavedPhraseCard[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveCards(cards: SavedPhraseCard[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

export function usePhraseCards() {
  const [cards, setCards] = useState<SavedPhraseCard[]>(loadCards);

  const addCard = useCallback((card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => {
    setCards((prev) => {
      const exists = prev.find(
        (c) => c.english === card.english && c.type === card.type && c.sentence_id === card.sentence_id,
      );
      if (exists) return prev;
      const newCard: SavedPhraseCard = {
        ...card,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        saved_at: Date.now(),
      };
      const next = [newCard, ...prev];
      saveCards(next);
      return next;
    });
  }, []);

  const removeCard = useCallback((id: string) => {
    setCards((prev) => {
      const next = prev.filter((c) => c.id !== id);
      saveCards(next);
      return next;
    });
  }, []);

  const isCardSaved = useCallback(
    (english: string, type: string, sentenceId: number) => {
      return cards.some((c) => c.english === english && c.type === type && c.sentence_id === sentenceId);
    },
    [cards],
  );

  const weekStats = useMemo(() => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return cards.filter((c) => c.saved_at >= weekAgo).length;
  }, [cards]);

  return { cards, addCard, removeCard, isCardSaved, weekStats };
}
