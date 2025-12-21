import {
  jotaiStore,
  mediaAudioStateAtom,
  radioStationStateAtom,
} from "@/data/store";
import type { AudioVisualizationOptions } from "@/data/type";
import {
  startPeriodicGetTrackMetadata,
  stopPeriodicGetTrackMetadata,
} from "@/lib/track_metadata";
import Hls from "hls.js";

const barColors: string[] = [];
let canvasElement: HTMLCanvasElement;
let numBars: number;
let barWidth: number;
let canvasContext: CanvasRenderingContext2D | null;
let consZ = 0;
let usableLength = 250;
let animationFrameId: number | undefined;
let audioAnalyserNode: AnalyserNode | null = null;
let audioFrequencyData: Uint8Array | null = null;
const audioVisualizationOptions: AudioVisualizationOptions = {
  preferredBarWidth: 32,
  forcePreferredBarWidth: false,
  barSpacing: 1,
  color: `rainbow${Math.floor(Math.random() * 8) + 1}`,
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

export const transparent1x1Pixel: string =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

export {
  startPeriodicGetTrackMetadata as startIntervalGetTrackMetadata,
  stopPeriodicGetTrackMetadata as stopIntervalGetTrackMetadata,
};

export const setupMediaAudio = () => {
  if (!jotaiStore.get(mediaAudioStateAtom).mediaAudio) {
    const mediaAudio = new Audio();
    mediaAudio.crossOrigin = "anonymous";

    jotaiStore.set(mediaAudioStateAtom, (prev) => ({
      ...prev,
      mediaAudio: mediaAudio,
    }));

    if (Hls.isSupported()) {
      hls = new Hls();
      hls.attachMedia(mediaAudio);
    }

    if (localStorage) {
      // Get media audio volume from localStorage
      const volumeInLocalStorage = localStorage.getItem("mediaAudioVolume");

      // Convert volume 0-100 to 0-1
      if (volumeInLocalStorage) {
        mediaAudio.volume = parseFloat(volumeInLocalStorage) / 100;
      } else {
        mediaAudio.volume = 0.5;

        // Set media audio volume to localStorage
        localStorage.setItem("mediaAudioVolume", "50");
      }
    } else {
      mediaAudio.volume = 0.5;
    }
  }
};

const resetStateWhenStop = () => {
  jotaiStore.set(mediaAudioStateAtom, (prev) => ({
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
  jotaiStore.set(mediaAudioStateAtom, (prev) => ({
    ...prev,
    isLoading: true,
  }));

  const radioStation = jotaiStore.get(radioStationStateAtom).radioStation;
  const mediaAudio = jotaiStore.get(mediaAudioStateAtom).mediaAudio;

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
    // Set mediaAudio to empty src
    if (mediaAudio) {
      mediaAudio.removeAttribute("src");
    }

    // Load the source to hls
    hls?.loadSource(url as string);
    if (mediaAudio) {
      hls?.attachMedia(mediaAudio);
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

    if (mediaAudio) {
      mediaAudio.src = url as string;
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
    ? mediaAudio?.play()
    : mediaAudioCors?.play();

  if (playPromise !== undefined) {
    playPromise
      .then(() => {
        // Set the state, isPlaying = true and isLoading = false
        jotaiStore.set(mediaAudioStateAtom, (prev) => ({
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
      .catch(() => {
        jotaiStore.set(mediaAudioStateAtom, (prev) => ({
          ...prev,
          isLoading: false,
        }));

        playRandom(isChangeAddressBar);
      });
  } else {
    jotaiStore.set(mediaAudioStateAtom, (prev) => ({
      ...prev,
      isLoading: false,
    }));
  }
};

export const playRandom = async (isChangeAddressBar = false) => {
  if (!jotaiStore.get(mediaAudioStateAtom).isLoading) {
    await stop();

    jotaiStore.set(mediaAudioStateAtom, (prev) => ({
      ...prev,
      isLoading: true,
    }));

    // This is needed to reset the radio station name and logo, do not reset if path is not starts with /apps/radio
    if (!window.location.pathname.startsWith("/apps/radio")) {
      const dummyRadioStation = jotaiStore.get(
        radioStationStateAtom,
      ).radioStation;
      if (dummyRadioStation) {
        dummyRadioStation.name = "";
        dummyRadioStation.logo = "";
        dummyRadioStation.slug = "";
        dummyRadioStation.country.name_alias = "";
        dummyRadioStation.city = "";

        jotaiStore.set(radioStationStateAtom, (prev) => ({
          ...prev,
          radioStation: dummyRadioStation,
        }));
      }
    }

    await loadRandomRadioStation();

    // Send virtual page view event to Google Analytics
    if (window && window.gtag) {
      window.gtag("event", "page_view", {
        page_title: `Play random radio station`,
        page_location: window.location.href,
        page_path: window.location.pathname,
      });
    }

    play(isChangeAddressBar);
  }
};

export const stop = async () => {
  // Reset the state
  resetStateWhenStop();

  const mediaAudio = jotaiStore.get(mediaAudioStateAtom).mediaAudio;

  mediaAudio?.pause();
  mediaAudio?.removeAttribute("src");

  mediaAudioCors?.pause();
  mediaAudioCors?.removeAttribute("src");

  stopPeriodicGetTrackMetadata();

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);

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
  jotaiStore.set(mediaAudioStateAtom, (prev) => ({
    ...prev,
    isPlaying: true,
    isLoading: false,
  }));
};

export const attachMediaAudioListeners = () => {
  const mediaAudio = jotaiStore.get(mediaAudioStateAtom).mediaAudio;

  if (mediaAudio) {
    mediaAudio.addEventListener(
      "canplaythrough",
      handleEventAudioCanPlayThrough,
    );
    mediaAudio.addEventListener("error", handleEventAudioError);
    mediaAudio.addEventListener("playing", handleEventAudioPlaying);
  }
};

export const detachMediaAudioListeners = () => {
  const mediaAudio = jotaiStore.get(mediaAudioStateAtom).mediaAudio;

  if (mediaAudio) {
    mediaAudio.removeEventListener(
      "canplaythrough",
      handleEventAudioCanPlayThrough,
    );
    mediaAudio.removeEventListener("error", handleEventAudioError);
    mediaAudio.removeEventListener("playing", handleEventAudioPlaying);
  }
};

export const loadRandomRadioStation = async (countryAlpha2: string = "") => {
  let baseUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?random=true`;

  if (countryAlpha2 !== "") {
    baseUrl = `${process.env.NEXT_PUBLIC_API_URL_V1}/radio-station?random=true&cca2=${countryAlpha2}`;
  }

  // Fetch data in parallel
  const [radioStationResult] = await Promise.all([
    fetch(baseUrl, {
      cache: "no-cache",
      headers: {
        "Content-Type": "application/json",
      },
    }),
  ]);

  const radioStation = await radioStationResult.json();

  jotaiStore.set(radioStationStateAtom, (prev) => ({
    ...prev,
    radioStation: radioStation.data,
  }));
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
    await loadRandomRadioStation();
    return;
  }

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
  if (radioStation.status === 1) {
    await loadRandomRadioStation();
    return;
  }

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

export const setupMediaAudioContext = () => {
  const mediaAudio = jotaiStore.get(mediaAudioStateAtom)
    .mediaAudio as HTMLAudioElement;
  const audioContext = new AudioContext();
  const audioSourceNode = audioContext.createMediaElementSource(mediaAudio);
  audioAnalyserNode = audioContext.createAnalyser();

  jotaiStore.set(mediaAudioStateAtom, (prev) => ({
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
};

export const initAudioVisualization = () => {
  const options = audioVisualizationOptions;
  canvasElement = document.getElementById("vis-canvas") as HTMLCanvasElement;

  if (!canvasElement) return;

  if (canvasElement && canvasElement.parentElement) {
    if (!options.width) {
      options.width = canvasElement.parentElement.clientWidth;
    }

    if (!options.height) {
      options.height = canvasElement.parentElement.clientHeight;
    }
  }

  if (canvasElement && options.width && options.height) {
    canvasElement.width = options.width as number;
    canvasElement.height = options.height as number;
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

  for (let i = 0; i < numBars; i++) {
    const frequency = 5 / numBars;

    if (options.color == "rainbow1") {
      // Sinusoidal RGB rainbow, or Classic RGB rainbow
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128); //actual rainbow
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow2") {
      // Shifted sinusoidal RGB rainbow, or Phase-shifted RGB rainbow, or Twisted RGB rainbow
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow3") {
      // Red-dominant sinusoidal RGB rainbow, or Red-lead RGB rainbow
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow4") {
      // Orange-lead sinusoidal RGB rainbow
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow5") {
      // Green-dominant sinusoidal RGB rainbow, or Green-lead RGB rainbow
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow6") {
      // Blue-dominant sinusoidal RGB rainbow, or Blue-lead RGB rainbow
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      barColors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow7") {
      // Linear gradient RGB rainbow, or Red-Green linear blend rainbow
      const red = Math.floor((i / numBars) * 255);
      const green = Math.floor(((numBars - i) / numBars) * 255);
      const blue = 150;
      barColors[i] =
        "rgba(" + red + "," + green + "," + blue + "," + 1 + ")";
    } else if (options.color == "rainbow8") {
      // Random color rainbow, or Chaotic rainbow, or Random spectrum rainbow
      barColors[i] = "#" + Math.floor(Math.random() * 16777215).toString(16);
    } else {
      barColors[i] = options.color;
    }
  }

  canvasContext = canvasElement.getContext("2d");

  consZ = 0;
};

export const renderAudioVisualization = () => {
  animationFrameId = requestAnimationFrame(renderAudioVisualization);

  audioAnalyserNode?.getByteFrequencyData(
    audioFrequencyData as Uint8Array<ArrayBuffer>,
  );

  const options = audioVisualizationOptions;

  const consZLim = options.consecutiveZeroesLimit;

  if (audioFrequencyData) {
    for (let i = 0; i < audioFrequencyData?.length; i++) {
      if (audioFrequencyData?.[i] == 0) {
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

  canvasContext?.clearRect(0, 0, options.width ?? 0, options.height ?? 0);

  let ind = 0;
  let cInd = 0;

  if (canvasElement) {
    for (
      let i = 0;
      i < canvasElement.width;
      i += barWidth + options.barSpacing
    ) {
      canvasContext?.save();
      if (canvasContext) {
        canvasContext.fillStyle = barColors[cInd++];
        canvasContext.translate(i, 0);
      }

      if (options.height !== null && audioFrequencyData) {
        if (!options.hideIfZero) {
          canvasContext?.fillRect(
            0,
            (options.height as number) -
              (options.height as number) *
                (audioFrequencyData[Math.floor(ind)] / 255) -
              1,
            barWidth,
            options.height as number,
          );
        } else {
          canvasContext?.fillRect(
            0,
            (options.height as number) -
              (options.height as number) *
                (audioFrequencyData[Math.floor(ind)] / 255),
            barWidth,
            options.height as number,
          );
        }
      }
      canvasContext?.restore();
      ind += Math.floor(usableLength / numBars);
    }
  }
};

const setUsableLength = (len: number) => {
  if (len < usableLength) return;

  usableLength = len;
};
