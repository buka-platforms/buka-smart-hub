import { jotaiStore, onlineRadioBoxAudioStateAtom } from "@/data/store";
import Hls from "hls.js";

const VOLUME_KEY = `widgetOnlineRadioBoxNowPlayingVolume`;

let hls: Hls | null = null;

let handlePlayRef: (() => void) | null = null;
let handlePauseRef: (() => void) | null = null;

export const setupOnlineRadioBoxAudio = () => {
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  if (!state.audio) {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";

    // load saved volume if present
    try {
      const saved = localStorage.getItem(VOLUME_KEY);
      if (saved !== null) {
        const v = Number(saved);
        if (!Number.isNaN(v)) {
          audio.volume = Math.min(1, Math.max(0, v / 100));
        }
      }
    } catch {
      /* ignore */
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
      ...prev,
      audio,
      volume: audio.volume,
    }));
  }
};

export const playOnlineRadioStream = async (
  streamUrl: string,
  type: number = 1,
  radioId?: string | null,
) => {
  setupOnlineRadioBoxAudio();
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;

  if (!audio) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
    ...prev,
    isLoading: true,
  }));

  if (type === 2 && Hls.isSupported()) {
    if (hls) {
      try {
        hls.destroy();
      } catch {}
      hls = null;
    }
    hls = new Hls();
    hls.loadSource(streamUrl);
    hls.attachMedia(audio);
  } else {
    // detach any existing hls
    if (hls) {
      try {
        hls.stopLoad();
        hls.detachMedia();
        hls.destroy();
      } catch {}
      hls = null;
    }
    audio.src = streamUrl;
  }

  try {
    const p = audio.play();
    if (p) await p;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: true,
      isLoading: false,
      lastStream: streamUrl,
      lastRadioId: radioId ?? null,
    }));

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (err) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
      isPlaying: false,
    }));
  }
};

export const stopOnlineRadio = () => {
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (audio) {
    audio.pause();
    try {
      audio.removeAttribute("src");
    } catch {}
  }

  if (hls) {
    try {
      hls.stopLoad();
      hls.detachMedia();
      hls.destroy();
    } catch {}
    hls = null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
    ...prev,
    isPlaying: false,
    isLoading: false,
  }));
};

export const setOnlineRadioVolume = (percent: number) => {
  setupOnlineRadioBoxAudio();
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  const v = Math.min(100, Math.max(0, Math.round(percent)));
  if (audio) audio.volume = v / 100;
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
    ...prev,
    volume: v / 100,
  }));
};

export const attachOnlineRadioListeners = () => {
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (!audio) return;
  if (handlePlayRef || handlePauseRef) return; // already attached

  handlePlayRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: true,
      isLoading: false,
    }));
  handlePauseRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(onlineRadioBoxAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: false,
    }));

  audio.addEventListener("playing", handlePlayRef);
  audio.addEventListener("pause", handlePauseRef);
};

export const detachOnlineRadioListeners = () => {
  const state = jotaiStore.get(onlineRadioBoxAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (!audio) return;
  try {
    if (handlePlayRef) audio.removeEventListener("playing", handlePlayRef);
    if (handlePauseRef) audio.removeEventListener("pause", handlePauseRef);
    handlePlayRef = null;
    handlePauseRef = null;
  } catch {}
};

const onlineRadio = {
  setupOnlineRadioBoxAudio,
  playOnlineRadioStream,
  stopOnlineRadio,
  setOnlineRadioVolume,
  attachOnlineRadioListeners,
  detachOnlineRadioListeners,
};

export default onlineRadio;
