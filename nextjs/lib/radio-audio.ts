import { transparent1x1Pixel } from "@/data/general";
import {
  jotaiStore,
  radioAudioStateAtom,
  radioStationStateAtom,
} from "@/data/store";
import {
  initAudioVisualization,
  renderAudioVisualization,
  stopAudioVisualization,
} from "@/lib/audio-visualizer";
import {
  startPeriodicGetTrackMetadata,
  stopPeriodicGetTrackMetadata,
} from "@/lib/radio-track-metadata";
import Hls from "hls.js";

// Storage keys
export const WIDGET_RADIO_PLAYER_STATION_SLUG_KEY =
  "widgetRadioPlayerStationSlug";

let isRadioStationCORSProblem: boolean = false;
let mediaAudioCors: HTMLAudioElement | null | undefined = undefined;
let hls: Hls | null | undefined = undefined;

export const setupRadioAudio = () => {
  if (!jotaiStore.get(radioAudioStateAtom).radioAudio) {
    const radioAudio = new Audio();
    radioAudio.crossOrigin = "anonymous";

    jotaiStore.set(radioAudioStateAtom, (prev) => ({
      ...prev,
      radioAudio: radioAudio,
    }));

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.attachMedia(radioAudio);
    }

    if (localStorage) {
      // Get media audio volume from localStorage
      const volumeInLocalStorage = localStorage.getItem(
        "widgetRadioPlayerVolume",
      );

      // Convert volume 0-100 to 0-1
      if (volumeInLocalStorage) {
        radioAudio.volume = parseFloat(volumeInLocalStorage) / 100;
      } else {
        radioAudio.volume = 0.5;

        // Set media audio volume to localStorage
        localStorage.setItem("widgetRadioPlayerVolume", "50");
      }
    } else {
      radioAudio.volume = 0.5;
    }
  }
};

const resetStateWhenStop = () => {
  jotaiStore.set(radioAudioStateAtom, (prev) => ({
    ...prev,
    isPlaying: false,
    isLoading: false,
  }));
  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    metadataExists: false,
    exposedArtwork: transparent1x1Pixel,
    exposedAlbum: "",
    exposedArtist: "",
    exposedTitle: "",
    exposedTitleOnly: "",
    currentTitle: "",
    previousTitle: "",
    currentMetadata: undefined,
    metadataImageLoaded: false,
    isRadioStationLogoLoaded: false,
  }));
};

