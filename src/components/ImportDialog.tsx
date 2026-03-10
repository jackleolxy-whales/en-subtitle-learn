import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Episode, YouTubeVideoInfo } from '../types';
import { fetchYouTubeInfo, importYouTube } from '../api';
import {
  X,
  Youtube,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Globe,
  MessageSquare,
  Clock,
  Subtitles,
  Languages,
  Sparkles,
} from 'lucide-react';

interface ImportDialogProps {
  open: boolean;
  onClose: () => void;
  onImported: (episode: Episode) => void;
}

type ImportStep = 'input' | 'preview' | 'importing' | 'done' | 'error';

const IMPORT_STAGES = [
  { key: 'subtitles', label: '获取字幕 / 语音识别' },
  { key: 'segment', label: '断句与时间轴修正' },
  { key: 'translate', label: '翻译生成' },
  { key: 'expressions', label: '口语化表达包' },
];

export function ImportDialog({ open, onClose, onImported }: ImportDialogProps) {
  const navigate = useNavigate();
  const [url, setUrl] = useState('');
  const [step, setStep] = useState<ImportStep>('input');
  const [videoInfo, setVideoInfo] = useState<YouTubeVideoInfo | null>(null);
  const [genTranslation, setGenTranslation] = useState(true);
  const [genExpressions, setGenExpressions] = useState(true);
  const [error, setError] = useState('');
  const [importedEpisode, setImportedEpisode] = useState<Episode | null>(null);
  const [currentStage, setCurrentStage] = useState(0);

  const reset = useCallback(() => {
    setUrl('');
    setStep('input');
    setVideoInfo(null);
    setError('');
    setImportedEpisode(null);
    setCurrentStage(0);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFetchInfo = useCallback(async () => {
    if (!url.trim()) return;
    setStep('preview');
    setError('');
    try {
      const info = await fetchYouTubeInfo(url.trim());
      setVideoInfo(info);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '获取视频信息失败');
      setStep('error');
    }
  }, [url]);

  const handleStartImport = useCallback(async () => {
    if (!videoInfo) return;
    setStep('importing');
    setCurrentStage(0);

    const stageTimer = setInterval(() => {
      setCurrentStage((prev) => Math.min(prev + 1, IMPORT_STAGES.length - 1));
    }, 3000);

    try {
      const episode = await importYouTube(url.trim(), genTranslation, genExpressions);
      clearInterval(stageTimer);
      setCurrentStage(IMPORT_STAGES.length);
      setImportedEpisode(episode);
      onImported(episode);
      setStep('done');
    } catch (err: unknown) {
      clearInterval(stageTimer);
      setError(err instanceof Error ? err.message : '导入失败');
      setStep('error');
    }
  }, [videoInfo, url, genTranslation, genExpressions, onImported]);

  const handleGoToLearn = useCallback(() => {
    if (importedEpisode) {
      handleClose();
      navigate(`/learn/${importedEpisode.episode_id}`);
    }
  }, [importedEpisode, navigate, handleClose]);

  if (!open) return null;

  function formatDuration(seconds: number) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={handleClose} />
      <div className="relative glass rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
        <div className="flex items-center justify-between px-6 py-5 border-b border-black/5">
          <div className="flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold font-display text-text-primary">导入 YouTube 视频</h2>
          </div>
          <button onClick={handleClose} className="p-2.5 rounded-xl glass-light transition-colors text-text-muted hover:text-text-primary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5">
          {/* Step: Input URL */}
          {step === 'input' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-muted block mb-1.5">YouTube 视频链接</label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleFetchInfo()}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full px-4 py-3 rounded-xl glass-light border border-black/10 text-text-primary placeholder:text-text-muted/50 outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/30 transition-all text-sm"
                autoFocus
              />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl glass-light">
                <div className="flex items-center gap-2">
                  <Languages className="w-4 h-4 text-primary-light" />
                  <span className="text-sm text-text-secondary">生成中文翻译</span>
                </div>
                <ToggleSwitch checked={genTranslation} onChange={setGenTranslation} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-xl glass-light">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm text-text-secondary">生成工作口语包</span>
                </div>
                <ToggleSwitch checked={genExpressions} onChange={setGenExpressions} />
              </div>

              <button
                onClick={handleFetchInfo}
                disabled={!url.trim()}
                className="w-full py-3.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-primary/20 hover:shadow-primary/30 btn-glow hover-lift"
              >
                识别视频
              </button>
            </div>
          )}

          {/* Step: Preview */}
          {step === 'preview' && !videoInfo && (
            <div className="flex flex-col items-center py-12 gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-text-secondary text-sm">正在获取视频信息...</p>
            </div>
          )}

          {step === 'preview' && videoInfo && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <img
                  src={videoInfo.thumbnail}
                  alt={videoInfo.title}
                  className="w-40 h-24 rounded-lg object-cover flex-shrink-0"
                />
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-text-primary line-clamp-2">{videoInfo.title}</h3>
                  <p className="text-xs text-text-muted mt-1 flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {videoInfo.channel}
                  </p>
                  <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDuration(videoInfo.duration)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 rounded-xl bg-surface-light/50">
                <Subtitles className="w-4 h-4" />
                {videoInfo.subtitle_hint === 'official' && (
                  <span className="text-sm text-success flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 官方英文字幕
                  </span>
                )}
                {videoInfo.subtitle_hint === 'auto' && (
                  <span className="text-sm text-accent flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> YouTube 自动字幕
                  </span>
                )}
                {videoInfo.subtitle_hint === 'none' && (
                  <span className="text-sm text-text-muted flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> 无字幕，将自动语音识别 (ASR)
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => { setStep('input'); setVideoInfo(null); }}
                  className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all text-sm"
                >
                  返回
                </button>
                <button
                  onClick={handleStartImport}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all text-sm"
                >
                  开始导入
                </button>
              </div>
            </div>
          )}

          {/* Step: Importing */}
          {step === 'importing' && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2 mb-2">
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                <p className="text-text-primary font-medium">正在导入...</p>
              </div>

              <div className="space-y-2">
                {IMPORT_STAGES.map((stage, i) => (
                  <div key={stage.key} className="flex items-center gap-3 px-3 py-2 rounded-lg">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                      i < currentStage
                        ? 'bg-success/20 text-success'
                        : i === currentStage
                          ? 'bg-primary/20 text-primary-light animate-pulse'
                          : 'bg-surface-lighter text-text-muted'
                    }`}>
                      {i < currentStage ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                    </div>
                    <span className={`text-sm ${
                      i <= currentStage ? 'text-text-primary' : 'text-text-muted'
                    }`}>
                      {stage.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="h-1.5 bg-surface-lighter rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-purple-500 rounded-full transition-all duration-700"
                  style={{ width: `${((currentStage + 1) / IMPORT_STAGES.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && importedEpisode && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center">
                  <CheckCircle2 className="w-7 h-7 text-success" />
                </div>
                <p className="text-text-primary font-semibold">导入成功！</p>
              </div>

              <div className="bg-surface-light/50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">字幕来源</span>
                  <span className="text-text-primary">
                    {importedEpisode.transcript_source === 'official' ? '官方字幕' :
                     importedEpisode.transcript_source === 'auto' ? '自动字幕' : 'AI 识别'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">句子数</span>
                  <span className="text-text-primary">{importedEpisode.sentence_count} 句</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">词汇量</span>
                  <span className="text-text-primary">{importedEpisode.word_count} 词</span>
                </div>
              </div>

              <button
                onClick={handleGoToLearn}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-all"
              >
                开始学习
              </button>
            </div>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="py-6 space-y-5">
              <div className="flex flex-col items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-danger/20 flex items-center justify-center">
                  <AlertCircle className="w-7 h-7 text-danger" />
                </div>
                <p className="text-danger font-semibold">操作失败</p>
                <p className="text-text-muted text-sm text-center max-w-xs">{error}</p>
              </div>
              <button
                onClick={reset}
                className="w-full py-3 rounded-xl border border-white/10 text-text-secondary hover:text-text-primary hover:bg-surface-light transition-all"
              >
                重试
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-12 h-6 rounded-full p-0.5 transition-all duration-300 relative ${
        checked 
          ? 'bg-primary shadow-sm shadow-primary/20' 
          : 'bg-black/10'
      }`}
    >
      <div 
        className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
          checked ? 'translate-x-6' : 'translate-x-0'
        }`} 
      />
    </button>
  );
}
