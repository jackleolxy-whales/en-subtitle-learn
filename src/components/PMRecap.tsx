import { useState, useRef, useCallback, useEffect } from 'react';
import type { Sentence } from '../types';
import { Mic, Square, Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

interface PMRecapProps {
  sentences: Sentence[];
  episodeTitle: string;
}

type RecapMode = 'meeting' | 'slack';

interface RecapOutline {
  mode: RecapMode;
  sections: { label: string; hint: string }[];
}

function generateMeetingOutline(sentences: Sentence[]): RecapOutline {
  const transferable = sentences.filter((s) => (s.transferability ?? 0) >= 0.2);

  const background = transferable.find((s) => s.intent_tag?.includes('explain')) || transferable[0];
  const keyPoint = transferable.find((s) => s.intent_tag?.includes('opinion')) || transferable[1];
  const risk = transferable.find((s) => s.intent_tag?.includes('risk') || s.intent_tag?.includes('pushback'));
  const nextStep = transferable.find((s) => s.intent_tag?.includes('action'));

  return {
    mode: 'meeting',
    sections: [
      { label: 'Background', hint: background?.english || 'Summarize the context of this discussion...' },
      { label: 'Key Point', hint: keyPoint?.english || 'What was the main takeaway?' },
      { label: 'Risk / Trade-off', hint: risk?.english || 'Any concerns or trade-offs mentioned?' },
      { label: 'Next Step', hint: nextStep?.english || 'What are the action items?' },
    ],
  };
}

function generateSlackOutline(sentences: Sentence[]): RecapOutline {
  const transferable = sentences.filter((s) => (s.transferability ?? 0) >= 0.2);

  const summary = transferable[0];
  const status = transferable.find((s) => s.intent_tag?.includes('explain') || s.intent_tag?.includes('alignment'));
  const action = transferable.find((s) => s.intent_tag?.includes('action'));

  return {
    mode: 'slack',
    sections: [
      { label: 'TL;DR', hint: summary?.pm_slack || summary?.english || 'One-line summary...' },
      { label: 'Current Status', hint: status?.pm_slack || status?.english || 'Where are we now?' },
      { label: 'Next Action + Owner + ETA', hint: action?.pm_slack || action?.english || 'Who does what by when?' },
    ],
  };
}

export function PMRecap({ sentences, episodeTitle }: PMRecapProps) {
  const [expanded, setExpanded] = useState(false);
  const [recapMode, setRecapMode] = useState<RecapMode>('meeting');
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const outline = recapMode === 'meeting'
    ? generateMeetingOutline(sentences)
    : generateSlackOutline(sentences);

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
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setAudioUrl(null);

      timerRef.current = window.setInterval(() => {
        setRecordingTime((t) => t + 1);
      }, 1000);
    } catch {
      alert('无法访问麦克风，请允许浏览器权限');
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

  const resetRecording = useCallback(() => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioUrl(null);
    setRecordingTime(0);
  }, [audioUrl]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="bg-surface rounded-2xl border border-white/5 overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-light/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Mic className="w-4 h-4 text-accent" />
          <span className="text-sm font-semibold text-text-secondary">PM Recap 复述训练</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-text-muted" /> : <ChevronDown className="w-4 h-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setRecapMode('meeting')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                recapMode === 'meeting'
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'text-text-muted hover:text-text-secondary bg-surface-light/30'
              }`}
            >
              30s 会议总结
            </button>
            <button
              onClick={() => setRecapMode('slack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                recapMode === 'slack'
                  ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                  : 'text-text-muted hover:text-text-secondary bg-surface-light/30'
              }`}
            >
              Slack 更新
            </button>
          </div>

          {/* Outline */}
          <div className="space-y-2">
            {outline.sections.map((section, i) => (
              <div key={i} className="rounded-lg bg-surface-light/20 border border-white/5 p-3">
                <p className="text-xs font-semibold text-text-secondary mb-1">{section.label}</p>
                <p className="text-xs text-text-muted italic leading-relaxed">{section.hint}</p>
              </div>
            ))}
          </div>

          {/* Recording controls */}
          <div className="flex items-center gap-3">
            {!isRecording && !audioUrl && (
              <button
                onClick={startRecording}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent/20 text-accent hover:bg-accent/30 text-sm font-medium transition-all"
              >
                <Mic className="w-4 h-4" />
                开始录音
              </button>
            )}
            {isRecording && (
              <>
                <button
                  onClick={stopRecording}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-danger/20 text-danger hover:bg-danger/30 text-sm font-medium transition-all animate-pulse"
                >
                  <Square className="w-4 h-4" />
                  停止 ({recordingTime}s)
                </button>
              </>
            )}
            {audioUrl && (
              <div className="flex items-center gap-3 flex-1">
                <audio controls src={audioUrl} className="flex-1 h-8" />
                <button
                  onClick={resetRecording}
                  className="p-2 rounded-lg hover:bg-surface-light transition-colors"
                  title="重录"
                >
                  <RotateCcw className="w-4 h-4 text-text-muted" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
