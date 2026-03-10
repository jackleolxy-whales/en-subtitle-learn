import React from 'react';

interface DailyProgressBarProps {
  current: number;
  total: number;
}

export function DailyProgressBar({ current, total }: DailyProgressBarProps) {
  const clampedCurrent = Math.min(Math.max(current, 0), total);
  const percent = total > 0 ? (clampedCurrent / total) * 100 : 0;

  return (
    <div className="glass rounded-2xl p-4 flex items-center justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-text-muted font-medium">
          Daily 10 · PM English
        </p>
        <p className="text-sm font-semibold text-text-primary mt-1">
          第 <span className="text-primary-light">{clampedCurrent}</span> / {total} 句
        </p>
      </div>
      <div className="flex-1 flex flex-col gap-1 min-w-[180px]">
        <div className="h-2 rounded-full bg-surface-light/70 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-[11px] text-text-muted text-right">
          预计用时 <span className="text-text-secondary font-medium">3–5 分钟</span>
        </p>
      </div>
    </div>
  );
}

