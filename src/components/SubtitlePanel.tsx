import { useRef, useEffect, useState, useCallback, forwardRef } from 'react';
import type { Sentence, Keyword } from '../types';
import { Star, Volume2, MessageCircle, Briefcase, Zap, Hash } from 'lucide-react';

interface SubtitlePanelProps {
  sentences: Sentence[];
  currentSentenceIndex: number;
  onSentenceClick: (sentence: Sentence) => void;
  favoritedWords: string[];
  onToggleWordFavorite: (word: string) => void;
}

export function SubtitlePanel({
  sentences,
  currentSentenceIndex,
  onSentenceClick,
  favoritedWords,
  onToggleWordFavorite,
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
      className="bg-surface rounded-2xl border border-white/5 overflow-hidden flex-1 min-h-0 flex flex-col"
    >
      <div className="px-5 py-3 border-b border-white/5 flex items-center justify-between shrink-0">
        <h3 className="text-sm font-semibold text-text-secondary">逐句字幕</h3>
        <span className="text-xs text-text-muted">
          {currentSentenceIndex >= 0 ? currentSentenceIndex + 1 : '-'} / {sentences.length}
        </span>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0 p-3 space-y-1">
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
}

const SentenceRow = forwardRef<HTMLDivElement, SentenceRowProps>(
  ({ sentence, index, isActive, onSentenceClick, favoritedWords, onToggleWordFavorite }, ref) => {
    const [expandedKeyword, setExpandedKeyword] = useState<string | null>(null);
    const [showExpressions, setShowExpressions] = useState(false);

    const toggleKeyword = useCallback((word: string) => {
      setExpandedKeyword((prev) => (prev === word ? null : word));
    }, []);

    const hasExpressions =
      sentence.rewrite_casual || sentence.rewrite_formal || sentence.rewrite_short;
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
            className="relative inline-block px-0.5 mx-0.5 rounded bg-highlight/20 text-highlight font-medium hover:bg-highlight/30 transition-colors cursor-pointer"
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
        className={`group rounded-xl px-4 py-3 cursor-pointer transition-all duration-200 ${
          isActive
            ? 'bg-primary/15 border border-primary/30 shadow-sm shadow-primary/10'
            : 'hover:bg-surface-light/50 border border-transparent'
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
          </div>

          <div className="flex-1 min-w-0">
            <p
              className={`text-sm leading-relaxed ${
                isActive ? 'text-text-primary font-medium' : 'text-text-primary/80'
              }`}
            >
              {isActive && (
                <Volume2 className="w-3.5 h-3.5 inline-block mr-1.5 text-primary-light animate-pulse" />
              )}
              {renderEnglishWithKeywords(sentence.english, sentence.keywords)}
            </p>

            {sentence.chinese && (
              <p className="text-xs text-text-muted mt-1 leading-relaxed">{sentence.chinese}</p>
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

            {/* Expression toggle */}
            {hasExpressions && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowExpressions((v) => !v);
                }}
                className={`mt-1.5 flex items-center gap-1 text-[11px] font-medium transition-colors ${
                  showExpressions ? 'text-primary-light' : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Zap className="w-3 h-3" />
                口语化表达
              </button>
            )}

            {/* Expressions panel */}
            {showExpressions && hasExpressions && (
              <div className="mt-2 space-y-1.5 p-2.5 rounded-lg bg-surface-lighter/30 border border-white/5">
                {sentence.rewrite_casual && (
                  <ExpressionRow
                    icon={<MessageCircle className="w-3 h-3 text-green-400" />}
                    label="更口语"
                    text={sentence.rewrite_casual}
                  />
                )}
                {sentence.rewrite_formal && (
                  <ExpressionRow
                    icon={<Briefcase className="w-3 h-3 text-blue-400" />}
                    label="更正式"
                    text={sentence.rewrite_formal}
                  />
                )}
                {sentence.rewrite_short && (
                  <ExpressionRow
                    icon={<Zap className="w-3 h-3 text-accent" />}
                    label="更简短"
                    text={sentence.rewrite_short}
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

function ExpressionRow({ icon, label, text }: { icon: React.ReactNode; label: string; text: string }) {
  return (
    <div className="flex items-start gap-2">
      <div className="flex items-center gap-1 mt-0.5 shrink-0">
        {icon}
        <span className="text-[10px] text-text-muted w-8">{label}</span>
      </div>
      <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
    </div>
  );
}
