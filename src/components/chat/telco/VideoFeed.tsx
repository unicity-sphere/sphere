import { useEffect, useRef } from 'react';

interface VideoFeedProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  /**
   * 'cover'   — fill, crop edges (good for selfie PiP)
   * 'contain' — letterbox, show full frame (good for the main remote video)
   */
  fit?: 'cover' | 'contain';
  className?: string;
}

export function VideoFeed({ stream, muted = false, mirror = false, fit = 'cover', className = '' }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      video.play().catch(() => {});
    }
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  const fitClass = fit === 'contain' ? 'object-contain' : 'object-cover';

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`${fitClass} ${mirror ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}
