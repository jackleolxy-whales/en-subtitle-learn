import { useState, useRef, useCallback, useEffect } from 'react';
import type { Sentence } from '../types';
import { Mic, Square, RotateCcw, ChevronDown, ChevronUp, Eye, EyeOff, ClipboardCopy, Check } from 'lucide-react';

interface PMRecapProps {
  sentences: Sentence[];
  episodeTitle: string;
}

type RecapMode = 'meeting' | 'slack';
type RecapStep = 'prep' | 'recording' | 'review';

interface OutlineSection {
  label: string;
  labelZh: string;
  prompt: string;
  reference: string;
}

function extractKeyPoints(sentences: Sentence[]): {
  background: string;
  keyPoint: string;
  risk: string;
  nextStep: string;
  summary: string;
  status: string;
  action: string;
} {
  const transferable = sentences
    .filter((s) => (s.transferability ?? 0) >= 0.15)
    .sort((a, b) => (b.transferability ?? 0) - (a.transferability ?? 0));

  const byIntent = (keyword: string) =>
    transferable.find((s) => s.intent_tag?.toLowerCase().includes(keyword));

  const bgSentence = byIntent('explain') || byIntent('alignment') || transferable[0];
  const opSentence = byIntent('opinion') || transferable[1] || transferable[0];
  const riskSentence = byIntent('risk') || byIntent('pushback');
  const actionSentence = byIntent('action') || byIntent('confirm');

  return {
    background: bgSentence?.pm_meeting || bgSentence?.english || '',
    keyPoint: opSentence?.pm_meeting || opSentence?.english || '',
    risk: riskSentence?.pm_meeting || riskSentence?.english || '',
    nextStep: actionSentence?.pm_meeting || actionSentence?.english || '',
    summary: (transferable[0]?.pm_slack || transferable[0]?.english || '').slice(0, 80),
    status: (byIntent('explain') || byIntent('alignment') || transferable[1])?.pm_slack
      || (byIntent('explain') || byIntent('alignment') || transferable[1])?.english || '',
    action: (actionSentence?.pm_slack || actionSentence?.english || ''),
  };
}

function buildMeetingOutline(sentences: Sentence[], title: string): OutlineSection[] {
  const kp = extractKeyPoints(sentences);
  return [
    {
      label: 'Background',
      labelZh: '背景',
      prompt: `用 1-2 句话说明这个讨论的背景，例如: "We had a discussion about {topic}..."`,
      reference: kp.background || `The discussion was about: ${title}`,
    },
    {
      label: 'Key Point',
      labelZh: '核心观点',
      prompt: `概括最重要的结论或观点，例如: "The main takeaway is..."`,
      reference: kp.keyPoint || 'No key point extracted — try summarizing the main idea.',
    },
    {
      label: 'Risk / Trade-off',
      labelZh: '风险/权衡',
      prompt: `提到任何被讨论的风险或 trade-off，例如: "One concern is..." 如果没有，可以说 "No major risks were raised."`,
      reference: kp.risk || 'No specific risks mentioned in this episode.',
    },
    {
      label: 'Next Step',
      labelZh: '下一步',
      prompt: `说出行动项，例如: "{Owner} will {action} by {date}."`,
      reference: kp.nextStep || 'No specific action items identified.',
    },
  ];
}

function buildSlackOutline(sentences: Sentence[], title: string): OutlineSection[] {
  const kp = extractKeyPoints(sentences);
  return [
    {
      label: 'TL;DR',
      labelZh: '一句话总结',
      prompt: `用一句话概括核心信息，例如: "Quick update on {topic} — {conclusion}."`,
      reference: kp.summary || `Update on: ${title}`,
    },
    {
      label: 'Current Status',
      labelZh: '当前状态',
      prompt: `说清楚现在在哪个阶段，例如: "We've completed {X} and are now working on {Y}."`,
      reference: kp.status || 'Status not explicitly discussed.',
    },
    {
      label: 'Next Action + Owner + ETA',
      labelZh: '行动项',
      prompt: `格式: "{Person} → {action} → by {date}", 例如: "Sarah → finalize the spec → by Friday EOD."`,
      reference: kp.action || 'No specific actions identified.',
    },
  ];
}

