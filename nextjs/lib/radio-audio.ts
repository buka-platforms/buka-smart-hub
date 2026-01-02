import {
  jotaiStore,
  radioAudioStateAtom,
  radioStationStateAtom,
} from "@/data/store";
import type { AudioVisualizationOptions } from "@/data/type";
import {
  startPeriodicGetTrackMetadata,
  stopPeriodicGetTrackMetadata,
} from "@/lib/track-metadata";
import Hls from "hls.js";

// Visualization state
const barColors: string[] = [];
let canvasElement: HTMLCanvasElement;
let previousCanvasElement: HTMLCanvasElement | null = null; // Track previous canvas for navigation detection
let numBars: number;
let barWidth: number;
let consZ = 0;
let usableLength = 250;
let audioAnalyserNode: AnalyserNode | null = null;
let audioFrequencyData: Uint8Array | null = null;

// OffscreenCanvas and Worker state
let visualizerWorker: Worker | null = null;
let useOffscreenCanvas = false;
let offscreenCanvasTransferred = false;
let frequencyDataIntervalId: ReturnType<typeof setInterval> | undefined;

// Fallback for browsers without OffscreenCanvas support
let canvasContext: CanvasRenderingContext2D | null = null;
let animationFrameId: number | undefined;

const rainbowMax = 6;
const audioVisualizationOptions: AudioVisualizationOptions = {
  preferredBarWidth: 32,
  forcePreferredBarWidth: false,
  barSpacing: 1,
  color: `rainbow${Math.floor(Math.random() * rainbowMax) + 1}`,
  rainbowOpacity: 0.4,
  element: `canvas#vis-canvas`,
  height: null,
  width: null, // If set, will use, else will use parent width
  numBars: null, // If set, will use, else will calculate from bar width
  hideIfZero: true,
  consecutiveZeroesLimit: 0,
};
let isRadioStationCORSProblem: boolean = false;
let mediaAudioCors: HTMLAudioElement | null | undefined = undefined;
let hls: Hls | null | undefined = undefined;
let visibilityHandlerAttached = false;
let resizeHandlerAttached = false;
let resizeDebounceTimeout: ReturnType<typeof setTimeout> | undefined;

// Check if OffscreenCanvas is supported (including Safari 16.4+ compatibility check)
const isOffscreenCanvasSupported = (): boolean => {
  if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") {
    return false;
  }

  // Additional check: verify transferControlToOffscreen is available
  // Some older Safari versions may have partial OffscreenCanvas support
  try {
    const testCanvas = document.createElement("canvas");
    if (typeof testCanvas.transferControlToOffscreen !== "function") {
      return false;
    }
  } catch {
    return false;
  }

  return true;
};

export const transparent1x1Pixel: string =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export {
  startPeriodicGetTrackMetadata as startIntervalGetTrackMetadata,
  stopPeriodicGetTrackMetadata as stopIntervalGetTrackMetadata,
};

