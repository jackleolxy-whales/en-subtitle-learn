import { useState, useRef, useCallback, useEffect } from 'react';
import type { Sentence, SpeechAssessment, WordError } from '../types';
import { assessSpeech } from '../api';
import {
  Mic,
  Square,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronUp,
  Volume2,
  SkipForward,
  AlertCircle,
  Lightbulb,
  Target,
  Zap,
  Activity,
  Play,
} from 'lucide-react';

interface ShadowingCoachProps {
  sentence: Sentence | null;
  onPlayOriginal?: () => void;
  onNextSentence?: () => void;
  isPlaying?: boolean;
  onAssessmentComplete?: (assessment: SpeechAssessment) => void;
}

type CoachStep = 'idle' | 'listening' | 'recording' | 'analyzing' | 'result';

export function ShadowingCoach({
  sentence,
  onPlayOriginal,
  onNextSentence,
  isPlaying,
  onAssessmentComplete,
}: ShadowingCoachProps) {
  const [expanded, setExpanded] = useState(false);
  const [step, setStep] = useState<CoachStep>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [assessment, setAssessment] = useState<SpeechAssessment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [volumeLevel, setVolumeLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioBlobRef = useRef<Blob | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const resetState = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setAssessment(null);
    setError(null);
    setRecordingTime(0);
    setStep('idle');
    setVolumeLevel(0);
    audioBlobRef.current = null;
  }, [audioUrl]);

  useEffect(() => {
    if (sentence) {
      resetState();
    }
  }, [sentence?.sentence_id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const startRecording = useCallback(async () => {
    if (!sentence) return;
    setError(null);
    setAssessment(null);
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const audioCtx = new AudioContext();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateVolume = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolumeLevel(avg / 128);
        animFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        audioBlobRef.current = blob;
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        setVolumeLevel(0);
        submitForAssessment(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setStep('recording');

      timerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      setError('无法访问麦克风，请在浏览器设置中允许麦克风权限。');
    }
  }, [sentence, audioUrl]);

  const stopRecording = useCallback(() => {
    if (recordingTime < 1) {
      setError('录音时间太短，请至少说完一个完整的句子。');
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      setStep('idle');
      return;
    }
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [recordingTime]);

  const submitForAssessment = useCallback(
    async (blob: Blob) => {
      if (!sentence) return;
      setStep('analyzing');

      try {
        const result = await assessSpeech(blob, sentence.english);
        setAssessment(result);
        onAssessmentComplete?.(result);
        setStep('result');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'AI 评估失败，请重试');
        setStep('idle');
      }
    },
    [sentence, onAssessmentComplete],
  );

  const handleRetry = useCallback(() => {
    resetState();
  }, [resetState]);

  const handleListenFirst = useCallback(() => {
    setStep('listening');
    onPlayOriginal?.();
  }, [onPlayOriginal]);

  if (!sentence) return null;

  const overallScore = assessment
    ? Math.round(
        assessment.pronunciation_score * 0.5 +
          assessment.fluency_score * 0.25 +
          assessment.rhythm_score * 0.25,
      )
    : 0;

  return (
    <div className="glass rounded-2xl overflow-hidden hover-lift">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Mic className="w-4 h-4 text-primary-light" />
            {assessment && (
              <div
                className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
                  overallScore >= 80
                    ? 'bg-success'
                    : overallScore >= 60
                      ? 'bg-accent'
                      : 'bg-danger'
                }`}
              />
            )}
          </div>
          <span className="text-sm font-semibold text-text-secondary">AI 跟读教练</span>
          {assessment && (
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                overallScore >= 80
                  ? 'bg-success/15 text-success'
                  : overallScore >= 60
                    ? 'bg-accent/15 text-accent'
                    : 'bg-danger/15 text-danger'
              }`}
            >
              {overallScore} 分
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-text-muted" />
        ) : (
          <ChevronDown className="w-4 h-4 text-text-muted" />
        )}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Step flow indicator */}
          <div className="flex items-center gap-2">
            {[
              { key: 'listen', label: '1. 听原句', active: step === 'listening' || step === 'idle' },
              { key: 'record', label: '2. 跟读', active: step === 'recording' },
              { key: 'result', label: '3. AI反馈', active: step === 'analyzing' || step === 'result' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-4 h-px bg-white/10" />}
                <span
                  className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                    s.active ? 'bg-primary/20 text-primary-light' : 'text-text-muted'
                  }`}
                >
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Original sentence display */}
          <div className="rounded-lg bg-surface-light/20 border border-white/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Volume2 className="w-3.5 h-3.5 text-primary-light" />
              <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                Original
              </span>
            </div>
            <p className="text-sm text-text-primary leading-relaxed">{sentence.english}</p>
            {sentence.chinese && (
              <p className="text-xs text-text-muted mt-1">{sentence.chinese}</p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            {(step === 'idle' || step === 'listening') && (
              <>
                <button
                  onClick={handleListenFirst}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                    isPlaying
                      ? 'bg-primary/20 text-primary-light'
                      : 'bg-surface-light/50 text-text-secondary hover:text-text-primary hover:bg-surface-light'
                  }`}
                >
                  <Play className="w-4 h-4" />
                  听原句
                </button>
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/20 text-primary-light hover:bg-primary/30 text-sm font-medium transition-all"
                >
                  <Mic className="w-4 h-4" />
                  开始跟读
                </button>
              </>
            )}

            {step === 'recording' && isRecording && (
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger/20 text-danger hover:bg-danger/30 text-sm font-medium transition-all"
                >
                  <Square className="w-4 h-4" />
                  停止
                </button>
                <div className="flex items-center gap-2 flex-1">
                  {/* Volume visualizer */}
                  <div className="flex items-end gap-0.5 h-6">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 rounded-full bg-primary-light/60 transition-all duration-75"
                        style={{
                          height: `${Math.max(4, Math.min(24, volumeLevel * 24 * (0.5 + Math.random() * 0.5)))}px`,
                        }}
                      />
                    ))}
                  </div>
                  <span className="font-mono text-sm tabular-nums text-danger">
                    {Math.floor(recordingTime / 60)}:
                    {(recordingTime % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              </div>
            )}

            {step === 'analyzing' && (
              <div className="flex items-center gap-3 text-primary-light">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">AI 正在分析你的发音...</span>
              </div>
            )}
          </div>

          {/* Error message */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Results */}
          {step === 'result' && assessment && (
            <div className="space-y-4">
              {/* Audio playback */}
              {audioUrl && (
                <div className="flex items-center gap-3">
                  <audio controls src={audioUrl} className="flex-1 h-8 rounded-lg" />
                  <span className="text-[10px] text-text-muted font-mono shrink-0">
                    {assessment.speech_duration.toFixed(1)}s
                  </span>
                </div>
              )}

              {/* Score cards */}
              <div className="grid grid-cols-3 gap-2">
                <ScoreCard
                  icon={<Target className="w-4 h-4" />}
                  label="发音"
                  labelEn="Pronunciation"
                  score={assessment.pronunciation_score}
                />
                <ScoreCard
                  icon={<Zap className="w-4 h-4" />}
                  label="流畅"
                  labelEn="Fluency"
                  score={assessment.fluency_score}
                />
                <ScoreCard
                  icon={<Activity className="w-4 h-4" />}
                  label="节奏"
                  labelEn="Rhythm"
                  score={assessment.rhythm_score}
                />
              </div>

              {/* Recognized text with error highlights */}
              {assessment.recognized_text && (
                <div className="rounded-lg bg-surface-light/20 border border-white/5 p-3 space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Mic className="w-3.5 h-3.5 text-accent" />
                    <span className="text-[10px] font-medium text-text-muted uppercase tracking-wider">
                      Your Speech
                    </span>
                  </div>
                  <ErrorHighlightText
                    originalText={sentence.english}
                    recognizedText={assessment.recognized_text}
                    errors={assessment.errors}
                  />
                </div>
              )}

              {/* Feedback / Advice */}
              {assessment.feedback.length > 0 && (
                <div className="rounded-lg bg-primary/5 border border-primary/15 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-3.5 h-3.5 text-primary-light" />
                    <span className="text-[10px] font-medium text-primary-light uppercase tracking-wider">
                      Advice
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {assessment.feedback.map((tip, i) => (
                      <li key={i} className="text-xs text-text-secondary leading-relaxed flex items-start gap-2">
                        <span className="text-primary-light mt-0.5 shrink-0">•</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-light/50 text-text-secondary hover:text-text-primary text-xs font-medium transition-all"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  再试一次
                </button>
                <button
                  onClick={() => {
                    resetState();
                    onNextSentence?.();
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-primary/15 text-primary-light text-xs font-medium hover:bg-primary/25 transition-all"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  下一句
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ScoreCard({
  icon,
  label,
  labelEn,
  score,
}: {
  icon: React.ReactNode;
  label: string;
  labelEn: string;
  score: number;
}) {
  const color =
    score >= 80 ? 'text-success' : score >= 60 ? 'text-accent' : 'text-danger';
  const bgColor =
    score >= 80 ? 'bg-success/10' : score >= 60 ? 'bg-accent/10' : 'bg-danger/10';
  const borderColor =
    score >= 80
      ? 'border-success/20'
      : score >= 60
        ? 'border-accent/20'
        : 'border-danger/20';

  return (
    <div className={`rounded-xl ${bgColor} border ${borderColor} p-3 text-center`}>
      <div className={`flex items-center justify-center gap-1.5 mb-1 ${color}`}>
        {icon}
        <span className="text-2xl font-bold tabular-nums">{score}</span>
      </div>
      <p className="text-[10px] text-text-muted">
        {label}
        <span className="block text-[9px] opacity-60">{labelEn}</span>
      </p>
    </div>
  );
}

function ErrorHighlightText({
  originalText,
  recognizedText,
  errors,
}: {
  originalText: string;
  recognizedText: string;
  errors: WordError[];
}) {
  const origWords = originalText.split(/\s+/);
  const normalize = (w: string) => w.toLowerCase().replace(/[^\w']/g, '');

  const errorMap = new Map<number, WordError>();
  for (const e of errors) {
    if (e.error_type !== 'insertion') {
      errorMap.set(e.position, e);
    }
  }

  const insertions = errors.filter((e) => e.error_type === 'insertion');

  return (
    <div className="space-y-2">
      {/* Original with error markup */}
      <div className="flex flex-wrap gap-x-1.5 gap-y-1 leading-relaxed">
        {origWords.map((word, i) => {
          const err = errorMap.get(i);
          if (!err) {
            return (
              <span key={i} className="text-sm text-success">
                {word}
              </span>
            );
          }

          if (err.error_type === 'deletion') {
            return (
              <span key={i} className="relative">
                <span className="text-sm text-danger line-through opacity-70">{word}</span>
                <span className="block text-[10px] text-danger/60 italic">missed</span>
              </span>
            );
          }

          return (
            <span key={i} className="relative">
              <span className="text-sm text-danger">{word}</span>
              <span className="block text-[10px] text-accent italic">
                → {err.spoken_word}
              </span>
            </span>
          );
        })}
      </div>

      {/* Extra words */}
      {insertions.length > 0 && (
        <p className="text-[10px] text-text-muted">
          Extra words:{' '}
          {insertions.map((e, i) => (
            <span key={i} className="text-accent">
              "{e.spoken_word}"{i < insertions.length - 1 ? ', ' : ''}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
