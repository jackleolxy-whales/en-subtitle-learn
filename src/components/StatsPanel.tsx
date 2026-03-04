import { Briefcase, MessageSquare, Mic, Bookmark } from 'lucide-react';

interface StatsPanelProps {
  total: number;
  completed: number;
  uncompleted: number;
  favoriteWords: number;
  savedPhrases: number;
}

export function StatsPanel({ total, completed, savedPhrases }: StatsPanelProps) {
  const stats = [
    { icon: Briefcase, label: '本周新增话术卡', value: savedPhrases, color: 'text-primary-light' },
    { icon: MessageSquare, label: '已精听句子', value: total > 0 ? completed * 25 : 0, color: 'text-success' },
    { icon: Mic, label: '完成复述', value: 0, color: 'text-accent' },
    { icon: Bookmark, label: '总话术卡', value: savedPhrases, color: 'text-highlight' },
  ];

  return (
    <div className="bg-surface rounded-2xl p-5 border border-white/5 sticky top-24">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-1">
        PM 工作语言进度
      </h2>
      <p className="text-[10px] text-text-muted mb-5">Work Language Progress</p>

      <div className="space-y-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 p-3 rounded-xl bg-surface-light/50 hover:bg-surface-light transition-colors"
          >
            <div className={`${stat.color}`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted">{stat.label}</p>
              <p className="text-lg font-semibold text-text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {completed > 0 && total > 0 && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-text-muted mb-2">
            <span>学习进度</span>
            <span>{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="h-2 bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-500"
              style={{ width: `${(completed / total) * 100}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
