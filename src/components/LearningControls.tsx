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
    <div className="px-2 py-3">
      <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
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
          className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent hover:from-primary-dark hover:to-accent-light flex items-center justify-center text-white transition-all shadow-xl shadow-primary/30 hover:shadow-primary/50 active:scale-95 btn-glow hover-lift"
        >
          {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 ml-0.5" />}
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
      className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl transition-all text-xs active:scale-95 hover-lift ${
        highlight
          ? 'bg-gradient-to-r from-accent/20 to-orange-400/20 text-accent-light hover:from-accent/30 hover:to-orange-400/30 border border-accent/30'
          : active
            ? 'bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary-light hover:from-primary/30 hover:to-purple-500/30 border border-primary/30'
            : 'glass-light text-text-secondary hover:text-text-primary hover:bg-white/10'
      }`}
    >
      {icon && <div className="w-5 h-5 flex items-center justify-center">{icon}</div>}
      <span className="whitespace-nowrap font-medium">{label}</span>
    </button>
  );
}
