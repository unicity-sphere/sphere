import { useEffect, useState } from 'react';
import { Mic, Volume2, Video, ChevronDown } from 'lucide-react';
import { useCall } from './useCall';

interface DeviceList {
  audioIn: MediaDeviceInfo[];
  audioOut: MediaDeviceInfo[];
  videoIn: MediaDeviceInfo[];
}

const EMPTY_DEVICES: DeviceList = { audioIn: [], audioOut: [], videoIn: [] };

/**
 * Device selectors for runtime switching of microphone, speaker, and camera
 * during an active call. Uses MediaStreamTrack.replaceTrack() under the hood
 * (no SDP renegotiation), and audio.setSinkId() for output redirection.
 *
 * Output (speaker) selector is Chrome-only — hidden on browsers without
 * setSinkId support.
 */
export function DeviceSelector({ isVideoCall }: { isVideoCall: boolean }) {
  const { switchAudioInput, switchVideoInput, switchAudioOutput } = useCall();
  const [devices, setDevices] = useState<DeviceList>(EMPTY_DEVICES);
  const [selectedAudioIn, setSelectedAudioIn] = useState<string>('');
  const [selectedAudioOut, setSelectedAudioOut] = useState<string>('');
  const [selectedVideoIn, setSelectedVideoIn] = useState<string>('');

  // Detect setSinkId support once (Chrome/Edge yes, Firefox/Safari no)
  const supportsSinkId = typeof window !== 'undefined'
    && 'setSinkId' in HTMLAudioElement.prototype;

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        setDevices({
          audioIn: all.filter(d => d.kind === 'audioinput'),
          audioOut: all.filter(d => d.kind === 'audiooutput'),
          videoIn: all.filter(d => d.kind === 'videoinput'),
        });
      } catch (err) {
        console.warn('[telco] enumerateDevices failed:', err);
      }
    };
    refresh();
    navigator.mediaDevices.addEventListener('devicechange', refresh);
    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener('devicechange', refresh);
    };
  }, []);

  const onAudioIn = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAudioIn(id);
    try { await switchAudioInput(id); }
    catch (err) { console.warn('[telco] switchAudioInput failed:', err); }
  };

  const onAudioOut = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedAudioOut(id);
    try { await switchAudioOutput(id); }
    catch (err) { console.warn('[telco] switchAudioOutput failed:', err); }
  };

  const onVideoIn = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = e.target.value;
    setSelectedVideoIn(id);
    try { await switchVideoInput(id); }
    catch (err) { console.warn('[telco] switchVideoInput failed:', err); }
  };

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2 rounded-xl bg-black/40 backdrop-blur-sm text-white text-[11px]">
      <DeviceRow
        Icon={Mic}
        label="Mic"
        value={selectedAudioIn}
        options={devices.audioIn}
        onChange={onAudioIn}
        emptyLabel="(default)"
      />
      {supportsSinkId && (
        <DeviceRow
          Icon={Volume2}
          label="Speaker"
          value={selectedAudioOut}
          options={devices.audioOut}
          onChange={onAudioOut}
          emptyLabel="(default)"
        />
      )}
      {isVideoCall && (
        <DeviceRow
          Icon={Video}
          label="Camera"
          value={selectedVideoIn}
          options={devices.videoIn}
          onChange={onVideoIn}
          emptyLabel="(default)"
        />
      )}
    </div>
  );
}

interface DeviceRowProps {
  Icon: typeof Mic;
  label: string;
  value: string;
  options: MediaDeviceInfo[];
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  emptyLabel: string;
}

function DeviceRow({ Icon, label, value, options, onChange, emptyLabel }: DeviceRowProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-3 h-3 shrink-0" />
      <span className="w-12 shrink-0 text-white/60">{label}</span>
      <div className="relative flex-1 min-w-0">
        <select
          value={value}
          onChange={onChange}
          className="w-full appearance-none bg-white/10 hover:bg-white/15 text-white text-[11px] rounded px-2 py-0.5 pr-6 cursor-pointer focus:outline-none focus:ring-1 focus:ring-orange-500/50 truncate"
        >
          <option value="" className="bg-neutral-900 text-white">{emptyLabel}</option>
          {options.map(d => (
            <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900 text-white">
              {d.label || `(unlabeled ${d.deviceId.slice(0, 8)})`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 pointer-events-none" />
      </div>
    </div>
  );
}
