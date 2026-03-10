import React from 'react';
import type { PMSentence } from '../types';
import { MessageSquare, BookOpen, Tag } from 'lucide-react';

interface DailySentenceCardProps {
  sentence: PMSentence;
  index: number;
  total: number;
}

export function DailySentenceCard({ sentence, index, total }: DailySentenceCardProps) {
  return (
    <div className="glass rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary-light font-semibold text-[11px]">
            {index + 1}
          </span>
          <span>
            Sentence {index + 1} / {total}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
          <Tag className="w-3.5 h-3.5" />
          <span className="capitalize">{sentence.category}</span>
          <span className="mx-1 text-text-disabled">·</span>
          <span className="uppercase tracking-[0.16em] text-xs">
            {sentence.difficulty}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-base leading-relaxed text-text-primary font-medium">
          {sentence.english}
        </p>
        <p className="text-sm text-text-secondary">{sentence.chinese}</p>
      </div>

      <div className="rounded-xl bg-surface-light/60 border border-border-subtle/40 px-3 py-2.5 flex items-start gap-2">
        <MessageSquare className="w-4 h-4 mt-0.5 text-primary-light shrink-0" />
        <div>
          <p className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em]">
            Usage
          </p>
          <p className="text-xs text-text-secondary mt-0.5">
            {sentence.category === 'meeting' && 'Meeting · Requirement discussion'}
            {sentence.category === 'alignment' && 'Alignment · Cross-team sync'}
            {sentence.category === 'planning' && 'Planning · Roadmap / Sprint planning'}
            {sentence.category === 'risk' && 'Risk · Issue / blocker callout'}
            {sentence.category === 'delivery' && 'Delivery · Status update / follow-up'}
            {!['meeting', 'alignment', 'planning', 'risk', 'delivery'].includes(
              sentence.category,
            ) && (
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-text-muted" />
                <span>{sentence.category}</span>
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-surface-light/50 border border-border-hairline px-3 py-2.5">
        <p className="text-[11px] font-medium text-text-muted uppercase tracking-[0.18em] mb-1">
          Variation
        </p>
        <p className="text-xs text-text-secondary leading-relaxed">{sentence.variation}</p>
      </div>
    </div>
  );
}

