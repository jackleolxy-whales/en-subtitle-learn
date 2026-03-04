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
      className="group cursor-pointer rounded-2xl bg-surface border border-white/5 overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
    >
      <div className="relative aspect-video overflow-hidden">
        <img
          src={episode.cover_url || episode.thumbnail || ''}
          alt={episode.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/400x225/1e1e2e/6366f1?text=${encodeURIComponent(episode.title.slice(0, 4))}`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(episode.duration)}
          </span>
          {isYouTube && (
            <span className="px-2 py-0.5 rounded-md bg-red-600/80 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
              <Youtube className="w-3 h-3" />
              YouTube
            </span>
          )}
          {!isYouTube && (
            <span className="px-2 py-0.5 rounded-md bg-black/50 backdrop-blur-sm text-xs text-white font-medium flex items-center gap-1">
              <Globe className="w-3 h-3" />
              {episode.accent === 'American' ? '美音' : episode.accent === 'British' ? '英音' : episode.accent}
            </span>
          )}
        </div>
        <div className="absolute top-3 right-3 flex items-center gap-1.5">
          {isCompleted && (
            <div className="w-7 h-7 rounded-full bg-success/90 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-white" />
            </div>
          )}
        </div>
        {episode.transcript_source && (
          <div className="absolute top-3 left-3">
            <span className={`px-2 py-0.5 rounded-md backdrop-blur-sm text-[10px] font-medium flex items-center gap-1 ${
              episode.transcript_source === 'official'
                ? 'bg-success/80 text-white'
                : episode.transcript_source === 'auto'
                  ? 'bg-accent/80 text-white'
                  : 'bg-surface-lighter/80 text-text-secondary'
            }`}>
              {episode.transcript_source === 'official' && <><Subtitles className="w-3 h-3" />官方字幕</>}
              {episode.transcript_source === 'auto' && <><Subtitles className="w-3 h-3" />自动字幕</>}
              {episode.transcript_source === 'asr' && <><Cpu className="w-3 h-3" />AI识别</>}
            </span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h3 className="font-semibold text-text-primary group-hover:text-primary-light transition-colors line-clamp-1">
          {episode.title}
        </h3>
        {isYouTube && episode.channel && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{episode.channel}</p>
        )}
        {!isYouTube && episode.title_en && (
          <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{episode.title_en}</p>
        )}

        <div className="flex items-center gap-3 mt-3 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <BookOpen className="w-3 h-3" />
            {episode.word_count}词 / {episode.sentence_count}句
          </span>
          {(episode.pm_phrase_count ?? 0) > 0 && (
            <span className="flex items-center gap-1 text-primary-light">
              <Briefcase className="w-3 h-3" />
              PM话术 {episode.pm_phrase_count}
            </span>
          )}
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

        {episode.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-3">
            {episode.tags.slice(0, 4).map((tag) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-md bg-primary/10 text-primary-light text-xs"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
          <span className="text-xs text-text-muted">{episode.publish_date}</span>
          {isYouTube && (
            <span className="text-xs text-red-400/80">YouTube</span>
          )}
          {!isYouTube && (
            <span className="text-xs text-text-muted">
              {episode.gender === 'male' ? '男声' : '女声'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
