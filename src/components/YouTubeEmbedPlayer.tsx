import { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import type { VideoPlayerHandle } from './VideoPlayer';

declare global {
  interface Window {
    YT?: {
      Player: new (el: string | HTMLElement, opts: object) => YTPlayerInstance;
      PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; BUFFERING: number };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayerInstance {
  playVideo: () => void;
  pauseVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  getCurrentTime: () => number;
  setPlaybackRate: (rate: number) => void;
  getPlayerState: () => number;
  destroy?: () => void;
}

interface YouTubeEmbedPlayerProps {
  videoId: string;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  subtitleEn?: string;
  subtitleZh?: string;
}

let ytApiLoading = false;
let ytApiReady = false;
const ytApiCallbacks: (() => void)[] = [];

function ensureYouTubeAPI(): Promise<void> {
  if (ytApiReady && window.YT?.Player) return Promise.resolve();

  return new Promise((resolve) => {
    ytApiCallbacks.push(resolve);

    if (ytApiLoading) return;
    ytApiLoading = true;

    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      ytApiReady = true;
      ytApiCallbacks.forEach((cb) => cb());
      ytApiCallbacks.length = 0;
    };

    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
}

export const YouTubeEmbedPlayer = forwardRef<VideoPlayerHandle, YouTubeEmbedPlayerProps>(
  ({ videoId, onTimeUpdate, onEnded, onPlay, onPause, subtitleEn, subtitleZh }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const ytPlayerRef = useRef<YTPlayerInstance | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const [ready, setReady] = useState(false);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPlayRef = useRef(onPlay);
    const onPauseRef = useRef(onPause);
    const onEndedRef = useRef(onEnded);

    onTimeUpdateRef.current = onTimeUpdate;
    onPlayRef.current = onPlay;
    onPauseRef.current = onPause;
    onEndedRef.current = onEnded;

    useEffect(() => {
      if (!containerRef.current || !videoId) return;

      const el = containerRef.current;
      const elId = `yt-player-${videoId}-${Date.now()}`;
      el.id = elId;

      let destroyed = false;

      ensureYouTubeAPI().then(() => {
        if (destroyed || !window.YT?.Player) return;

        const player = new window.YT.Player(elId, {
          width: '100%',
          height: '100%',
          videoId,
          playerVars: {
            playsinline: 1,
            enablejsapi: 1,
            modestbranding: 1,
          },
          events: {
            onReady: () => {
              if (destroyed) return;
              ytPlayerRef.current = player;
              setReady(true);
            },
            onStateChange: (event: { data: number }) => {
              if (destroyed) return;
              const state = event.data;
              if (state === 1) onPlayRef.current();
              else if (state === 2) onPauseRef.current();
              else if (state === 0) onEndedRef.current();
            },
          },
        });

        ytPlayerRef.current = player;
      });

      return () => {
        destroyed = true;
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        try { ytPlayerRef.current?.destroy?.(); } catch { /* ignore */ }
        ytPlayerRef.current = null;
        setReady(false);
      };
    }, [videoId]);

    const startPolling = useCallback(() => {
      if (intervalRef.current) return;

      intervalRef.current = setInterval(() => {
        const player = ytPlayerRef.current;
        if (!player) return;

        try {
          const time = player.getCurrentTime();
          if (typeof time === 'number' && !isNaN(time)) {
            onTimeUpdateRef.current(time);
          }
        } catch {
          // player not ready yet
        }
      }, 200);
    }, []);

    useEffect(() => {
      if (!ready) return;
      startPolling();
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      };
    }, [ready, startPolling]);

    // Fallback: start polling after a delay even if onReady hasn't fired
    useEffect(() => {
      const fallback = setTimeout(() => {
        if (ytPlayerRef.current && !ready) {
          setReady(true);
        }
      }, 3000);
      return () => clearTimeout(fallback);
    }, [ready]);

    useImperativeHandle(ref, () => ({
      play() {
        try { ytPlayerRef.current?.playVideo(); } catch { /* ignore */ }
      },
      pause() {
        try { ytPlayerRef.current?.pauseVideo(); } catch { /* ignore */ }
      },
      seekTo(time: number) {
        try { ytPlayerRef.current?.seekTo(time, true); } catch { /* ignore */ }
      },
      setRate(rate: number) {
        try { ytPlayerRef.current?.setPlaybackRate(rate); } catch { /* ignore */ }
      },
      getCurrentTime() {
        try { return ytPlayerRef.current?.getCurrentTime() ?? 0; } catch { return 0; }
      },
    }));

    const hasSubtitle = subtitleEn || subtitleZh;

    return (
      <div className="relative w-full aspect-video bg-black">
        <div ref={containerRef} className="w-full h-full" />
        {hasSubtitle && (
          <div className="absolute bottom-12 left-0 right-0 z-[999] pointer-events-none px-4 pb-2">
            <div className="max-w-[90%] mx-auto text-center bg-black/60 rounded-lg px-3 py-1.5">
              {subtitleEn && (
                <p className="text-white text-sm md:text-base font-medium leading-relaxed">
                  {subtitleEn}
                </p>
              )}
              {subtitleZh && (
                <p className="text-white/80 text-xs md:text-sm leading-relaxed mt-0.5">
                  {subtitleZh}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    );
  },
);

YouTubeEmbedPlayer.displayName = 'YouTubeEmbedPlayer';
