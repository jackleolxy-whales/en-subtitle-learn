import { useNavigate } from 'react-router-dom';
import type { Episode, LearningProgress } from '../types';
import { Clock, BookOpen, Star, Globe, CheckCircle2, Youtube, Subtitles, Cpu, Briefcase } from 'lucide-react';

interface EpisodeCardProps {
  episode: Episode;
  progress?: LearningProgress;
}

export function EpisodeCard({ episode, progress }: EpisodeCardProps) {
  const navigate = useNavigate();
  const isCompleted = progress?.completed;
  const isYouTube = episode.source_type === 'youtube';

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div
      onClick={() => navigate(`/learn/${episode.episode_id}`)}
      className="group cursor-pointer rounded-2xl glass overflow-hidden hover:border-primary/30 hover:shadow-primary transition-all duration-300 hover-lift"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={episode.cover_url || episode.thumbnail || ''}
          alt={episode.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/400x225/f5f5f7/111827?text=${encodeURIComponent(episode.title.slice(0, 4))}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent opacity-85 group-hover:opacity-90 transition-opacity" />
        
        <div className="absolute bottom-3 left-3 flex items-center gap-2 flex-wrap">
          <span className="px-2.5 py-1 rounded-lg glass text-xs text-white font-medium flex items-center gap-1 shadow-sm ring-1 ring-white/10">
            <Clock className="w-3.5 h-3.5" />
            {formatDuration(episode.duration)}
          </span>
          {isYouTube && (
            <span className="px-2.5 py-1 rounded-lg glass text-xs text-white font-medium flex items-center gap-1 shadow-sm ring-1 ring-white/10">
              <Youtube className="w-3.5 h-3.5" />
              YouTube
            </span>
          )}
          {!isYouTube && (
            <span className="px-2.5 py-1 rounded-lg glass text-xs text-white font-medium flex items-center gap-1 shadow-sm ring-1 ring-white/10">
              <Globe className="w-3.5 h-3.5" />
              {episode.accent === 'American' ? '美音' : episode.accent === 'British' ? '英音' : episode.accent}
            </span>
          )}
        </div>

        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isCompleted && (
            <div className="w-8 h-8 rounded-full bg-success/20 ring-1 ring-success/30 backdrop-blur-sm flex items-center justify-center shadow-sm">
              <CheckCircle2 className="w-4.5 h-4.5 text-white" />
            </div>
          )}
        </div>

        {episode.transcript_source && (
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-1 rounded-lg text-[10px] font-medium flex items-center gap-1 shadow-sm ring-1 ring-white/10 ${
              episode.transcript_source === 'official'
                ? 'bg-black/35 text-white'
                : episode.transcript_source === 'auto'
                  ? 'bg-black/35 text-white'
                  : 'bg-black/25 text-white'
            }`}>
              {episode.transcript_source === 'official' && <><Subtitles className="w-3 h-3" />官方字幕</>}
              {episode.transcript_source === 'auto' && <><Subtitles className="w-3 h-3" />自动字幕</>}
              {episode.transcript_source === 'asr' && <><Cpu className="w-3 h-3" />AI识别</>}
            </span>
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-semibold font-display text-text-primary group-hover:text-primary transition-colors line-clamp-1 text-base">
          {episode.title}
        </h3>
        {isYouTube && episode.channel && (
          <p className="text-xs text-text-muted mt-1 line-clamp-1 flex items-center gap-1">
            <Youtube className="w-3 h-3 text-text-muted" />
            {episode.channel}
          </p>
        )}
        {!isYouTube && episode.title_en && (
          <p className="text-xs text-text-muted mt-1 line-clamp-1">{episode.title_en}</p>
        )}

        <div className="flex items-center justify-between mt-4 text-xs">
          <span className="flex items-center gap-1 text-text-muted">
            <BookOpen className="w-3.5 h-3.5" />
            {episode.word_count}词 / {episode.sentence_count}句
          </span>
          <span className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star
                key={i}
                className={`w-3 h-3 ${
                  i < episode.difficulty ? 'text-accent fill-accent' : 'text-surface-lighter'
                }`}
              />
            ))}
          </span>
        </div>

        {(episode.pm_phrase_count ?? 0) > 0 && (
          <div className="mt-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-black/5 text-text-secondary text-xs font-medium border border-black/10">
              <Briefcase className="w-3.5 h-3.5" />
              包含 {episode.pm_phrase_count} 条PM话术
            </span>
          </div>
        )}

        {episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {episode.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-lg glass-light text-primary-light text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {episode.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-lg glass-light text-text-muted text-xs font-medium">
                +{episode.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
          <span className="text-xs text-text-muted">{episode.publish_date}</span>
          {!isYouTube && (
            <span className="text-xs text-text-muted px-2 py-0.5 rounded-lg glass-light">
              {episode.gender === 'male' ? '男声' : '女声'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
