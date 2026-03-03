import { forwardRef, useImperativeHandle, useRef, useEffect } from 'react';

export interface VideoPlayerHandle {
  play: () => void;
  pause: () => void;
  seekTo: (time: number) => void;
  setRate: (rate: number) => void;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  src: string;
  onTimeUpdate: (time: number) => void;
  onEnded: () => void;
  onPlay: () => void;
  onPause: () => void;
  subtitleEn?: string;
  subtitleZh?: string;
}

export const VideoPlayer = forwardRef<VideoPlayerHandle, VideoPlayerProps>(
  ({ src, onTimeUpdate, onEnded, onPlay, onPause, subtitleEn, subtitleZh }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const animFrameRef = useRef<number>(0);

    useImperativeHandle(ref, () => ({
      play() {
        videoRef.current?.play();
      },
      pause() {
        videoRef.current?.pause();
      },
      seekTo(time: number) {
        if (videoRef.current) {
          videoRef.current.currentTime = time;
        }
      },
      setRate(rate: number) {
        if (videoRef.current) {
          videoRef.current.playbackRate = rate;
        }
      },
      getCurrentTime() {
        return videoRef.current?.currentTime || 0;
      },
    }));

    useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      let running = true;

      function tick() {
        if (!running) return;
        if (video && !video.paused) {
          onTimeUpdate(video.currentTime);
        }
        animFrameRef.current = requestAnimationFrame(tick);
      }

      animFrameRef.current = requestAnimationFrame(tick);

      return () => {
        running = false;
        cancelAnimationFrame(animFrameRef.current);
      };
    }, [onTimeUpdate]);

    const hasSubtitle = subtitleEn || subtitleZh;

    return (
      <div className="relative w-full">
        <video
          ref={videoRef}
          src={src}
          className="w-full aspect-video"
          onEnded={onEnded}
          onPlay={onPlay}
          onPause={onPause}
          playsInline
        />

        {hasSubtitle && (
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none px-4 pb-4">
            <div className="max-w-[90%] mx-auto text-center">
              {subtitleEn && (
                <p
                  className="text-white text-sm md:text-base font-medium leading-relaxed"
                  style={{
                    textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7)',
                  }}
                >
                  {subtitleEn}
                </p>
              )}
              {subtitleZh && (
                <p
                  className="text-white/80 text-xs md:text-sm leading-relaxed mt-0.5"
                  style={{
                    textShadow: '0 1px 4px rgba(0,0,0,0.9), 0 0 12px rgba(0,0,0,0.7)',
                  }}
                >
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

VideoPlayer.displayName = 'VideoPlayer';
