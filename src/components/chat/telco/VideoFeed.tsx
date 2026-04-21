import { useEffect, useRef } from 'react';

interface VideoFeedProps {
  stream: MediaStream | null;
  muted?: boolean;
  mirror?: boolean;
  className?: string;
}

export function VideoFeed({ stream, muted = false, mirror = false, className = '' }: VideoFeedProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    // Explicitly play to ensure audio is not blocked by autoplay policy.
    // The user has already interacted (clicked call/accept) so this should succeed.
    if (stream) {
      video.play().catch(() => {});
    }
    return () => {
      video.pause();
      video.srcObject = null;
    };
  }, [stream]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      muted={muted}
      className={`object-cover ${mirror ? 'scale-x-[-1]' : ''} ${className}`}
    />
  );
}
