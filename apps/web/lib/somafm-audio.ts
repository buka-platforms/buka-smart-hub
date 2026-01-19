import { jotaiStore, somafmAudioStateAtom } from "@/data/store";

const VOLUME_KEY = `widgetSomaFMVolume`;

let handlePlayRef: (() => void) | null = null;
let handlePauseRef: (() => void) | null = null;
let handleWaitingRef: (() => void) | null = null;
let handleStalledRef: (() => void) | null = null;
let handleCanPlayRef: (() => void) | null = null;
let handleCanPlayThroughRef: (() => void) | null = null;
let handleErrorRef: (() => void) | null = null;
let handleEndedRef: (() => void) | null = null;

export const setupSomaFMAudio = () => {
  const state = jotaiStore.get(somafmAudioStateAtom);
  if (!state.audio) {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";

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
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      audio,
      volume: audio.volume,
    }));
  }
};

export const playSomaFMStream = async (
  streamUrl: string,
  channelId?: string | null,
) => {
  setupSomaFMAudio();
  const state = jotaiStore.get(somafmAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (!audio) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
    ...prev,
    isLoading: true,
  }));

  try {
    // assign source
    audio.src = streamUrl;
    const p = audio.play();
    if (p) await p;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: true,
      isLoading: false,
      lastStream: streamUrl,
      lastChannelId: channelId ?? null,
    }));
  } catch {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
      isPlaying: false,
    }));
  }
};

export const stopSomaFM = () => {
  const state = jotaiStore.get(somafmAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (audio) {
    audio.pause();
    try {
      audio.removeAttribute("src");
    } catch {}
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
    ...prev,
    isPlaying: false,
    isLoading: false,
  }));
};

export const setSomaFMVolume = (percent: number) => {
  setupSomaFMAudio();
  const state = jotaiStore.get(somafmAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  const v = Math.min(100, Math.max(0, Math.round(percent)));
  if (audio) audio.volume = v / 100;
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {}
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
    ...prev,
    volume: v / 100,
  }));
};

export const attachSomaFMListeners = () => {
  const state = jotaiStore.get(somafmAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (!audio) return;
  if (handlePlayRef || handlePauseRef) return;

  handlePlayRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: true,
      isLoading: false,
    }));
  handlePauseRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isPlaying: false,
    }));

  handleWaitingRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: true,
    }));
  handleStalledRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: true,
    }));
  handleCanPlayRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
    }));
  handleCanPlayThroughRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
    }));
  handleErrorRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
      isPlaying: false,
    }));
  handleEndedRef = () =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jotaiStore.set(somafmAudioStateAtom, (prev: any) => ({
      ...prev,
      isLoading: false,
      isPlaying: false,
    }));

  audio.addEventListener("playing", handlePlayRef);
  audio.addEventListener("pause", handlePauseRef);
  audio.addEventListener("waiting", handleWaitingRef);
  audio.addEventListener("stalled", handleStalledRef);
  audio.addEventListener("canplay", handleCanPlayRef);
  audio.addEventListener("canplaythrough", handleCanPlayThroughRef);
  audio.addEventListener("error", handleErrorRef);
  audio.addEventListener("ended", handleEndedRef);
};

export const detachSomaFMListeners = () => {
  const state = jotaiStore.get(somafmAudioStateAtom);
  const audio = state.audio as HTMLAudioElement | undefined | null;
  if (!audio) return;
  try {
    if (handlePlayRef) audio.removeEventListener("playing", handlePlayRef);
    if (handlePauseRef) audio.removeEventListener("pause", handlePauseRef);
    if (handleWaitingRef)
      audio.removeEventListener("waiting", handleWaitingRef);
    if (handleStalledRef)
      audio.removeEventListener("stalled", handleStalledRef);
    if (handleCanPlayRef)
      audio.removeEventListener("canplay", handleCanPlayRef);
    if (handleCanPlayThroughRef)
      audio.removeEventListener("canplaythrough", handleCanPlayThroughRef);
    if (handleErrorRef) audio.removeEventListener("error", handleErrorRef);
    if (handleEndedRef) audio.removeEventListener("ended", handleEndedRef);
    handlePlayRef = null;
    handlePauseRef = null;
    handleWaitingRef = null;
    handleStalledRef = null;
    handleCanPlayRef = null;
    handleCanPlayThroughRef = null;
    handleErrorRef = null;
    handleEndedRef = null;
  } catch {}
};

const soma = {
  setupSomaFMAudio,
  playSomaFMStream,
  stopSomaFM,
  setSomaFMVolume,
  attachSomaFMListeners,
  detachSomaFMListeners,
};

export default soma;