const getBukaRadioStream = async () => {
  // Fetch data in parallel
  const [results] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/radio/stream-detail`, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    }),
  ]);

  const station = await results.json();

  return station;
};

export const play = async (isChangeAddressBar = false) => {
  jotaiStore.set(radioAudioStateAtom, (prev) => ({
    ...prev,
    isLoading: true,
  }));

  const radioStation = jotaiStore.get(radioStationStateAtom).radioStation;
  const radioAudio = jotaiStore.get(radioAudioStateAtom).radioAudio;

  // Override the url if the radio station is https://buka.sh/radio/stream, call https://buka.sh/radio/streams to get the random stream with its metadata
  if (radioStation?.slug === "buka") {
    const originalRadioStation = radioStation;

    const station = await getBukaRadioStream();

    originalRadioStation.radio_stations_radio_streams[0].radio_stream.url =
      station.stream_url;
    originalRadioStation.radio_stations_radio_streams[0].radio_stream.metadata_url =
      station.metadata_url;

    jotaiStore.set(radioStationStateAtom, (prev) => ({
      ...prev,
      radioStation: originalRadioStation,
    }));
  }

  const url = radioStation?.radio_stations_radio_streams[0]?.radio_stream?.url;

  if (radioStation?.radio_stations_radio_streams[0]?.radio_stream?.type === 2) {
    // Set radioAudio to empty src
    if (radioAudio) {
      radioAudio.removeAttribute("src");
    }

    // Load the source to hls
    hls?.loadSource(url as string);
    if (radioAudio) {
      hls?.attachMedia(radioAudio);
    }
  } else if (
    jotaiStore.get(radioStationStateAtom).radioStation
      ?.radio_stations_radio_streams[0]?.radio_stream?.type === 1
  ) {
    // Set hls source to null
    if (hls) {
      hls.stopLoad();
      hls.detachMedia();
    }

    if (radioAudio) {
      radioAudio.src = url as string;
    }
  }

  await checkRadioStationCORS(
    url as string,
    radioStation?.radio_stations_radio_streams[0]?.radio_stream?.type as number,
  );

  if (isRadioStationCORSProblem) {
    const audio = new Audio();
    audio.src = url as string;

    mediaAudioCors = audio;
  }

  if (!isRadioStationCORSProblem) {
    initAudioVisualization();
    renderAudioVisualization();
  }

  const playPromise = !isRadioStationCORSProblem
    ? radioAudio?.play()
    : mediaAudioCors?.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // Set the state, isPlaying = true and isLoading = false
        jotaiStore.set(radioAudioStateAtom, (prev) => ({
          ...prev,
          isLoading: false,
          isPlaying: true,
        }));

        // Periodically get track metadata when the radio is playing (7s)
        startPeriodicGetTrackMetadata(7000);

        // Set widgetRadioPlayerStationSlug to localStorage
        if (localStorage) {
          localStorage.setItem(
            WIDGET_RADIO_PLAYER_STATION_SLUG_KEY,
            radioStation?.slug as string,
          );
        }

        // Change address bar
        if (isChangeAddressBar) {
          history.pushState({}, "", `/radio/${radioStation?.slug}`);
        }

        // Send virtual page view event to Google Analytics
        if (window && window.gtag) {
          window.gtag("event", "page_view", {
            page_title: `Play ${radioStation?.name} from ${radioStation?.country?.name_alias}`,
            page_location: window.location.href,
            page_path: window.location.pathname,
          });
        }
      })
      .catch(async () => {
        jotaiStore.set(radioAudioStateAtom, (prev) => ({
          ...prev,
          isLoading: false,
        }));

        // playRandom(isChangeAddressBar);

        // Set radio to default radio, defined in NEXT_PUBLIC_DEFAULT_RADIO_STATION_SLUG
        await loadRadioStationBySlug(
          process.env.NEXT_PUBLIC_DEFAULT_RADIO_STATION_SLUG as string,
        );

        // Play the default radio station
        play(isChangeAddressBar);
      });
  } else {
    jotaiStore.set(radioAudioStateAtom, (prev) => ({
      ...prev,
      isLoading: false,
    }));
  }
};

export const stop = async () => {
  // Reset the state
  resetStateWhenStop();

  const radioAudio = jotaiStore.get(radioAudioStateAtom).radioAudio;

  radioAudio?.pause();
  radioAudio?.removeAttribute("src");

  mediaAudioCors?.pause();
  mediaAudioCors?.removeAttribute("src");

  stopPeriodicGetTrackMetadata();

  stopAudioVisualization();

  // Resume metadata polling at idle cadence (60s) after stopping playback
  await startPeriodicGetTrackMetadata(60000);

  // Send virtual page view event to Google Analytics
  if (window && window.gtag) {
    window.gtag("event", "page_view", {
      page_title: `Stop playing ${jotaiStore.get(radioStationStateAtom).radioStation?.name} from ${jotaiStore.get(radioStationStateAtom).radioStation?.country?.name_alias}`,
      page_location: window.location.href,
      page_path: window.location.pathname,
    });
  }
};

const handleEventAudioCanPlayThrough = () => {
  // This is the best practice of event indicator that we can play the audio
};

const handleEventAudioError = () => {
  // This is the best practice of event indicator that the audio cannot be played
};

export const handleEventAudioPlaying = () => {
  jotaiStore.set(radioAudioStateAtom, (prev) => ({
    ...prev,
    isPlaying: true,
    isLoading: false,
  }));
};

export const attachMediaAudioListeners = () => {
  const radioAudio = jotaiStore.get(radioAudioStateAtom).radioAudio;

  if (radioAudio) {
    radioAudio.addEventListener(
      "canplaythrough",
      handleEventAudioCanPlayThrough,
    );
    radioAudio.addEventListener("error", handleEventAudioError);
    radioAudio.addEventListener("playing", handleEventAudioPlaying);
  }
};

export const detachMediaAudioListeners = () => {
  const radioAudio = jotaiStore.get(radioAudioStateAtom).radioAudio;

  if (radioAudio) {
    radioAudio.removeEventListener(
      "canplaythrough",
      handleEventAudioCanPlayThrough,
    );
    radioAudio.removeEventListener("error", handleEventAudioError);
    radioAudio.removeEventListener("playing", handleEventAudioPlaying);
  }
};

export const loadRadioStationById = async (dataId: string) => {
  // Fetch data in parallel
  const [radioStationResult] = await Promise.all([
    fetch(`${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?id=${dataId}`, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    }),
  ]);

  const radioStation = await radioStationResult.json();

  // Check if the radio station is not found, on Buka it will return an object with errors key
  if (radioStation.status === 1) {
    return;
  }

  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    radioStation: radioStation.data,
  }));

  // If not playing yet, poll metadata at idle cadence (60s)
  if (!jotaiStore.get(radioAudioStateAtom).isPlaying) {
    await startPeriodicGetTrackMetadata(60000);
  }
};

export const loadRadioStationBySlug = async (dataSlug: string) => {
  // Fetch data in parallel
  const [radioStationResult] = await Promise.all([
    fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?slug=${dataSlug}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    ),
  ]);

  const radioStation = await radioStationResult.json();

  // Check if the radio station is not found, on Buka it will return an object with errors key
  if (radioStation.status === 1) {
    return;
  }

  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    radioStation: radioStation.data,
  }));

  // If not playing yet, poll metadata at idle cadence (60s)
  if (!jotaiStore.get(radioAudioStateAtom).isPlaying) {
    await startPeriodicGetTrackMetadata(60000);
  }
};

export const checkRadioStationCORS = async (
  streamUrl: string,
  type: number,
): Promise<boolean> => {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.crossOrigin = "anonymous";

    audio.addEventListener("error", () => {
      isRadioStationCORSProblem = true;
      resolve(false); // Resolve with error flag
    });
    audio.addEventListener("canplay", () => {
      isRadioStationCORSProblem = false;
      resolve(true); // Resolve with success flag
    });

    if (Hls.isSupported() && type === 2) {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(audio);
    } else if (type === 1) {
      audio.src = streamUrl;
      audio.load();
    }
  });
};
