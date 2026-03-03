import { BookOpen, CheckCircle2, Clock, Star } from 'lucide-react';

interface StatsPanelProps {
  total: number;
  completed: number;
  uncompleted: number;
  favoriteWords: number;
}

export function StatsPanel({ total, completed, uncompleted, favoriteWords }: StatsPanelProps) {
  const stats = [
    { icon: BookOpen, label: '总期数', value: total, color: 'text-primary-light' },
    { icon: CheckCircle2, label: '已学习', value: completed, color: 'text-success' },
    { icon: Clock, label: '未学习', value: uncompleted, color: 'text-accent' },
    { icon: Star, label: '收藏词', value: favoriteWords, color: 'text-highlight' },
  ];

  return (
    <div className="bg-surface rounded-2xl p-5 border border-white/5 sticky top-24">
      <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-5">
        学习统计
      </h2>

      <div className="space-y-4">
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

      {completed > 0 && (
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
