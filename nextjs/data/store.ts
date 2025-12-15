import type {
  AudioVisualizationOptions,
  RadioStation,
  UnsplashType,
} from "@/data/type";
import { RequestHeaders as RequestHeadersType } from "@/data/type";
import type Hls from "hls.js";
import { writable } from "svelte/store";
import type { Writable } from "svelte/store";

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
export const isBackgroundImageLoading = writable(false);
export const isBackgroundImageLoaded = writable(false);
export const isMediaAudioContextCreated = writable(false);
export const isMediaAudioLoading = writable(false);
export const isMediaAudioPlaying = writable(false);
export const isMediaAudioMetadataExists = writable(false); // Means title, artist, album, artwork exists
export const isMediaAudioMetadataImageLoaded = writable(false);
export const isBackgroundImageFollowsCoverArt = writable(false);
export const currentTrackMetadata = writable(undefined);
export const currentExternalTrackDetails = writable(undefined);
export const previousTrackTitle = writable("");
export const currentTrackTitle = writable("");
export const animationId = writable<number | null | undefined>(undefined);
export const canvasAudioVisualization = writable<HTMLCanvasElement | null>(
  null,
);
export const intervalIdTrackMetadata: Writable<
  NodeJS.Timeout | null | undefined
> = writable(undefined);
export const radioStation: Writable<RadioStation | null | undefined> =
  writable(undefined); // Selected (or randomly selected) radio station, but can be currently playing or not
export const radioStationPlaying: Writable<RadioStation | null | undefined> =
  writable(undefined); // Radio station that is currently playing
export const isRadioStationCORSProblem = writable(false);
export const isRadioStationLogoLoaded = writable(false);
export const exposedTrackTitle = writable("");
export const exposedTrackArtist = writable("");
export const exposedTrackAlbum = writable("");
export const exposedTrackArtwork = writable("");
export const exposedTrackTitleOnly = writable(""); // This is the track title to be displayed when title exists, but artist, album, artwork doesn't exist
export const randomBackgroundImage: Writable<UnsplashType | null | undefined> =
  writable(undefined);
export const tmpRandomBackgroundImage: Writable<
  UnsplashType | null | undefined
> = writable(undefined);
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
export const audioSourceNode = writable(
  undefined as MediaElementAudioSourceNode | null | undefined,
);
export const audioAnalyserNode = writable(
  undefined as AnalyserNode | null | undefined,
);
export const audioFrequencyData = writable(
  undefined as Uint8Array | null | undefined,
);
