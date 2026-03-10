import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';
import type { Sentence, Keyword, SavedPhraseCard } from '../types';
import { Star, Volume2, Briefcase, Hash, Copy, Bookmark, Check, ChevronDown, ChevronUp, Video, MessageSquare, FileText } from 'lucide-react';

interface SubtitlePanelProps {
  sentences: Sentence[];
  currentSentenceIndex: number;
  onSentenceClick: (sentence: Sentence) => void;
  favoritedWords: string[];
  onToggleWordFavorite: (word: string) => void;
  onSavePhrase?: (card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => void;
  isPhraseCardSaved?: (english: string, type: string, sentenceId: number) => boolean;
  episodeId?: number;
  episodeTitle?: string;
}

export function SubtitlePanel({
  sentences,
  currentSentenceIndex,
  onSentenceClick,
  favoritedWords,
  onToggleWordFavorite,
  onSavePhrase,
  isPhraseCardSaved,
  episodeId = 0,
  episodeTitle = '',
}: SubtitlePanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sentenceRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (currentSentenceIndex >= 0 && sentenceRefs.current[currentSentenceIndex]) {
      sentenceRefs.current[currentSentenceIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });
    }
  }, [currentSentenceIndex]);

  return (
    <div
      ref={containerRef}
      className="glass rounded-2xl overflow-hidden flex-1 min-h-0 flex flex-col"
    >
      <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold font-display text-text-secondary">逐句字幕</h3>
        <span className="text-xs text-text-muted px-2 py-1 rounded-lg glass-light">
          {currentSentenceIndex >= 0 ? currentSentenceIndex + 1 : '-'} / {sentences.length}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-4 space-y-2">
        {sentences.map((sentence, index) => (
          <SentenceRow
            key={sentence.sentence_id}
            ref={(el) => {
              sentenceRefs.current[index] = el;
            }}
            sentence={sentence}
            index={index}
            isActive={index === currentSentenceIndex}
            onSentenceClick={onSentenceClick}
            favoritedWords={favoritedWords}
            onToggleWordFavorite={onToggleWordFavorite}
            onSavePhrase={onSavePhrase}
            isPhraseCardSaved={isPhraseCardSaved}
            episodeId={episodeId}
            episodeTitle={episodeTitle}
          />
        ))}
      </div>
    </div>
  );
}