export const randomizeRainbowColor = () => {
  const n = Math.floor(Math.random() * rainbowMax) + 1;
  audioVisualizationOptions.color = `rainbow${n}`;
};

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
      const volumeInLocalStorage = localStorage.getItem("radioAudioVolume");

      // Convert volume 0-100 to 0-1
      if (volumeInLocalStorage) {
        radioAudio.volume = parseFloat(volumeInLocalStorage) / 100;
      } else {
        radioAudio.volume = 0.5;

        // Set media audio volume to localStorage
        localStorage.setItem("radioAudioVolume", "50");
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

        // Periodically get track metadata when the radio is playing
        startPeriodicGetTrackMetadata();

        // Set radioStationSlug to localStorage
        if (localStorage) {
          localStorage.setItem(
            "radioStationSlug",
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

// export const playRandom = async (isChangeAddressBar = false) => {
//   if (!jotaiStore.get(radioAudioStateAtom).isLoading) {
//     await stop();

//     jotaiStore.set(radioAudioStateAtom, (prev) => ({
//       ...prev,
//       isLoading: true,
//     }));

//     // This is needed to reset the radio station name and logo, do not reset if path is not starts with /apps/radio
//     if (!window.location.pathname.startsWith("/apps/radio")) {
//       const dummyRadioStation = jotaiStore.get(
//         radioStationStateAtom,
//       ).radioStation;
//       if (dummyRadioStation) {
//         dummyRadioStation.name = "";
//         dummyRadioStation.logo = "";
//         dummyRadioStation.slug = "";
//         dummyRadioStation.country.name_alias = "";
//         dummyRadioStation.city = "";

//         jotaiStore.set(radioStationStateAtom, (prev) => ({
//           ...prev,
//           radioStation: dummyRadioStation,
//         }));
//       }
//     }

//     // await loadRandomRadioStation();

//     // Send virtual page view event to Google Analytics
//     if (window && window.gtag) {
//       window.gtag("event", "page_view", {
//         page_title: `Play random radio station`,
//         page_location: window.location.href,
//         page_path: window.location.pathname,
//       });
//     }

//     play(isChangeAddressBar);
//   }
// };

export const stop = async () => {
  // Reset the state
  resetStateWhenStop();

  const radioAudio = jotaiStore.get(radioAudioStateAtom).radioAudio;

  radioAudio?.pause();
  radioAudio?.removeAttribute("src");

  mediaAudioCors?.pause();
  mediaAudioCors?.removeAttribute("src");

  stopPeriodicGetTrackMetadata();

  // Stop frequency data sending
  if (frequencyDataIntervalId) {
    clearInterval(frequencyDataIntervalId);
    frequencyDataIntervalId = undefined;
  }

  // Stop visualization - OffscreenCanvas or fallback
  if (useOffscreenCanvas && visualizerWorker) {
    visualizerWorker.postMessage({ type: "stop" });
  } else {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = undefined;

      if (canvasContext) {
        if (canvasElement) {
          canvasContext.clearRect(
            0,
            0,
            canvasElement.width,
            canvasElement.height,
          );
        }
      }
    }
  }

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

// export const loadRandomRadioStation = async (countryAlpha2: string = "") => {
//   let baseUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?random=true`;

//   if (countryAlpha2 !== "") {
//     baseUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?random=true&cca2=${countryAlpha2}`;
//   }

//   // Fetch data in parallel
//   const [radioStationResult] = await Promise.all([
//     fetch(baseUrl, {
//       cache: "no-cache",
//       headers: {
//         "Content-Type": "application/json",
//       },
//     }),
//   ]);

//   const radioStation = await radioStationResult.json();

//   jotaiStore.set(radioStationStateAtom, (prev) => ({
//     ...prev,
//     radioStation: radioStation.data,
//   }));
// };

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
  // if (radioStation.status === 1) {
  //   await loadRandomRadioStation();
  //   return;
  // }

  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    radioStation: radioStation.data,
  }));
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
  // if (radioStation.status === 1) {
  //   await loadRandomRadioStation();
  //   return;
  // }

  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    radioStation: radioStation.data,
  }));
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

export const setupRadioAudioContext = () => {
  const radioAudio = jotaiStore.get(radioAudioStateAtom)
    .radioAudio as HTMLAudioElement;
  const audioContext = new AudioContext();
  const audioSourceNode = audioContext.createMediaElementSource(radioAudio);
  audioAnalyserNode = audioContext.createAnalyser();

  jotaiStore.set(radioAudioStateAtom, (prev) => ({
    ...prev,
    contextCreated: true,
  }));

  audioSourceNode.connect(audioAnalyserNode);
  audioAnalyserNode.connect(audioContext.destination);

  audioAnalyserNode.fftSize = 2048;
  audioAnalyserNode.smoothingTimeConstant = 0.8;
  audioAnalyserNode.minDecibels = -100;
  audioAnalyserNode.maxDecibels = -30;

  audioFrequencyData = new Uint8Array(audioAnalyserNode.frequencyBinCount);

  setupVisibilityHandler();
  setupResizeHandler();
};

