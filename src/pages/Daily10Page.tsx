import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PMSentence, SpeechAssessment, DailySentenceRecord, Sentence } from '../types';
import { fetchDaily10, recordDailySentence } from '../api';
import { getDaily10FromLocal } from '../data/pmSentences';
import { DailyProgressBar } from '../components/DailyProgressBar';
import { DailySentenceCard } from '../components/DailySentenceCard';
import { DailyCompletion } from '../components/DailyCompletion';
import { ShadowingCoach } from '../components/ShadowingCoach';
import { AlertCircle, Loader2, RefreshCw, Volume2, Mic } from 'lucide-react';

interface ScoreEntry {
  sentence_id: number;
  pronunciation_score: number;
  fluency_score: number;
  rhythm_score: number;
}

const TOTAL_SENTENCES = 10;

export function Daily10Page() {
  const navigate = useNavigate();
  const [sentences, setSentences] = useState<PMSentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [scores, setScores] = useState<ScoreEntry[]>([]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [usedFallback, setUsedFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      setUsedFallback(false);
      try {
        const res = await fetchDaily10();
        if (!cancelled) {
          setSentences(res.sentences.slice(0, TOTAL_SENTENCES));
          setCurrentIndex(0);
          setScores([]);
          setShowCompletion(false);
        }
      } catch (err) {
        if (!cancelled) {
          const fallback = getDaily10FromLocal();
          setSentences(fallback);
          setCurrentIndex(0);
          setScores([]);
          setShowCompletion(false);
          setUsedFallback(true);
          setError(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const currentSentence = sentences[currentIndex] ?? null;

  const currentForShadow: Sentence | null = useMemo(() => {
    if (!currentSentence) return null;
    return {
      sentence_id: currentSentence.id,
      start_time: 0,
      end_time: 0,
      english: currentSentence.english,
      chinese: currentSentence.chinese,
      keywords: [],
      pm_meeting: '',
      pm_slack: '',
      pm_doc: '',
      intent_tag: '',
      discourse_markers: [],
      scenario_tags: [],
      transferability: 0,
    };
  }, [currentSentence]);

  const completedCount = useMemo(
    () => Math.min(currentIndex + (showCompletion ? 1 : 0), sentences.length || TOTAL_SENTENCES),
    [currentIndex, showCompletion, sentences.length],
  );

  const averagePronunciation = useMemo(() => {
    if (scores.length === 0) return null;
    const sum = scores.reduce((acc, s) => acc + s.pronunciation_score, 0);
    return sum / scores.length;
  }, [scores]);

  const handleNext = () => {
    if (currentIndex >= sentences.length - 1 || currentIndex >= TOTAL_SENTENCES - 1) {
      setShowCompletion(true);
      return;
    }
    setCurrentIndex((i) => i + 1);
  };

  const handleAssessmentComplete = async (assessment: SpeechAssessment) => {
    if (!currentSentence) return;
    setScores((prev) => {
      const others = prev.filter((s) => s.sentence_id !== currentSentence.id);
      return [
        ...others,
        {
          sentence_id: currentSentence.id,
          pronunciation_score: assessment.pronunciation_score,
          fluency_score: assessment.fluency_score,
          rhythm_score: assessment.rhythm_score,
        },
      ];
    });

    const record: DailySentenceRecord = {
      user_id: 'guest',
      sentence_id: currentSentence.id,
      date: new Date().toISOString().slice(0, 10),
      shadowing_score: assessment.pronunciation_score,
      completed: true,
    };

    try {
      await recordDailySentence(record);
    } catch {
      // 记录失败不阻塞前端体验，静默忽略
    }
  };

  const handlePlayAudio = async () => {
    if (!currentSentence?.audio_url) return;
    try {
      setIsPlayingAudio(true);
      const audio = new Audio(currentSentence.audio_url);
      audio.onended = () => setIsPlayingAudio(false);
      audio.onerror = () => setIsPlayingAudio(false);
      await audio.play();
    } catch {
      setIsPlayingAudio(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl px-10 py-8 flex flex-col items-center gap-4">
          <Loader2 className="w-7 h-7 text-primary animate-spin" />
          <p className="text-sm text-text-secondary">正在为你准备今天的 10 句 PM 英语...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass rounded-2xl px-10 py-8 flex flex-col items-center gap-4 max-w-md text-center">
          <AlertCircle className="w-8 h-8 text-danger" />
          <p className="text-sm text-text-secondary">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-dark transition-all hover-lift active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            重试加载
          </button>
        </div>
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <DailyCompletion
          total={sentences.length || TOTAL_SENTENCES}
          averageScore={averagePronunciation}
          onReturnHome={() => navigate('/')}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-black/5 glass sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.22em] text-text-muted">
              Daily 10 · PM English
            </p>
            <h1 className="text-xl font-semibold text-text-primary mt-1">
              每日十句 · 产品经理工作英语
            </h1>
          </div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-text-muted hover:text-text-primary transition-colors"
          >
            返回首页
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-6">
        {usedFallback && (
          <div className="rounded-xl bg-primary/10 border border-primary/20 px-4 py-2.5 flex items-center gap-2 text-sm text-primary-light">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>当前使用本地句子库（未连接后端）。跟读 AI 打分需先运行 <code className="text-xs bg-black/10 px-1 rounded">npm run server</code>。</span>
          </div>
        )}
        <DailyProgressBar current={currentIndex + 1} total={TOTAL_SENTENCES} />

        {currentSentence && (
          <div className="space-y-4">
            <DailySentenceCard
              sentence={currentSentence}
              index={currentIndex}
              total={TOTAL_SENTENCES}
            />

            <div className="grid md:grid-cols-[minmax(0,2fr)_minmax(0,2.2fr)] gap-4 items-stretch">
              <div className="glass rounded-2xl p-4 space-y-3">
                <p className="text-[11px] text-text-muted uppercase tracking-[0.18em]">
                  Audio & Shadowing
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={handlePlayAudio}
                    disabled={!currentSentence.audio_url}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-light/70 text-sm text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Volume2 className="w-4 h-4" />
                    Play Audio
                  </button>
                  <div className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/12 text-[11px] text-primary-light">
                    <Mic className="w-3.5 h-3.5" />
                    Shadowing with AI Coach
                  </div>
                </div>
                {!currentSentence.audio_url && (
                  <p className="text-[11px] text-text-muted">
                    当前版本暂未提供录制音频，推荐直接使用下方 AI 跟读教练练习发音。
                  </p>
                )}
              </div>

              <ShadowingCoach
                key={currentSentence.id}
                sentence={currentForShadow}
                onAssessmentComplete={handleAssessmentComplete}
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleNext}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium shadow-primary hover:bg-primary-dark transition-all hover-lift active:scale-95"
              >
                下一句
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