interface SentenceRowProps {
  sentence: Sentence;
  index: number;
  isActive: boolean;
  onSentenceClick: (sentence: Sentence) => void;
  favoritedWords: string[];
  onToggleWordFavorite: (word: string) => void;
  onSavePhrase?: (card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => void;
  isPhraseCardSaved?: (english: string, type: string, sentenceId: number) => boolean;
  episodeId: number;
  episodeTitle: string;
}

const SentenceRow = forwardRef<HTMLDivElement, SentenceRowProps>(
  ({ sentence, index, isActive, onSentenceClick, favoritedWords, onToggleWordFavorite, onSavePhrase, isPhraseCardSaved, episodeId, episodeTitle }, ref) => {
    const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
    const [showPMWork, setShowPMWork] = useState(false);

    const toggleKeyword = useCallback((word: string) => {
      setExpandedKeyword((prev) => (prev === word ? null : word));
    }, []);

    const hasPM = sentence.pm_meeting || sentence.pm_slack || sentence.pm_doc;
    const hasMarkers = sentence.discourse_markers && sentence.discourse_markers.length > 0;
    const hasTags = sentence.scenario_tags && sentence.scenario_tags.length > 0;

    function formatTime(seconds: number) {
      const m = Math.floor(seconds / 60);
      const s = Math.floor(seconds % 60);
      return `${m}:${s.toString().padStart(2, '0')}`;
    }

    function renderEnglishWithKeywords(text: string, keywords: Keyword[]) {
      if (keywords.length === 0) return <span>{text}</span>;

      const parts: React.ReactNode[] = [];
      let lastIndex = 0;
      const lowerText = text.toLowerCase();

      const sortedKeywords = [...keywords].sort((a, b) => {
        const aIdx = lowerText.indexOf(a.word.toLowerCase());
        const bIdx = lowerText.indexOf(b.word.toLowerCase());
        return aIdx - bIdx;
      });

      for (const kw of sortedKeywords) {
        const kwLower = kw.word.toLowerCase();
        const idx = lowerText.indexOf(kwLower, lastIndex);
        if (idx === -1) continue;

        if (idx > lastIndex) {
          parts.push(<span key={`text-${lastIndex}`}>{text.slice(lastIndex, idx)}</span>);
        }

        const originalWord = text.slice(idx, idx + kw.word.length);
        parts.push(
          <button
            key={`kw-${kw.word}`}
            onClick={(e) => {
              e.stopPropagation();
              toggleKeyword(kw.word);
            }}
            className="relative inline-block px-1 mx-0.5 rounded-lg bg-gradient-to-r from-accent/20 to-orange-400/20 text-accent-light font-medium hover:from-accent/30 hover:to-orange-400/30 transition-all cursor-pointer border border-accent/20 hover:border-accent/40"
          >
            {originalWord}
          </button>,
        );

        lastIndex = idx + kw.word.length;
      }

      if (lastIndex < text.length) {
        parts.push(<span key={`text-end`}>{text.slice(lastIndex)}</span>);
      }

      return <>{parts}</>;
    }

    const activeKeyword = sentence.keywords.find((kw) => kw.word === expandedKeyword);

    return (
      <div
        ref={ref}
        onClick={() => onSentenceClick(sentence)}
        className={`group rounded-xl px-4 py-3 cursor-pointer transition-all duration-300 ${
          isActive
            ? 'bg-gradient-to-r from-primary/20 to-purple-500/10 border border-primary/30 shadow-md shadow-primary/10 hover-lift'
            : 'glass-light hover:bg-white/10 border border-transparent hover:border-white/10'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <span className="text-[10px] text-text-muted font-mono w-6 text-center">
              {index + 1}
            </span>
            <span className="text-[10px] text-text-muted font-mono">
              {formatTime(sentence.start_time)}
            </span>
            {(sentence.transferability ?? 0) >= 0.3 && (
              <span className="text-[9px] text-primary-light bg-primary/10 px-1 rounded">
                PM
              </span>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm leading-relaxed ${
                isActive ? 'text-text-primary font-semibold' : 'text-text-primary/80'
              }`}
            >
              {isActive && (
                <Volume2 className="w-3.5 h-3.5 inline-block mr-1.5 text-primary-light animate-pulse-subtle" />
              )}
              {renderEnglishWithKeywords(sentence.english, sentence.keywords)}
            </p>

            {sentence.chinese && (
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{sentence.chinese}</p>
            )}

            {/* Intent tag */}
            {sentence.intent_tag && (
              <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-300 text-[10px] font-medium">
                {sentence.intent_tag}
              </span>
            )}

            {/* Discourse markers inline */}
            {hasMarkers && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {sentence.discourse_markers!.map((dm, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 text-[10px] font-medium">
                    {dm.marker}
                  </span>
                ))}
              </div>
            )}

            {/* Scenario tags */}
            {hasTags && (
              <div className="flex flex-wrap gap-1 mt-1">
                {sentence.scenario_tags!.map((tag, i) => (
                  <span key={i} className="px-1.5 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-medium flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{tag}
                  </span>
                ))}
              </div>
            )}

            {/* PM Work toggle button */}
            {hasPM && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowPMWork((v) => !v);
                }}
                className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  showPMWork ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Briefcase className="w-3 h-3" />
                Work
                {showPMWork ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            )}

