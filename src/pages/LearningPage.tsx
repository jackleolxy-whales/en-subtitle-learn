import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { episodes as sampleEpisodes } from '../data/episodes';
import { useLearningProgress } from '../store/useStore';
import { useEpisodes } from '../store/useEpisodes';
import { usePhraseCards } from '../store/usePhraseCards';
import { transcribeVideo } from '../api';
import type { PlaybackRate, Sentence, Episode, PMPack } from '../types';
import { VideoPlayer } from '../components/VideoPlayer';
import type { VideoPlayerHandle } from '../components/VideoPlayer';
import { YouTubeEmbedPlayer } from '../components/YouTubeEmbedPlayer';
import { LearningControls } from '../components/LearningControls';
import { SubtitlePanel } from '../components/SubtitlePanel';
import { PMRecap } from '../components/PMRecap';
import { PMPackPanel } from '../components/PMPackPanel';
import { ShadowingCoach } from '../components/ShadowingCoach';
import { ArrowLeft, CheckCircle2, Loader2, Youtube, Subtitles, Cpu, Briefcase, AlertCircle, Sun, Moon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';

const API_BASE = 'http://localhost:8000';

export function LearningPage() {
  const { episodeId } = useParams<{ episodeId: string }>();
  const navigate = useNavigate();
  const { allEpisodes } = useEpisodes();
  const { addCard, isCardSaved } = usePhraseCards();
  const { resolved, toggle } = useTheme();

  const episode: Episode | undefined =
    allEpisodes.find((e) => e.episode_id === Number(episodeId)) ||
    sampleEpisodes.find((e) => e.episode_id === Number(episodeId));

  const { getProgress, updateProgress, toggleWordFavorite } = useLearningProgress();
  const progress = getProgress(Number(episodeId));
  const playerRef = useRef<VideoPlayerHandle>(null);

  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [pmPack, setPmPack] = useState<PMPack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pmPackOpen, setPmPackOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState<PlaybackRate>(1);
  const [loopMode, setLoopMode] = useState<'none' | 'video' | 'sentence'>('none');
  const [abLoop, setAbLoop] = useState<{ a: number; b: number } | null>(null);
  const [abSettingState, setAbSettingState] = useState<'idle' | 'setting_a' | 'setting_b'>('idle');
  const [videoLoadError, setVideoLoadError] = useState(false);

  useEffect(() => {
    setVideoLoadError(false);
  }, [episode?.episode_id]);

  useEffect(() => {
    if (!episode) return;
    let cancelled = false;

    async function fetchSubtitles() {
      setLoading(true);
      setError(null);

      try {
        if (episode!.sentences && episode!.sentences.length > 0) {
          if (!cancelled) {
            setSentences(episode!.sentences);
            setPmPack(episode!.pm_pack || null);
          }
        } else if (episode!.source_type === 'youtube' && episode!.source_url) {
          const res = await fetch(`${API_BASE}/api/youtube/import`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: episode!.source_url }),
          });
          if (!res.ok) throw new Error('Failed to fetch subtitles');
          const data = await res.json();
          if (!cancelled) {
            setSentences(data.sentences || []);
            setPmPack(data.pm_pack || null);
          }
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

  const currentSentenceRef = useRef(currentSentence);
  currentSentenceRef.current = currentSentence;

  const pmPhraseCount = useMemo(() => {
    return sentences.filter((s) => (s.transferability ?? 0) >= 0.2).length;
  }, [sentences]);

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
      const cur = currentSentenceRef.current;
      if (loopMode === 'sentence' && cur) {
        if (time >= cur.end_time) {
          playerRef.current?.seekTo(cur.start_time);
        }
      }
    },
    [abLoop, loopMode],
  );

  const handleVideoEnd = useCallback(() => {
    if (loopMode === 'video') {
      playerRef.current?.seekTo(0);
      playerRef.current?.play();
    } else {
      setIsPlaying(false);
    }
  }, [loopMode]);

  const handlePlayerPlay = useCallback(() => {
    setIsPlaying(true);
  }, []);

  const handlePlayerPause = useCallback(() => {
    setIsPlaying(false);
  }, []);

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
      : episode.video_url || '';

  function extractYouTubeId(url: string): string | null {
    const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
    return m ? m[1] : null;
  }

  const youtubeVideoId =
    episode.video_id ||
    (episode.source_url ? extractYouTubeId(episode.source_url) : null);

  const useYouTubeEmbed =
    (videoLoadError || !videoSrc) &&
    episode.source_type === 'youtube' &&
    youtubeVideoId;

  return (
    <div className="min-h-screen flex flex-col relative z-10">
      <header className="border-b border-black/5 glass sticky top-0 z-50">
        <div className="max-w-[1700px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/')}
              className="p-2.5 rounded-xl glass-light text-text-secondary hover:text-text-primary transition-all hover-lift"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold font-display text-text-primary line-clamp-1">{episode.title}</h1>
                {episode.source_type === 'youtube' && <Youtube className="w-4 h-4 text-red-500 shrink-0" />}
              </div>
              <div className="flex items-center gap-2 mt-1">
                {episode.channel && <p className="text-xs text-text-muted">{episode.channel}</p>}
                {episode.transcript_source && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-lg flex items-center gap-0.5 font-medium ${
                    episode.transcript_source === 'official' ? 'bg-success/10 text-success border border-success/20' :
                    episode.transcript_source === 'auto' ? 'bg-warning/10 text-warning border border-warning/20' :
                    'glass-light text-text-secondary border border-black/10'
                  }`}>
                    {episode.transcript_source === 'asr' ? <Cpu className="w-2.5 h-2.5" /> : <Subtitles className="w-2.5 h-2.5" />}
                    {episode.transcript_source === 'official' ? '官方字幕' :
                     episode.transcript_source === 'auto' ? '自动字幕' : 'AI识别'}
                  </span>
                )}
                {pmPhraseCount > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-lg bg-primary/10 text-primary flex items-center gap-0.5 font-medium border border-primary/20">
                    <Briefcase className="w-2.5 h-2.5" />
                    PM话术 {pmPhraseCount}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {pmPack && (
              <button
                onClick={() => setPmPackOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary/10 text-primary text-sm font-medium hover:bg-primary/15 transition-all border border-primary/20 hover-lift"
              >
                <Briefcase className="w-4 h-4" />
                PM 表达包
              </button>
            )}
            <button
              onClick={toggle}
              className="p-2 rounded-xl glass-light text-text-secondary hover:text-text-primary transition-all hover-lift"
              aria-label="切换亮暗主题"
              title="切换亮暗主题"
            >
              {resolved === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={handleComplete}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all hover-lift ${
                progress.completed
                  ? 'bg-gradient-to-r from-success/20 to-emerald-500/20 text-success border border-success/30'
                  : 'glass-light text-text-secondary hover:text-text-primary'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {progress.completed ? '已完成' : '标记完成'}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full px-4 py-4 overflow-hidden relative z-10">
        <div className="max-w-[1700px] mx-auto h-[calc(100vh-72px)] flex flex-col lg:flex-row gap-5">
          {/* Left: Video + Controls + Recap — scrollable */}
          <div className="lg:w-[55%] xl:w-[60%] shrink-0 flex flex-col gap-4 lg:overflow-y-auto lg:max-h-[calc(100vh-72px)] lg:pr-2 custom-scrollbar">
            <div className="rounded-2xl overflow-hidden bg-black shadow-2xl shrink-0 ring-1 ring-white/10">
              {useYouTubeEmbed ? (
                <YouTubeEmbedPlayer
                  ref={playerRef}
                  videoId={youtubeVideoId!}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                  onPlay={handlePlayerPlay}
                  onPause={handlePlayerPause}
                  subtitleEn={currentSentence?.english}
                  subtitleZh={currentSentence?.chinese}
                />
              ) : (
                <VideoPlayer
                  ref={playerRef}
                  src={videoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onEnded={handleVideoEnd}
                  onPlay={handlePlayerPlay}
                  onPause={handlePlayerPause}
                  onError={() => setVideoLoadError(true)}
                  subtitleEn={currentSentence?.english}
                  subtitleZh={currentSentence?.chinese}
                />
              )}
            </div>

            <div className="shrink-0">
              <div className="glass rounded-2xl p-4">
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
            </div>

            {/* AI Shadowing Coach */}
            {!loading && sentences.length > 0 && (
              <div className="shrink-0">
                <ShadowingCoach
                  sentence={currentSentence}
                  onPlayOriginal={handleReplay}
                  onNextSentence={handleNextSentence}
                  isPlaying={isPlaying}
                />
              </div>
            )}

            {/* PM Recap */}
            {!loading && sentences.length > 0 && (
              <div className="shrink-0">
                <PMRecap sentences={sentences} episodeTitle={episode.title} />
              </div>
            )}
          </div>

          {/* Right: Subtitles */}
          <div className="flex-1 min-w-0 min-h-0 flex flex-col">
            {loading && (
              <div className="glass rounded-2xl p-16 flex flex-col items-center justify-center gap-6 flex-1">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium text-text-primary">正在加载字幕...</p>
                  <p className="text-text-muted text-sm mt-2 max-w-md mx-auto">
                    {episode.source_type === 'youtube'
                      ? '正在处理 YouTube 视频字幕并生成 PM 表达'
                      : 'Whisper AI 正在分析音频并生成逐句字幕'}
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="glass rounded-2xl border border-danger/20 p-10 text-center">
                <div className="w-16 h-16 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-8 h-8 text-danger" />
                </div>
                <p className="text-lg font-medium text-danger">字幕加载失败</p>
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
                onSavePhrase={addCard}
                isPhraseCardSaved={isCardSaved}
                episodeId={episode.episode_id}
                episodeTitle={episode.title}
              />
            )}
          </div>
        </div>
      </main>

      {pmPack && (
        <PMPackPanel
          open={pmPackOpen}
          onClose={() => setPmPackOpen(false)}
          pack={pmPack}
          episodeTitle={episode.title}
          episodeId={episode.episode_id}
          onSavePhrase={addCard}
        />
      )}
    </div>
  );
}