// Helper function to generate bar colors
const generateBarColors = (
  numBars: number,
  options: AudioVisualizationOptions,
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < numBars; i++) {
    const frequency = 5 / numBars;

    if (options.color == "rainbow1") {
      // Sinusoidal RGB rainbow, or Classic RGB rainbow
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128); //actual rainbow
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow2") {
      // Shifted sinusoidal RGB rainbow, or Phase-shifted RGB rainbow, or Twisted RGB rainbow
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow3") {
      // Red-dominant sinusoidal RGB rainbow, or Red-lead RGB rainbow
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow4") {
      // Orange-lead sinusoidal RGB rainbow
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow5") {
      // Green-dominant sinusoidal RGB rainbow, or Green-lead RGB rainbow
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow6") {
      // Blue-dominant sinusoidal RGB rainbow, or Blue-lead RGB rainbow
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else {
      // Sinusoidal RGB rainbow, or Classic RGB rainbow
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128); //actual rainbow
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    }
  }
  return colors;
};

// Reset visualizer state when canvas element changes (e.g., Next.js navigation)
const resetVisualizerForNewCanvas = () => {
  // Stop frequency data transfer
  stopFrequencyDataTransfer();

  // Destroy the existing worker since it holds reference to old canvas
  if (visualizerWorker) {
    visualizerWorker.postMessage({ type: "destroy" });
    visualizerWorker.terminate();
    visualizerWorker = null;
  }

  // Reset state flags so a new transfer can happen
  offscreenCanvasTransferred = false;
  useOffscreenCanvas = false;
  canvasContext = null;

  // Cancel any pending animation frame (for fallback mode)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }
};

// Initialize the worker for OffscreenCanvas rendering
const initVisualizerWorker = () => {
  if (visualizerWorker) return;

  visualizerWorker = new Worker(
    new URL("./audio-visualizer.worker.ts", import.meta.url),
  );

  visualizerWorker.onmessage = (event: MessageEvent) => {
    const { type } = event.data;
    if (type === "initialized") {
      // Canvas transfer confirmed by worker
    }
  };

  visualizerWorker.onerror = (error) => {
    console.error("Visualizer worker error:", error);
    // Fallback to regular canvas rendering
    useOffscreenCanvas = false;
    offscreenCanvasTransferred = false;
  };
};

// Start sending frequency data to the worker
const startFrequencyDataTransfer = () => {
  if (frequencyDataIntervalId) return;

  // Send frequency data at ~60fps (approximately 16ms interval)
  frequencyDataIntervalId = setInterval(() => {
    if (
      audioAnalyserNode &&
      audioFrequencyData &&
      visualizerWorker &&
      useOffscreenCanvas
    ) {
      audioAnalyserNode.getByteFrequencyData(
        audioFrequencyData as Uint8Array<ArrayBuffer>,
      );

      // Calculate usable length based on consecutive zeroes
      const options = audioVisualizationOptions;
      const consZLim = options.consecutiveZeroesLimit;

      if (consZLim > 0) {
        for (let i = 0; i < audioFrequencyData.length; i++) {
          if (audioFrequencyData[i] === 0) {
            consZ++;
          } else {
            consZ = 0;
          }
          if (consZ >= consZLim) {
            setUsableLength(i - consZLim + 1);
            break;
          }
        }
      }

      // Send a copy of the frequency data to the worker
      visualizerWorker.postMessage({
        type: "frequencyData",
        data: {
          frequencyData: Array.from(audioFrequencyData),
          usableLength: usableLength,
        },
      });
    }
  }, 16);
};

// Stop sending frequency data to the worker
const stopFrequencyDataTransfer = () => {
  if (frequencyDataIntervalId) {
    clearInterval(frequencyDataIntervalId);
    frequencyDataIntervalId = undefined;
  }
};

