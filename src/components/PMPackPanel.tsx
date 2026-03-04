import { useState } from 'react';
import type { PMPack, SavedPhraseCard } from '../types';
import { X, Video, MessageSquare, FileText, Link2, Copy, Check, Bookmark } from 'lucide-react';

interface PMPackPanelProps {
  open: boolean;
  onClose: () => void;
  pack: PMPack;
  episodeTitle: string;
  episodeId: number;
  onSavePhrase?: (card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => void;
}

export function PMPackPanel({ open, onClose, pack, episodeTitle, episodeId, onSavePhrase }: PMPackPanelProps) {
  const [activeTab, setActiveTab] = useState<'meeting' | 'slack' | 'doc' | 'connectors'>('meeting');

  if (!open) return null;

  const tabs = [
    { key: 'meeting' as const, label: 'Meeting', icon: Video, color: 'text-green-400', count: pack.meeting_phrases.length },
    { key: 'slack' as const, label: 'Slack', icon: MessageSquare, color: 'text-yellow-400', count: pack.slack_phrases.length },
    { key: 'doc' as const, label: 'Doc', icon: FileText, color: 'text-blue-400', count: pack.doc_phrases.length },
    { key: 'connectors' as const, label: '连接词', icon: Link2, color: 'text-purple-400', count: pack.connectors.length },
  ];

  const phrases =
    activeTab === 'meeting' ? pack.meeting_phrases :
    activeTab === 'slack' ? pack.slack_phrases :
    activeTab === 'doc' ? pack.doc_phrases : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-2xl max-h-[80vh] bg-surface rounded-2xl border border-white/10 shadow-2xl flex flex-col overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">PM 表达包</h2>
            <p className="text-xs text-text-muted mt-0.5">
              {episodeTitle.length > 40 ? episodeTitle.slice(0, 40) + '...' : episodeTitle}
              {' · '}可迁移表达 {pack.total_transferable} 条
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-surface-light transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <div className="flex border-b border-white/5 shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                  activeTab === tab.key
                    ? `${tab.color} border-b-2 border-current`
                    : 'text-text-muted hover:text-text-secondary'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
                <span className="px-1.5 py-0.5 rounded-full bg-surface-light text-[10px]">{tab.count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {activeTab === 'connectors' ? (
            <div className="flex flex-wrap gap-2">
              {pack.connectors.map((c, i) => (
                <ConnectorChip key={i} text={c} />
              ))}
            </div>
          ) : phrases.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-8">暂无此类表达</p>
          ) : (
            phrases.map((p, i) => (
              <PackPhraseCard
                key={i}
                text={p.text}
                original={p.original}
                intent={p.intent}
                type={activeTab as 'meeting' | 'slack' | 'doc'}
                sentenceId={p.sentence_id}
                episodeId={episodeId}
                episodeTitle={episodeTitle}
                onSave={onSavePhrase}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function PackPhraseCard({
  text,
  original,
  intent,
  type,
  sentenceId,
  episodeId,
  episodeTitle,
  onSave,
}: {
  text: string;
  original: string;
  intent: string;
  type: 'meeting' | 'slack' | 'doc';
  sentenceId: number;
  episodeId: number;
  episodeTitle: string;
  onSave?: (card: Omit<SavedPhraseCard, 'id' | 'saved_at'>) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    onSave?.({
      english: text,
      type,
      intent,
      original,
      episode_id: episodeId,
      episode_title: episodeTitle,
      sentence_id: sentenceId,
      tags: intent ? [intent] : [],
    });
  };

  return (
    <div className="rounded-xl bg-surface-light/20 border border-white/5 p-4 group hover:border-primary/20 transition-all">
      <p className="text-sm text-text-primary leading-relaxed">{text}</p>
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-text-muted truncate max-w-[200px]">
            原: {original}
          </span>
          {intent && (
            <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 text-[10px]">{intent}</span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={handleCopy} className="p-1 rounded hover:bg-surface-light transition-colors" title="复制">
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5 text-text-muted" />}
          </button>
          <button onClick={handleSave} className="p-1 rounded hover:bg-surface-light transition-colors" title="保存">
            <Bookmark className="w-3.5 h-3.5 text-text-muted hover:text-accent" />
          </button>
        </div>
      </div>
    </div>
  );
}

function ConnectorChip({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button
      onClick={handleCopy}
      className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 text-sm font-medium hover:bg-purple-500/20 transition-all flex items-center gap-1.5"
    >
      {text}
      {copied ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100" />}
    </button>
  );
}
