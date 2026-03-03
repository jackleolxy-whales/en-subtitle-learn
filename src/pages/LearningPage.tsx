import { useState, useRef, useCallback, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { episodes as sampleEpisodes } from '../data/episodes';
import { useLearningProgress } from '../store/useStore';
import { useEpisodes } from '../store/useEpisodes';
import { transcribeVideo } from '../api';
import type { PlaybackRate, Sentence, Episode } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoPlayerHandle } from '../components/VideoPlayer';
import { LearningControls } from '../components/LearningControls';
import { SubtitlePanel } from '../components/SubtitlePanel';
import { ArrowLeft, CheckCircle2, Loader2, Youtube, Subtitles, Cpu } from 'lucide-react';

const API_BASE = 'http://localhost:8000';

export function LearningPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const { allEpisodes } = useEpisodes();

  const episode: Episode | undefined =
    allEpisodes.find((e) => e.episode_id === Number(episodeId)) ||
    sampleEpisodes.find((e) => e.episode_id === Number(episodeId));

  const { getProgress, updateProgress, toggleWordFavorite } = useLearningProgress();
  const progress = getProgress(Number(episodeId));
  const playerRef = useRef<VideoPlayerHandle>(null);

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [loopMode, setLoopMode] = useState<'none' | 'video' | 'sentence'>('none');
  const [abLoop, setAbLoop] = useState<{ a: number; b: number } | null>(null);
  const [abSettingState, setAbSettingState] = useState<'idle' | 'setting_a' | 'setting_b'>('idle');

  useEffect(() => {
    if (!episode) return;
    let cancelled = false;

    async function fetchSubtitles() {
      setLoading(true);
      setError(null);

      try {
        if (episode!.source_type === 'youtube' && episode!.source_url) {
          const res = await fetch(`${API_BASE}/api/youtube/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: episode!.source_url }),
          });
          if (!res.ok) throw new Error('Failed to fetch subtitles');
          const data = await res.json();
          if (!cancelled) setSentences(data.sentences || []);
        } else if (episode!.sentences && episode!.sentences.length > 0) {
          if (!cancelled) setSentences(episode!.sentences);
        } else {
          const result = await transcribeVideo(episode!.video_url);
          if (!cancelled) setSentences(result.sentences);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load subtitles');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSubtitles();
    return () => { cancelled = true; };
  }, [episode]);

  const currentSentenceIndex = sentences.findIndex(
    (s) => currentTime >= s.start_time && currentTime < s.end_time,
  );
  const currentSentence: Sentence | null =
    currentSentenceIndex >= 0 ? sentences[currentSentenceIndex] : null;

  useEffect(() => {
    if (progress.last_position > 0 && playerRef.current && !loading) {
      playerRef.current.seekTo(progress.last_position);
    }
  }, [loading]);

  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentTime(time);
      if (abLoop && time >= abLoop.b) {
        playerRef.current?.seekTo(abLoop.a);
        return;
      }
      if (loopMode === 'sentence' && currentSentence) {
        if (time >= currentSentence.end_time) {
          playerRef.current?.seekTo(currentSentence.start_time);
        }
      }
    },
    [abLoop, loopMode, currentSentence],
  );

  const handleVideoEnd = useCallback(() => {
    if (loopMode === 'video') {
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
    } else {
      setIsPlaying(false);
    }
  }, [loopMode]);

  const seekToSentence = useCallback(
    (sentence: Sentence) => {
      playerRef.current?.seekTo(sentence.start_time);
      if (!isPlaying) {
        playerRef.current?.play();
        setIsPlaying(true);
      }
    },
    [isPlaying],
  );

  const handlePrevSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const idx = currentSentenceIndex > 0 ? currentSentenceIndex - 1 : 0;
    seekToSentence(sentences[idx]);
  }, [currentSentenceIndex, sentences, seekToSentence]);

  const handleNextSentence = useCallback(() => {
    if (sentences.length === 0) return;
    const idx = currentSentenceIndex < sentences.length - 1 ? currentSentenceIndex + 1 : currentSentenceIndex;
    seekToSentence(sentences[idx]);
  }, [currentSentenceIndex, sentences, seekToSentence]);

  const handleReplay = useCallback(() => {
    if (currentSentence) seekToSentence(currentSentence);
  }, [currentSentence, seekToSentence]);

  const handleTogglePlay = useCallback(() => {
    if (isPlaying) playerRef.current?.pause();
    else playerRef.current?.play();
    setIsPlaying(!isPlaying);
  }, [isPlaying]);

  const handleRateChange = useCallback((rate: PlaybackRate) => {
    setPlaybackRate(rate);
    playerRef.current?.setRate(rate);
  }, []);

  const handleToggleVideoLoop = useCallback(() => {
    setLoopMode((prev) => (prev === 'video' ? 'none' : 'video'));
    setAbLoop(null);
    setAbSettingState('idle');
  }, []);

  const handleToggleSentenceLoop = useCallback(() => {
    setLoopMode((prev) => {
      if (prev === 'sentence') return 'none';
      setAbLoop(null);
      setAbSettingState('idle');
      return 'sentence';
    });
  }, []);

  const handleContinue = useCallback(() => {
    setLoopMode('none');
    setAbLoop(null);
    setAbSettingState('idle');
  }, []);

  const handleABLoop = useCallback(() => {
    if (abSettingState === 'idle') {
      setAbSettingState('setting_a');
      setAbLoop(null);
      setLoopMode('none');
    } else if (abSettingState === 'setting_a') {
      setAbSettingState('setting_b');
      setAbLoop({ a: currentTime, b: currentTime + 10 });
    } else if (abSettingState === 'setting_b') {
      if (abLoop) {
        setAbLoop({ ...abLoop, b: currentTime });
        setAbSettingState('idle');
      }
    }
  }, [abSettingState, currentTime, abLoop]);

  const handleComplete = useCallback(() => {
    updateProgress(Number(episodeId), { completed: !progress.completed });
  }, [episodeId, progress.completed, updateProgress]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlaying) {
        updateProgress(Number(episodeId), { last_position: currentTime });
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, currentTime, episodeId, updateProgress]);

  if (!episode) {
    return (
      <div className="min-h-screen bg-[#13131f] flex items-center justify-center text-text-primary">
        <p>课程未找到</p>
      </div>
    );
  }

  const videoSrc =
    episode.video_url?.startsWith('/api/')
      ? `${API_BASE}${episode.video_url}`
      : episode.video_url;

  return (
    <div className="min-h-screen bg-[#13131f] flex flex-col">
      <header className="border-b border-white/5 bg-surface/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-surface-light transition-colors text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-text-primary line-clamp-1">{episode.title}</h1>
                {episode.source_type === 'youtube' && <Youtube className="w-4 h-4 text-red-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-2">
                {episode.channel && <p className="text-xs text-text-muted">{episode.channel}</p>}
                {episode.transcript_source && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded flex items-center gap-0.5 ${
                    episode.transcript_source === 'official' ? 'bg-success/20 text-success' :
                    episode.transcript_source === 'auto' ? 'bg-accent/20 text-accent' :
                    'bg-surface-lighter text-text-muted'
                  }`}>
                    {episode.transcript_source === 'asr' ? <Cpu className="w-2.5 h-2.5" /> : <Subtitles className="w-2.5 h-2.5" />}
                    {episode.transcript_source === 'official' ? '官方字幕' :
                     episode.transcript_source === 'auto' ? '自动字幕' : 'AI识别'}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={handleComplete}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
              progress.completed
                ? 'bg-success/20 text-success border border-success/30'
                : 'bg-surface-light text-text-secondary hover:text-text-primary border border-white/5'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            {progress.completed ? '已完成' : '标记完成'}
          </button>
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-4 overflow-hidden">
        <div className="max-w-[1600px] mx-auto h-[calc(100vh-64px)] flex flex-col lg:flex-row gap-4">
          {/* Left: Video + Controls — sticky on desktop */}
          <div className="lg:w-[55%] xl:w-[60%] shrink-0 flex flex-col gap-3 lg:sticky lg:top-0 lg:self-start">
            <div className="rounded-2xl overflow-hidden bg-black shadow-2xl">
              <VideoPlayer
                ref={playerRef}
                src={videoSrc}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleVideoEnd}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                subtitleEn={currentSentence?.english}
                subtitleZh={currentSentence?.chinese}
              />
            </div>

            <LearningControls
              isPlaying={isPlaying}
              playbackRate={playbackRate}
              loopMode={loopMode}
              abLoop={abLoop}
              abSettingState={abSettingState}
              onTogglePlay={handleTogglePlay}
              onPrevSentence={handlePrevSentence}
              onNextSentence={handleNextSentence}
              onReplay={handleReplay}
              onRateChange={handleRateChange}
              onToggleVideoLoop={handleToggleVideoLoop}
              onToggleSentenceLoop={handleToggleSentenceLoop}
              onContinue={handleContinue}
              onABLoop={handleABLoop}
            />
          </div>

          {/* Right: Subtitles — scrollable */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {loading && (
              <div className="bg-surface rounded-2xl border border-white/5 p-12 flex flex-col items-center justify-center gap-4 flex-1">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <div className="text-center">
                  <p className="text-text-primary font-medium">正在加载字幕...</p>
                  <p className="text-text-muted text-sm mt-1">
                    {episode.source_type === 'youtube'
                      ? '正在处理 YouTube 视频字幕'
                      : 'Whisper AI 正在分析音频并生成逐句字幕'}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-danger/10 rounded-2xl border border-danger/20 p-8 text-center">
                <p className="text-danger font-medium">字幕加载失败</p>
                <p className="text-text-muted text-sm mt-2">{error}</p>
              </div>
            )}

            {!loading && !error && sentences.length > 0 && (
              <SubtitlePanel
                sentences={sentences}
                currentSentenceIndex={currentSentenceIndex}
                onSentenceClick={seekToSentence}
                favoritedWords={progress.favorited_words}
                onToggleWordFavorite={(word) => toggleWordFavorite(Number(episodeId), word)}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