export const initAudioVisualization = () => {
  const options = audioVisualizationOptions;
  const newCanvasElement = document.getElementById(
    "vis-canvas",
  ) as HTMLCanvasElement;

  if (!newCanvasElement) return;

  // Detect if canvas element changed (e.g., navigation in Next.js)
  // If the canvas element is different from the previous one, we need to reset
  const canvasChanged =
    previousCanvasElement !== null &&
    previousCanvasElement !== newCanvasElement;

  if (canvasChanged) {
    // Canvas element changed (navigation occurred)
    // Reset the worker and offscreen state to use the new canvas
    resetVisualizerForNewCanvas();
  }

  // Update the canvas element reference
  canvasElement = newCanvasElement;
  previousCanvasElement = newCanvasElement;

  if (canvasElement && canvasElement.parentElement) {
    if (!options.width) {
      options.width = canvasElement.parentElement.clientWidth;
    }

    if (!options.height) {
      options.height = canvasElement.parentElement.clientHeight;
    }
  }

  // Only set canvas dimensions if NOT already transferred to OffscreenCanvas
  // Once transferred, the canvas cannot be resized from main thread
  if (!offscreenCanvasTransferred) {
    if (canvasElement && options.width && options.height) {
      canvasElement.width = options.width as number;
      canvasElement.height = options.height as number;
    }
  }

  numBars = options.numBars
    ? options.numBars
    : Math.floor(
        (options.width ?? 0) / (options.preferredBarWidth + options.barSpacing),
      );
  barWidth = (options.width ?? 0) / numBars - options.barSpacing;

  if (options.forcePreferredBarWidth) {
    barWidth = options.preferredBarWidth;
  }

  if (barWidth < 4) barWidth = 4;

  // Generate bar colors
  const generatedColors = generateBarColors(numBars, options);
  barColors.length = 0;
  barColors.push(...generatedColors);

  consZ = 0;

  // Check if we should use OffscreenCanvas
  useOffscreenCanvas = isOffscreenCanvasSupported();

  // If already transferred, just update the worker with new config if needed
  if (offscreenCanvasTransferred && visualizerWorker) {
    visualizerWorker.postMessage({
      type: "resize",
      data: {
        width: options.width,
        height: options.height,
        numBars: numBars,
        barWidth: barWidth,
        barColors: barColors,
      },
    });
    return;
  }

  if (useOffscreenCanvas && !offscreenCanvasTransferred) {
    try {
      // Initialize the worker
      initVisualizerWorker();

      // Transfer the canvas to OffscreenCanvas
      const offscreen = canvasElement.transferControlToOffscreen();

      // Mark as transferred BEFORE sending to worker
      offscreenCanvasTransferred = true;

      // Send the OffscreenCanvas to the worker
      visualizerWorker?.postMessage(
        {
          type: "init",
          data: {
            canvas: offscreen,
            width: options.width,
            height: options.height,
            numBars: numBars,
            barWidth: barWidth,
            barSpacing: options.barSpacing,
            barColors: barColors,
          },
        },
        [offscreen],
      );
    } catch {
      // Fallback to regular canvas if transfer fails
      console.warn(
        "OffscreenCanvas transfer failed, falling back to regular canvas",
      );
      useOffscreenCanvas = false;
      offscreenCanvasTransferred = false;
      canvasContext = canvasElement.getContext("2d");
    }
  } else if (!useOffscreenCanvas) {
    // Fallback: use regular canvas context
    canvasContext = canvasElement.getContext("2d");
  }
};

export const renderAudioVisualization = () => {
  // If using OffscreenCanvas, start the worker and frequency data transfer
  if (useOffscreenCanvas && visualizerWorker) {
    visualizerWorker.postMessage({ type: "start" });
    startFrequencyDataTransfer();
    return;
  }

  // Fallback: render on main thread
  renderAudioVisualizationFallback();
};

// Fallback rendering for browsers without OffscreenCanvas support
const renderAudioVisualizationFallback = () => {
  if (document.visibilityState !== "visible") {
    animationFrameId = undefined;
    return;
  }

  if (audioAnalyserNode && audioFrequencyData) {
    audioAnalyserNode.getByteFrequencyData(
      audioFrequencyData as Uint8Array<ArrayBuffer>,
    );
  }

  const options = audioVisualizationOptions;
  const consZLim = options.consecutiveZeroesLimit;

  if (consZLim > 0 && audioFrequencyData) {
    for (let i = 0; i < audioFrequencyData.length; i++) {
      if (audioFrequencyData[i] === 0) {
        consZ++;
      } else {
        consZ = 0;
      }
      if (consZ >= consZLim) {
        setUsableLength(i - consZLim + 1);
        break;
      }
    }
  }

  if (
    !canvasContext ||
    !canvasElement ||
    options.height === null ||
    !audioFrequencyData
  ) {
    animationFrameId = requestAnimationFrame(renderAudioVisualizationFallback);
    return;
  }

  canvasContext.clearRect(0, 0, options.width ?? 0, options.height);

  let ind = 0;
  let cInd = 0;
  const step = Math.floor(usableLength / numBars);

  for (let i = 0; i < canvasElement.width; i += barWidth + options.barSpacing) {
    canvasContext.fillStyle = barColors[cInd++];
    const freqValue = audioFrequencyData[Math.floor(ind)];
    const barHeight = (options.height as number) * (freqValue / 255);
    const y = (options.height as number) - barHeight;
    canvasContext.fillRect(i, y, barWidth, options.height as number);
    ind += step;
  }

  animationFrameId = requestAnimationFrame(renderAudioVisualizationFallback);
};

