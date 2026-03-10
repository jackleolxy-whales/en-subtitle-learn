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
    <div className="glass rounded-2xl p-6 sticky top-24 hover-lift">
      <h2 className="text-sm font-semibold font-display gradient-text uppercase tracking-wider mb-1">
        PM 工作语言进度
      </h2>
      <p className="text-[10px] text-text-muted mb-6">Work Language Progress</p>

      <div className="space-y-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex items-center gap-3 p-3 rounded-xl glass-light transition-all hover-lift"
          >
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.color} bg-black/5`}>
              <stat.icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-text-muted">{stat.label}</p>
              <p className="text-xl font-bold font-display text-text-primary">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      {completed > 0 && total > 0 && (
        <div className="mt-6 pt-6 border-t border-white/5">
          <div className="flex justify-between text-xs text-text-muted mb-3">
            <span>学习进度</span>
            <span className="font-medium text-primary-light">{Math.round((completed / total) * 100)}%</span>
          </div>
          <div className="h-2.5 bg-black/5 rounded-full overflow-hidden p-0.5">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out relative"
              style={{ width: `${(completed / total) * 100}%` }}
            >
              <div className="absolute inset-0 bg-primary rounded-full" />
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent animate-pulse-subtle rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