            {/* PM Work drawer */}
            {showPMWork && hasPM && (
              <div className="mt-3 space-y-3 p-4 rounded-xl glass-light border border-white/10">
                {sentence.pm_meeting && (
                  <PMExpressionRow
                    icon={<Video className="w-3.5 h-3.5 text-green-400" />}
                    label="会议"
                    text={sentence.pm_meeting}
                    type="meeting"
                    sentence={sentence}
                    onSave={onSavePhrase}
                    isSaved={isPhraseCardSaved}
                    episodeId={episodeId}
                    episodeTitle={episodeTitle}
                  />
                )}
                {sentence.pm_slack && (
                  <PMExpressionRow
                    icon={<MessageSquare className="w-3.5 h-3.5 text-yellow-400" />}
                    label="沟通"
                    text={sentence.pm_slack}
                    type="slack"
                    sentence={sentence}
                    onSave={onSavePhrase}
                    isSaved={isPhraseCardSaved}
                    episodeId={episodeId}
                    episodeTitle={episodeTitle}
                  />
                )}
                {sentence.pm_doc && (
                  <PMExpressionRow
                    icon={<FileText className="w-3.5 h-3.5 text-blue-400" />}
                    label="文档"
                    text={sentence.pm_doc}
                    type="doc"
                    sentence={sentence}
                    onSave={onSavePhrase}
                    isSaved={isPhraseCardSaved}
                    episodeId={episodeId}
                    episodeTitle={episodeTitle}
                  />
                )}
              </div>
            )}

            {/* Keyword detail */}
            {activeKeyword && (
              <div className="mt-2 p-2.5 rounded-lg bg-surface-lighter/50 border border-white/5">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-highlight">{activeKeyword.word}</span>
                    {activeKeyword.phonetic && (
                      <span className="text-xs text-text-muted ml-2">{activeKeyword.phonetic}</span>
                    )}
                    {activeKeyword.pos && (
                      <span className="text-xs text-text-muted ml-2">{activeKeyword.pos}</span>
                    )}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleWordFavorite(activeKeyword.word);
                    }}
                    className="p-1 rounded hover:bg-surface-light transition-colors"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        favoritedWords.includes(activeKeyword.word)
                          ? 'text-accent fill-accent'
                          : 'text-text-muted'
                      }`}
                    />
                  </button>
                </div>
                {activeKeyword.meaning && (
                  <p className="text-xs text-text-secondary mt-1">{activeKeyword.meaning}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

SentenceRow.displayName = 'SentenceRow';


function PMExpressionRow({
  icon,
  label,
  text,
  type,
  sentence,
  onSave,
  isSaved,
  episodeId,
  episodeTitle,
}: {
  icon: React.ReactNode;
  label: string;
  text: string;
  type: 'meeting' | 'slack' | 'doc';
  sentence: Sentence;
  onSave?: (card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => void;
  isSaved?: (english: string, type: string, sentenceId: number) => boolean;
  episodeId: number;
  episodeTitle: string;
}) {
  const [copied, setCopied] = useState(false);
  const saved = isSaved?.(text, type, sentence.sentence_id) ?? false;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSave?.({
      english: text,
      type,
      intent: sentence.intent_tag || '',
      original: sentence.english,
      episode_id: episodeId,
      episode_title: episodeTitle,
      sentence_id: sentence.sentence_id,
      tags: sentence.scenario_tags || [],
    });
  };

  return (
    <div className="flex items-start gap-2 group/expr">
      <div className="flex items-center gap-1 mt-0.5 shrink-0">
        {icon}
        <span className="text-[10px] text-text-muted w-12 font-medium">{label}</span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed flex-1">{text}</p>
      <div className="flex items-center gap-1 opacity-0 group-hover/expr:opacity-100 transition-opacity shrink-0">
        <button
          onClick={handleCopy}
          className="p-1 rounded hover:bg-surface-light transition-colors"
          title="复制"
        >
          {copied ? (
            <Check className="w-3 h-3 text-success" />
          ) : (
            <Copy className="w-3 h-3 text-text-muted hover:text-text-primary" />
          )}
        </button>
        <button
          onClick={handleSave}
          className="p-1 rounded hover:bg-surface-light transition-colors"
          title="保存到话术库"
        >
          <Bookmark
            className={`w-3 h-3 ${saved ? 'text-accent fill-accent' : 'text-text-muted hover:text-accent'}`}
          />
        </button>
      </div>
    </div>
  );
}
