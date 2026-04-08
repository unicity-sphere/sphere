import { useState, useEffect } from 'react';

interface CallTimerProps {
  connectedAt: number;
}

export function CallTimer({ connectedAt }: CallTimerProps) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - connectedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [connectedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <span className="text-sm text-white/80 font-mono tabular-nums">{display}</span>
  );
}
