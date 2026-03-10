import { useState, useMemo } from 'react';
import type { SavedPhraseCard } from '../types';
import { X, Copy, Trash2, Check, Video, MessageSquare, FileText, Search } from 'lucide-react';

interface PhraseLibraryProps {
  open: boolean;
  onClose: () => void;
  cards: SavedPhraseCard[];
  onRemove: (id: string) => void;
}

const TYPE_CONFIG = {
  meeting: { icon: Video, label: 'Meeting', color: 'text-green-400', bg: 'bg-green-500/10' },
  slack: { icon: MessageSquare, label: 'Slack', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  doc: { icon: FileText, label: 'Doc', color: 'text-blue-400', bg: 'bg-blue-500/10' },
} as const;

export function PhraseLibrary({ open, onClose, cards, onRemove }: PhraseLibraryProps) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'meeting' | 'slack' | 'doc'>('all');

  const filtered = useMemo(() => {
    let result = cards;
    if (filterType !== 'all') {
      result = result.filter((c) => c.type === filterType);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) => c.english.toLowerCase().includes(q) || c.original.toLowerCase().includes(q) || c.intent.toLowerCase().includes(q),
      );
    }
    return result;
  }, [cards, filterType, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[80vh] glass rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-xl font-semibold font-display gradient-text">话术库</h2>
            <p className="text-xs text-text-muted mt-1">
              共 {cards.length} 条 · 随用随取的 PM 工作表达
            </p>
          </div>
          <button onClick={onClose} className="p-2.5 rounded-xl glass-light hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-text-muted hover:text-text-primary" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-white/5 flex flex-col sm:flex-row items-start sm:items-center gap-3 shrink-0">
          <div className="flex-1 w-full sm:w-auto flex items-center gap-2 px-4 py-3 rounded-xl glass-light border border-white/5">
            <Search className="w-4 h-4 text-text-muted shrink-0" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索话术..."
              className="flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
          </div>
          <div className="flex items-center gap-1 w-full sm:w-auto justify-start sm:justify-end">
            {(['all', 'meeting', 'slack', 'doc'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setFilterType(t)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all hover-lift ${
                  filterType === t
                    ? 'bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary-light border border-primary/30'
                    : 'text-text-muted hover:text-text-secondary glass-light hover:bg-white/10'
                }`}
              >
                {t === 'all' ? '全部' : t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-12 text-text-muted">
              <p className="text-sm">{cards.length === 0 ? '还没有保存话术' : '没有匹配的话术'}</p>
              <p className="text-xs mt-1">在学习页点击 Work 按钮保存你需要的 PM 表达</p>
            </div>
          )}

          {filtered.map((card) => (
            <PhraseCard key={card.id} card={card} onRemove={onRemove} />
          ))}
        </div>
      </div>
    </div>
  );
}

function PhraseCard({ card, onRemove }: { card: SavedPhraseCard; onRemove: (id: string) => void }) {
  const [copied, setCopied] = useState(false);
  const cfg = TYPE_CONFIG[card.type];
  const Icon = cfg.icon;

  const handleCopy = () => {
    navigator.clipboard.writeText(card.english);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl glass-light border border-white/5 p-4 group hover:border-primary/30 transition-all hover-lift">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium ${cfg.bg} ${cfg.color} border border-current/20`}>
              <Icon className="w-3 h-3" />
              {cfg.label}
            </span>
            {card.intent && (
              <span className="px-2 py-0.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-cyan-500/10 text-blue-300 text-[10px] font-medium border border-blue-500/20">
                {card.intent}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-text-primary leading-relaxed">{card.english}</p>
          <p className="text-xs text-text-muted mt-1.5 leading-relaxed">
            原文: {card.original.length > 60 ? card.original.slice(0, 60) + '...' : card.original}
          </p>
          <div className="flex items-center gap-2 mt-2.5">
            <span className="text-[10px] text-text-muted px-1.5 py-0.5 rounded-lg bg-white/5">
              {card.episode_title.length > 20 ? card.episode_title.slice(0, 20) + '...' : card.episode_title}
            </span>
            {card.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] text-accent-light bg-accent/10 px-2 py-0.5 rounded-lg font-medium border border-accent/20">{tag}</span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            title="复制"
          >
            {copied ? (
              <Check className="w-4 h-4 text-success" />
            ) : (
              <Copy className="w-4 h-4 text-text-muted hover:text-text-primary" />
            )}
          </button>
          <button
            onClick={() => onRemove(card.id)}
            className="p-2 rounded-lg hover:bg-danger/10 transition-colors"
            title="删除"
          >
            <Trash2 className="w-4 h-4 text-text-muted hover:text-danger" />
          </button>
        </div>
      </div>
    </div>
  );
}