export function PMRecap({ sentences, episodeTitle }: PMRecapProps) {
  const [expanded, setExpanded] = useState(false);
  const [recapMode, setRecapMode] = useState<RecapMode>('meeting');
  const [step, setStep] = useState<RecapStep>('prep');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showReference, setShowReference] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const outline = recapMode === 'meeting'
    ? buildMeetingOutline(sentences, episodeTitle)
    : buildSlackOutline(sentences, episodeTitle);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        setStep('review');
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);
      setStep('recording');

      timerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      alert('无法访问麦克风，请在浏览器中允许麦克风权限后重试。');
    }
  }, []);

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
    setStep('prep');
    setShowReference(false);
  }, [audioUrl]);

  const handleCopyReference = useCallback((text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const transferableCount = sentences.filter((s) => (s.transferability ?? 0) >= 0.15).length;

  return (
    <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-light/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-secondary">PM Recap 复述训练</span>
          {transferableCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-accent/15 text-accent font-medium">
              {transferableCount} 条可用
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            {(['meeting', 'slack'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => { setRecapMode(mode); resetAll(); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  recapMode === mode
                    ? mode === 'meeting'
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                    : 'text-text-muted hover:text-text-secondary bg-surface-light/30'
                }`}
              >
                {mode === 'meeting' ? '30s 会议总结' : 'Slack 更新'}
              </button>
            ))}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2">
            {[
              { key: 'prep', label: '1. 阅读提纲' },
              { key: 'recording', label: '2. 录音复述' },
              { key: 'review', label: '3. 对照检查' },
            ].map((s, i) => (
              <div key={s.key} className="flex items-center gap-1.5">
                {i > 0 && <div className="w-4 h-px bg-white/10" />}
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                  step === s.key
                    ? 'bg-accent/20 text-accent'
                    : 'text-text-muted'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Outline — always visible */}
          <div className="space-y-2">
            {outline.map((section, i) => (
              <div key={i} className="rounded-lg bg-surface-light/20 border border-white/5 p-3">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold text-text-primary">{section.label}</span>
                  <span className="text-[10px] text-text-muted">{section.labelZh}</span>
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{section.prompt}</p>

                {/* Reference — show in review step or on toggle */}
                {(step === 'review' || showReference) && section.reference && (
                  <div className="mt-2 pt-2 border-t border-white/5 flex items-start gap-2">
                    <p className="text-xs text-primary-light/80 leading-relaxed flex-1 italic">
                      参考: {section.reference}
                    </p>
                    <button
                      onClick={() => handleCopyReference(section.reference, i)}
                      className="p-1 rounded hover:bg-surface-light transition-colors shrink-0"
                    >
                      {copiedIdx === i
                        ? <Check className="w-3 h-3 text-success" />
                        : <ClipboardCopy className="w-3 h-3 text-text-muted" />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Actions area */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Prep step: start recording */}
            {step === 'prep' && (
              <>
                <button
                  onClick={startRecording}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-accent/20 text-accent hover:bg-accent/30 text-sm font-medium transition-all"
                >
                  <Mic className="w-4 h-4" />
                  开始录音复述
                </button>
                <button
                  onClick={() => setShowReference((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-surface-light/30 transition-all"
                >
                  {showReference ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showReference ? '隐藏参考' : '查看参考'}
                </button>
              </>
            )}

            {/* Recording step */}
            {step === 'recording' && isRecording && (
              <button
                onClick={stopRecording}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-danger/20 text-danger hover:bg-danger/30 text-sm font-medium transition-all"
              >
                <Square className="w-4 h-4" />
                <span>停止录音</span>
                <span className="font-mono tabular-nums ml-1 px-2 py-0.5 rounded bg-danger/10">
                  {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                </span>
              </button>
            )}

            {/* Review step */}
            {step === 'review' && audioUrl && (
              <div className="w-full space-y-3">
                <div className="flex items-center gap-3">
                  <audio controls src={audioUrl} className="flex-1 h-10 rounded-lg" />
                  <span className="text-xs text-text-muted shrink-0 font-mono">
                    {recordingTime}s
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={resetAll}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-surface-light/50 text-text-secondary hover:text-text-primary text-xs font-medium transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    重新录制
                  </button>
                  <button
                    onClick={() => setShowReference((v) => !v)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-text-muted hover:text-text-secondary hover:bg-surface-light/30 transition-all"
                  >
                    {showReference ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    {showReference ? '隐藏参考' : '对照参考'}
                  </button>
                </div>
                <p className="text-[10px] text-text-muted leading-relaxed">
                  回放你的录音，对照上方参考内容检查：结构是否完整？关键信息是否覆盖？表达是否自然？
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
