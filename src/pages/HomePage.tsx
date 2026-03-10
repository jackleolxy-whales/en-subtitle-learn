import { useState, useMemo } from 'react';
import { useLearningProgress } from '../store/useStore';
import { useEpisodes } from '../store/useEpisodes';
import { usePhraseCards } from '../store/usePhraseCards';
import type { FilterState } from '../types';
import { Link } from 'react-router-dom';
import { StatsPanel } from '../components/StatsPanel';
import { FilterBar } from '../components/FilterBar';
import { EpisodeCard } from '../components/EpisodeCard';
import { ImportDialog } from '../components/ImportDialog';
import { PhraseLibrary } from '../components/PhraseLibrary';
import { GitDataDialog } from '../components/GitDataDialog';
import { Headphones, Youtube, Bookmark, GitBranch, Search, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const PM_SCENARIO_MAP: Record<string, string[]> = {
  meeting: ['提出观点 opinion', '确认共识 confirm', '解释说明 explain'],
  slack: ['推进行动 action', '确认共识 confirm', '补充信息 addition'],
  document: ['解释说明 explain', '提出风险 risk'],
  negotiation: ['争取资源 negotiate', '反对方案 pushback'],
  alignment: ['对齐认知 alignment', '确认共识 confirm'],
  pushback: ['反对方案 pushback', '提出风险 risk'],
};

export function HomePage() {
  const { stats, progressMap } = useLearningProgress();
  const { allEpisodes, addEpisode } = useEpisodes();
  const { weekStats, cards, removeCard } = usePhraseCards();
  const { resolved, toggle } = useTheme();
  const [importOpen, setImportOpen] = useState(false);
  const [phraseLibOpen, setPhraseLibOpen] = useState(false);
  const [gitDataOpen, setGitDataOpen] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    sortOrder: 'desc',
    difficulty: null,
    gender: 'all',
    accent: 'all',
    category: 'all',
    pmScenario: 'all',
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
    if (filters.pmScenario !== 'all') {
      const relevantIntents = PM_SCENARIO_MAP[filters.pmScenario] || [];
      result = result.filter((e) => {
        if (!e.sentences) return false;
        return e.sentences.some(
          (s) => s.intent_tag && relevantIntents.some((ri) => s.intent_tag!.includes(ri.split(' ')[1])),
        );
      });
    }

    result.sort((a, b) => {
      const dateA = new Date(a.publish_date).getTime();
      const dateB = new Date(b.publish_date).getTime();
      return filters.sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });

    return result;
  }, [filters, allEpisodes]);

  return (
    <div className="min-h-screen relative z-10">
      <header className="border-b border-black/5 glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-primary/10 ring-1 ring-black/5 flex items-center justify-center shadow-sm">
              <Headphones className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold font-display gradient-text tracking-tight">PM 工作语言训练器</h1>
              <p className="text-xs text-text-muted">English Work Language Trainer for PMs</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setGitDataOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-light text-text-secondary hover:text-text-primary text-sm font-medium transition-all hover-lift"
            >
              <GitBranch className="w-4 h-4" />
              Git 数据
            </button>
            <button
              onClick={toggle}
              className="p-2 rounded-xl glass-light text-text-secondary hover:text-text-primary transition-all hover-lift"
              aria-label="切换亮暗主题"
              title="切换亮暗主题"
            >
              {resolved === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setPhraseLibOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl glass-light text-text-secondary hover:text-text-primary text-sm font-medium transition-all hover-lift relative"
            >
              <Bookmark className="w-4 h-4" />
              话术库
              {cards.length > 0 && (
                <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded-full bg-accent text-white text-[10px] font-bold shadow-md shadow-accent/30">
                  {cards.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-primary hover:bg-primary-dark text-white text-sm font-medium transition-all shadow-sm shadow-primary/20 hover:shadow-primary/30 active:scale-95 btn-glow hover-lift"
            >
              <Youtube className="w-4 h-4" />
              导入 YouTube
            </button>
            <div className="text-sm text-text-secondary hidden sm:block glass-light px-3 py-1.5 rounded-lg">
              已学习 <span className="text-primary-light font-semibold">{completedCount}</span> / {totalEpisodes} 集
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="flex gap-8">
          <aside className="w-64 shrink-0 hidden lg:block">
            <div className="sticky top-24">
              <StatsPanel
                total={totalEpisodes}
                completed={completedCount}
                uncompleted={totalEpisodes - completedCount}
                favoriteWords={stats.favoriteWords}
                savedPhrases={weekStats}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            <div className="glass rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-text-muted font-medium">
                  Daily 10
                </p>
                <h2 className="text-base font-semibold text-text-primary mt-1">
                  Today&apos;s PM English
                </h2>
                <p className="text-xs text-text-secondary mt-1">10 sentences · 3 minutes</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="hidden sm:block text-xs text-text-muted">
                  每天 10 句 PM 高频表达，Shadowing 强化输出肌肉。
                </div>
                <Link
                  to="/daily10"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-white text-xs font-medium shadow-primary hover:bg-primary-dark transition-all hover-lift active:scale-95"
                >
                  Start Learning
                </Link>
              </div>
            </div>

            <div className="glass rounded-2xl p-4 mb-6">
              <FilterBar filters={filters} onChange={setFilters} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.episode_id}
                  episode={episode}
                  progress={progressMap[episode.episode_id]}
                />
              ))}
            </div>

            {filteredEpisodes.length === 0 && (
              <div className="glass rounded-2xl text-center py-24 text-text-muted mt-6">
                <div className="w-16 h-16 rounded-full bg-surface-light flex items-center justify-center mx-auto mb-4">
                  <Search className="w-8 h-8 text-text-muted" />
                </div>
                <p className="text-lg font-medium text-text-secondary">没有匹配的课程</p>
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

      <PhraseLibrary
        open={phraseLibOpen}
        onClose={() => setPhraseLibOpen(false)}
        cards={cards}
        onRemove={removeCard}
      />

      <GitDataDialog
        open={gitDataOpen}
        onClose={() => setGitDataOpen(false)}
      />
    </div>
  );
}
