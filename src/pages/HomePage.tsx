import { useState, useMemo } from 'react';
import { useLearningProgress } from '../store/useStore';
import { useEpisodes } from '../store/useEpisodes';
import type { FilterState } from '../types';
import { StatsPanel } from '../components/StatsPanel';
import { FilterBar } from '../components/FilterBar';
import { EpisodeCard } from '../components/EpisodeCard';
import { ImportDialog } from '../components/ImportDialog';
import { Headphones, Youtube } from 'lucide-react';

export function HomePage() {
  const { stats, progressMap } = useLearningProgress();
  const { allEpisodes, addEpisode } = useEpisodes();
  const [importOpen, setImportOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    sortOrder: 'desc',
    difficulty: null,
    gender: 'all',
    accent: 'all',
    category: 'all',
  });

  const totalEpisodes = allEpisodes.length;
  const completedCount = Object.values(progressMap).filter((p) => p.completed).length;

  const filteredEpisodes = useMemo(() => {
    let result = [...allEpisodes];

    if (filters.difficulty !== null) {
      result = result.filter((e) => e.difficulty === filters.difficulty);
    }
    if (filters.gender !== 'all') {
      result = result.filter((e) => e.gender === filters.gender);
    }
    if (filters.accent !== 'all') {
      result = result.filter((e) => e.accent === filters.accent);
    }
    if (filters.category !== 'all') {
      result = result.filter((e) => e.category === filters.category);
    }

    result.sort((a, b) => {
      const dateA = new Date(a.publish_date).getTime();
      const dateB = new Date(b.publish_date).getTime();
      return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [filters, allEpisodes]);

  return (
    <div className="min-h-screen bg-[#13131f]">
      <header className="border-b border-white/5 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-text-primary tracking-tight">精听学习平台</h1>
              <p className="text-xs text-text-muted">English Intensive Listening</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-all shadow-lg shadow-red-600/20 hover:shadow-red-600/30 active:scale-95"
            >
              <Youtube className="w-4 h-4" />
              导入 YouTube
            </button>
            <div className="text-sm text-text-secondary hidden sm:block">
              已学习 <span className="text-primary font-semibold">{completedCount}</span> / {totalEpisodes} 集
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex gap-8">
          <aside className="w-64 shrink-0 hidden lg:block">
            <StatsPanel
              total={totalEpisodes}
              completed={completedCount}
              uncompleted={totalEpisodes - completedCount}
              favoriteWords={stats.favoriteWords}
            />
          </aside>

          <div className="flex-1 min-w-0">
            <FilterBar filters={filters} onChange={setFilters} />

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.episode_id}
                  episode={episode}
                  progress={progressMap[episode.episode_id]}
                />
              ))}
            </div>

            {filteredEpisodes.length === 0 && (
              <div className="text-center py-20 text-text-muted">
                <p className="text-lg">没有匹配的课程</p>
                <p className="text-sm mt-2">请尝试调整筛选条件或导入 YouTube 视频</p>
              </div>
            )}
          </div>
        </div>
      </main>

      <ImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={addEpisode}
      />
    </div>
  );
}
