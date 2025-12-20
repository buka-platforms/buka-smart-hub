import type {
  AudioVisualizationOptions,
  RadioStation,
  Unsplash,
} from "@/data/type";
import { RequestHeaders as RequestHeadersType } from "@/data/type";
import type Hls from "hls.js";
import { atom, createStore } from "jotai";
import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

export const jotaiStore = createStore();

export const mediaAudio = writable(
  undefined as HTMLAudioElement | null | undefined,
);

export const mediaAudioCORS = writable(
  undefined as HTMLAudioElement | null | undefined,
);
export const hls = writable(undefined as Hls | null | undefined);
export const mediaAudioContext = writable(
  undefined as AudioContext | null | undefined,
);
export const requestHeaders = writable(
  undefined as RequestHeadersType | null | undefined,
);
export const backgroundImageStateAtom = atom({
  isLoading: false,
  isLoaded: false,
  isFollowsCoverArt: false,
});
export const mediaAudioStateAtom = atom({
  isLoading: false,
  isPlaying: false,
  contextCreated: false,
});
export const audioTrackStateAtom = atom({
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
});

export const radioStation: Writable<RadioStation | null | undefined> =
  writable(undefined); // Selected (or randomly selected) radio station, but can be currently playing or not
export const radioStationPlaying: Writable<RadioStation | null | undefined> =
  writable(undefined); // Radio station that is currently playing
export const isRadioStationCORSProblem = writable(false);
export const isRadioStationLogoLoaded = writable(false);
export const randomBackgroundImage: Writable<Unsplash | null | undefined> =
  writable(undefined);
export const tmpRandomBackgroundImage: Writable<Unsplash | null | undefined> =
  writable(undefined);
export const audioVisualizationOptions: Writable<AudioVisualizationOptions> =
  writable({
    preferredBarWidth: 32,
    forcePreferredBarWidth: false,
    barSpacing: 1,
    color: `rainbow${Math.floor(Math.random() * 4) + 1}`,
    rainbowOpacity: 0.4,
    element: `canvas#vis-canvas`,
    height: null,
    width: null, // If set, will use, else will use parent width
    numBars: null, // If set, will use, else will calculate from bar width
    hideIfZero: true,
    consecutiveZeroesLimit: 0,
  });
