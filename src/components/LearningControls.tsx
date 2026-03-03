import type { PlaybackRate } from '../types';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Repeat1,
  ArrowRightFromLine,
  Gauge,
} from 'lucide-react';

interface LearningControlsProps {
  isPlaying: boolean;
  playbackRate: PlaybackRate;
  loopMode: 'none' | 'video' | 'sentence';
  abLoop: { a: number; b: number } | null;
  abSettingState: 'idle' | 'setting_a' | 'setting_b';
  onTogglePlay: () => void;
  onPrevSentence: () => void;
  onNextSentence: () => void;
  onReplay: () => void;
  onRateChange: (rate: PlaybackRate) => void;
  onToggleVideoLoop: () => void;
  onToggleSentenceLoop: () => void;
  onContinue: () => void;
  onABLoop: () => void;
}

const RATES: PlaybackRate[] = [0.75, 1, 1.25, 1.5];

export function LearningControls({
  isPlaying,
  playbackRate,
  loopMode,
  abLoop,
  abSettingState,
  onTogglePlay,
  onPrevSentence,
  onNextSentence,
  onReplay,
  onRateChange,
  onToggleVideoLoop,
  onToggleSentenceLoop,
  onContinue,
  onABLoop,
}: LearningControlsProps) {
  const nextRate = () => {
    const idx = RATES.indexOf(playbackRate);
    const next = RATES[(idx + 1) % RATES.length];
    onRateChange(next);
  };

  return (
    <div className="bg-surface rounded-2xl border border-white/5 px-4 py-3">
      <div className="flex items-center justify-center gap-1 sm:gap-2 flex-wrap">
        <ControlButton
          icon={<Repeat className="w-4 h-4" />}
          label="视频循环"
          active={loopMode === 'video'}
          onClick={onToggleVideoLoop}
        />

        <ControlButton
          label={
            abSettingState === 'idle'
              ? abLoop
                ? 'A-B ✓'
                : 'A-B'
              : abSettingState === 'setting_a'
                ? '设置A点'
                : '设置B点'
          }
          active={abLoop !== null || abSettingState !== 'idle'}
          highlight={abSettingState !== 'idle'}
          onClick={onABLoop}
        />

        <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

        <ControlButton
          icon={<SkipBack className="w-4 h-4" />}
          label="上一句"
          onClick={onPrevSentence}
        />

        <ControlButton
          icon={<RotateCcw className="w-4 h-4" />}
          label="重播"
          onClick={onReplay}
        />

        <button
          onClick={onTogglePlay}
          className="w-12 h-12 rounded-full bg-primary hover:bg-primary-dark flex items-center justify-center text-white transition-all shadow-lg shadow-primary/25 hover:shadow-primary/40 active:scale-95"
        >
          {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
        </button>

        <ControlButton
          icon={<SkipForward className="w-4 h-4" />}
          label="下一句"
          onClick={onNextSentence}
        />

        <div className="w-px h-6 bg-white/10 mx-1 hidden sm:block" />

        <ControlButton
          icon={<Gauge className="w-4 h-4" />}
          label={`${playbackRate}x`}
          onClick={nextRate}
        />

        <ControlButton
          icon={<Repeat1 className="w-4 h-4" />}
          label="单句循环"
          active={loopMode === 'sentence'}
          onClick={onToggleSentenceLoop}
        />

        {(loopMode !== 'none' || abLoop) && (
          <ControlButton
            icon={<ArrowRightFromLine className="w-4 h-4" />}
            label="继续"
            highlight
            onClick={onContinue}
          />
        )}
      </div>
    </div>
  );
}

function ControlButton({
  icon,
  label,
  active,
  highlight,
  onClick,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-xl transition-all text-xs active:scale-95 ${
        highlight
          ? 'bg-accent/20 text-accent hover:bg-accent/30'
          : active
            ? 'bg-primary/20 text-primary-light hover:bg-primary/30'
            : 'text-text-secondary hover:text-text-primary hover:bg-surface-light'
      }`}
    >
      {icon}
      <span className="whitespace-nowrap">{label}</span>
    </button>
  );
}
