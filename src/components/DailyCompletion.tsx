import React from 'react';
import { CheckCircle2, Sparkles, Home } from 'lucide-react';

interface DailyCompletionProps {
  total: number;
  averageScore: number | null;
  onReturnHome: () => void;
}

export function DailyCompletion({ total, averageScore, onReturnHome }: DailyCompletionProps) {
  return (
    <div className="glass rounded-2xl p-10 text-center space-y-6 max-w-xl mx-auto">
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <CheckCircle2 className="w-9 h-9 text-primary-light" />
          </div>
          <Sparkles className="w-5 h-5 text-accent absolute -right-1 -top-1 animate-pulse-subtle" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-text-muted font-medium mb-1">
            Daily 10 Complete
          </p>
          <h2 className="text-xl font-semibold text-text-primary">今天的 PM 英语打卡完成 🎯</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-2xl bg-surface-light/70 border border-border-subtle/60 px-4 py-3">
          <p className="text-[11px] text-text-muted uppercase tracking-[0.18em] mb-1">
            Sentences Practiced
          </p>
          <p className="text-2xl font-semibold text-text-primary">{total}</p>
        </div>
        <div className="rounded-2xl bg-primary/10 border border-primary/30 px-4 py-3">
          <p className="text-[11px] text-primary-light uppercase tracking-[0.18em] mb-1">
            Avg. Pronunciation
          </p>
          <p className="text-2xl font-semibold text-primary-light">
            {averageScore !== null ? Math.round(averageScore) : '—'}
          </p>
        </div>
      </div>

      <p className="text-sm text-text-secondary">
        每天 10 句，高频 PM 工作场景表达，配合 Shadowing 练习，稳步提升你的英语表达肌肉。
      </p>

      <button
        onClick={onReturnHome}
        className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-medium shadow-primary hover:bg-primary-dark transition-all hover-lift active:scale-95"
      >
        <Home className="w-4 h-4" />
        Return Home
      </button>
    </div>
  );
}