const setUsableLength = (len: number) => {
  if (len < usableLength) return;

  usableLength = len;
};

// Handle window resize events (e.g., when DevTools opens/closes)
export const setupResizeHandler = () => {
  if (resizeHandlerAttached) return;
  resizeHandlerAttached = true;

  window.addEventListener("resize", () => {
    // Debounce resize events to avoid too many updates
    if (resizeDebounceTimeout) {
      clearTimeout(resizeDebounceTimeout);
    }

    resizeDebounceTimeout = setTimeout(() => {
      if (!canvasElement || !canvasElement.parentElement) return;

      // Get new dimensions from parent element
      const newWidth = canvasElement.parentElement.clientWidth;
      const newHeight = canvasElement.parentElement.clientHeight;

      // Skip if dimensions haven't actually changed
      if (
        newWidth === audioVisualizationOptions.width &&
        newHeight === audioVisualizationOptions.height
      ) {
        return;
      }

      // Update options with new dimensions
      audioVisualizationOptions.width = newWidth;
      audioVisualizationOptions.height = newHeight;

      // Recalculate bar dimensions
      const options = audioVisualizationOptions;
      numBars = options.numBars
        ? options.numBars
        : Math.floor(
            newWidth / (options.preferredBarWidth + options.barSpacing),
          );
      barWidth = newWidth / numBars - options.barSpacing;

      if (options.forcePreferredBarWidth) {
        barWidth = options.preferredBarWidth;
      }

      if (barWidth < 4) barWidth = 4;

      // Regenerate bar colors for new number of bars
      const generatedColors = generateBarColors(numBars, options);
      barColors.length = 0;
      barColors.push(...generatedColors);

      if (
        useOffscreenCanvas &&
        visualizerWorker &&
        offscreenCanvasTransferred
      ) {
        // Send resize message to worker
        visualizerWorker.postMessage({
          type: "resize",
          data: {
            width: newWidth,
            height: newHeight,
            numBars: numBars,
            barWidth: barWidth,
            barColors: barColors,
          },
        });
      } else if (!useOffscreenCanvas && canvasElement) {
        // For fallback mode, we can directly resize the canvas
        canvasElement.width = newWidth;
        canvasElement.height = newHeight;
      }
    }, 150); // 150ms debounce delay
  });
};

export const setupVisibilityHandler = () => {
  if (visibilityHandlerAttached) return;
  visibilityHandlerAttached = true;

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") {
      // Pause visualization when tab is hidden
      if (useOffscreenCanvas && visualizerWorker) {
        visualizerWorker.postMessage({ type: "pause" });
        stopFrequencyDataTransfer();
      } else {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = undefined;
        }
      }
    }

    if (document.visibilityState === "visible") {
      // Reset visualization state
      consZ = 0;
      usableLength = 250;

      if (jotaiStore.get(radioAudioStateAtom).isPlaying) {
        if (useOffscreenCanvas && visualizerWorker) {
          visualizerWorker.postMessage({ type: "resume" });
          startFrequencyDataTransfer();
        } else if (!animationFrameId) {
          renderAudioVisualization();
        }
      }
    }
  });
};

// Cleanup function to destroy the worker and reset state
export const destroyAudioVisualization = () => {
  // Stop frequency data transfer
  stopFrequencyDataTransfer();

  // Destroy worker
  if (visualizerWorker) {
    visualizerWorker.postMessage({ type: "destroy" });
    visualizerWorker.terminate();
    visualizerWorker = null;
  }

  // Reset state
  useOffscreenCanvas = false;
  offscreenCanvasTransferred = false;
  canvasContext = null;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }
};
