import { Mic, Volume2 } from 'lucide-react';
import { useCallStore } from './callStore';

/**
 * Real-time audio level meter showing local microphone amplitude (top bar)
 * and incoming remote audio amplitude (bottom bar). 0-100% horizontal fill,
 * color-coded: green during normal speech, yellow on peaks, red on clip.
 *
 * If the LOCAL bar stays at 0% while you speak: your mic is silent
 * (system-level mute, wrong device, denied permission).
 *
 * If the REMOTE bar stays at 0% while peer speaks: their mic is silent.
 * If REMOTE shows activity but you hear nothing: speaker output is muted
 * or routed to wrong device (system-level).
 */
export function AudioLevelMeter() {
  const localLevel = useCallStore(s => s.localAudioLevel);
  const remoteLevel = useCallStore(s => s.remoteAudioLevel);

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm text-white text-[11px] font-mono min-w-[200px]">
      <div className="flex items-center gap-2">
        <Mic className="w-3 h-3 shrink-0" />
        <span className="w-10 shrink-0 text-white/60">Mic</span>
        <LevelBar level={localLevel} />
        <span className="w-12 shrink-0 text-right tabular-nums">{(localLevel * 100).toFixed(0)}%</span>
      </div>
      <div className="flex items-center gap-2">
        <Volume2 className="w-3 h-3 shrink-0" />
        <span className="w-10 shrink-0 text-white/60">Recv</span>
        <LevelBar level={remoteLevel} />
        <span className="w-12 shrink-0 text-right tabular-nums">{(remoteLevel * 100).toFixed(0)}%</span>
      </div>
    </div>
  );
}

function LevelBar({ level }: { level: number }) {
  const pct = Math.max(0, Math.min(1, level)) * 100;
  const color = pct > 85 ? 'bg-red-500'
    : pct > 60 ? 'bg-yellow-400'
    : pct > 5 ? 'bg-green-400'
    : 'bg-white/15';
  return (
    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
      <div
        className={`h-full ${color} transition-[width] duration-75`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
