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
export const mediaAudioStateAtom = atom({
  isLoading: false,
  isPlaying: false,
  contextCreated: false,
  mediaAudio: undefined as HTMLAudioElement | null | undefined,
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

// Widget Launcher Dock State
export type WidgetId = "time" | "radio" | "weather" | "somafm";

export const widgetVisibilityAtom = atom<Record<WidgetId, boolean>>({
  time: true,
  radio: true,
  weather: true,
  somafm: true,
});
