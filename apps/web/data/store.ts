import type {
  RadioStation,
  RequestHeaders,
  Unsplash,
  UserSession,
} from "@/data/type";
import { atom, createStore } from "jotai";

export const jotaiStore = createStore();

export const userSessionStateAtom = atom(
  undefined as UserSession | null | undefined,
);
export const requestHeadersStateAtom = atom(
  undefined as RequestHeaders | null | undefined,
);
export const backgroundImageStateAtom = atom({
  isLoading: false,
  isLoaded: false,
  isFollowsCoverArt: false,
  randomBackgroundImage: undefined as Unsplash | null | undefined,
  tmpRandomBackgroundImage: undefined as Unsplash | null | undefined,
});
export const radioAudioStateAtom = atom({
  isLoading: false,
  isPlaying: false,
  contextCreated: false,
  radioAudio: undefined as HTMLAudioElement | null | undefined,
});
export const radioStationStateAtom = atom({
  metadataExists: false,
  metadataImageLoaded: false,
  currentMetadata: undefined,
  currentExternalDetails: undefined,
  previousTitle: "",
  currentTitle: "",
  exposedTitle: "",
  exposedArtist: "",
  exposedAlbum: "",
  exposedArtwork: "",
  exposedTitleOnly: "", // This is the track title to be displayed when title exists, but artist, album, artwork doesn't exist
  radioStation: <RadioStation | null | undefined>undefined, // Selected (or randomly selected) radio station, but can be currently playing or not
  isRadioStationLogoLoaded: false,
});

// OnlineRadioBox audio state (per-widget audio controller)
export const onlineRadioBoxAudioStateAtom = atom({
  isLoading: false,
  isPlaying: false,
  audio: undefined as HTMLAudioElement | null | undefined,
  volume: 0.5,
  lastStream: null as string | null,
  lastRadioId: null as string | null,
});

// SomaFM audio state (shared audio controller for SomaFM widget)
export const somafmAudioStateAtom = atom({
  isLoading: false,
  isPlaying: false,
  audio: undefined as HTMLAudioElement | null | undefined,
  volume: 0.5,
  lastStream: null as string | null,
  lastChannelId: null as string | null,
});

// Widget Launcher Dock State
export type WidgetId =
  | "time"
  | "radio"
  | "weather"
  | "somafm"
  | "musicpreview"
  | "iptv"
  | "youtubelivetv"
  | "quran"
  | "pomodoro"
  | "onlineradioboxnowplaying";

export const widgetVisibilityAtom = atom<Record<WidgetId, boolean>>({
  time: true,
  radio: true,
  weather: true,
  somafm: true,
  musicpreview: true,
  quran: true,
  iptv: true,
  youtubelivetv: true,
  pomodoro: true,
  onlineradioboxnowplaying: true,
});
