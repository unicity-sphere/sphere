import { useEffect, useState } from 'react';
import { Mic, Volume2, Video, ChevronDown, Play } from 'lucide-react';
import { useCall } from './useCall';

interface DeviceList {
  audioIn: MediaDeviceInfo[];
  audioOut: MediaDeviceInfo[];
  videoIn: MediaDeviceInfo[];
}

const EMPTY_DEVICES: DeviceList = { audioIn: [], audioOut: [], videoIn: [] };

/**
 * Device selectors for runtime switching of microphone, speaker, and camera
 * during an active call. Pre-selects the system-default device for each
 * category. Speaker row includes a "play" button that emits a 440Hz test
 * tone to the currently selected output — useful to verify the chosen
 * speaker actually produces sound.
 */
export function DeviceSelector({ isVideoCall }: { isVideoCall: boolean }) {
  const {
    switchAudioInput, switchVideoInput, switchAudioOutput, playTestTone,
  } = useCall();
  const [devices, setDevices] = useState<DeviceList>(EMPTY_DEVICES);
  const [selectedAudioIn, setSelectedAudioIn] = useState<string>('');
  const [selectedAudioOut, setSelectedAudioOut] = useState<string>('');
  const [selectedVideoIn, setSelectedVideoIn] = useState<string>('');

  const supportsSinkId = typeof window !== 'undefined'
    && 'setSinkId' in HTMLAudioElement.prototype;

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const all = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) return;
        const list: DeviceList = {
          audioIn: all.filter(d => d.kind === 'audioinput'),
          audioOut: all.filter(d => d.kind === 'audiooutput'),
          videoIn: all.filter(d => d.kind === 'videoinput'),
        };
        setDevices(list);
        // Pre-select system defaults so the dropdown clearly shows what's
        // active. enumerateDevices typically returns a deviceId='default'
        // entry that points at the OS default device.
        setSelectedAudioIn(prev => prev || list.audioIn.find(d => d.deviceId === 'default')?.deviceId || '');
        setSelectedAudioOut(prev => prev || list.audioOut.find(d => d.deviceId === 'default')?.deviceId || '');
        setSelectedVideoIn(prev => prev || list.videoIn.find(d => d.deviceId === 'default')?.deviceId || '');
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
      />
      {supportsSinkId && (
        <DeviceRow
          Icon={Volume2}
          label="Speaker"
          value={selectedAudioOut}
          options={devices.audioOut}
          onChange={onAudioOut}
          actionButton={
            <button
              onClick={(e) => { e.stopPropagation(); playTestTone(); }}
              title="Play test tone through selected speaker"
              className="shrink-0 w-5 h-5 rounded flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors"
            >
              <Play className="w-3 h-3" />
            </button>
          }
        />
      )}
      {isVideoCall && (
        <DeviceRow
          Icon={Video}
          label="Camera"
          value={selectedVideoIn}
          options={devices.videoIn}
          onChange={onVideoIn}
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
  actionButton?: React.ReactNode;
}

function DeviceRow({ Icon, label, value, options, onChange, actionButton }: DeviceRowProps) {
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
          {options.length === 0 && <option value="" className="bg-neutral-900 text-white">(no devices)</option>}
          {options.map(d => (
            <option key={d.deviceId} value={d.deviceId} className="bg-neutral-900 text-white">
              {d.label || `(unlabeled ${d.deviceId.slice(0, 8)})`}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-white/50 pointer-events-none" />
      </div>
      {actionButton}
    </div>
  );
}
