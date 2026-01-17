import { jotaiStore, radioAudioStateAtom } from "@/data/store";
import type { AudioVisualizationOptions } from "@/data/type";

// Visualization state
const barColors: string[] = [];
let canvasElement: HTMLCanvasElement | null = null;
let previousCanvasElement: HTMLCanvasElement | null = null;
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

let visibilityHandlerAttached = false;
let resizeHandlerAttached = false;
let resizeDebounceTimeout: ReturnType<typeof setTimeout> | undefined;

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

// Check if OffscreenCanvas is supported (including Safari 16.4+ compatibility check)
const isOffscreenCanvasSupported = (): boolean => {
  if (typeof OffscreenCanvas === "undefined" || typeof Worker === "undefined") {
    return false;
  }

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

export const randomizeRainbowColor = () => {
  const n = Math.floor(Math.random() * rainbowMax) + 1;
  audioVisualizationOptions.color = `rainbow${n}`;
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
  numBarsValue: number,
  options: AudioVisualizationOptions,
): string[] => {
  const colors: string[] = [];
  for (let i = 0; i < numBarsValue; i++) {
    const frequency = 5 / numBarsValue;

    if (options.color == "rainbow1") {
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow2") {
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow3") {
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow4") {
      const r = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 1) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 3) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow5") {
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else if (options.color == "rainbow6") {
      const b = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const g = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    } else {
      const g = Math.floor(Math.sin(frequency * i + 0) * 127 + 128);
      const r = Math.floor(Math.sin(frequency * i + 2) * 127 + 128);
      const b = Math.floor(Math.sin(frequency * i + 4) * 127 + 128);
      colors[i] =
        "rgba(" + r + "," + g + "," + b + "," + options.rainbowOpacity + ")";
    }
  }
  return colors;
};

// Reset visualizer state when canvas element changes
const resetVisualizerForNewCanvas = () => {
  stopFrequencyDataTransfer();

  if (visualizerWorker) {
    visualizerWorker.postMessage({ type: "destroy" });
    visualizerWorker.terminate();
    visualizerWorker = null;
  }

  offscreenCanvasTransferred = false;
  useOffscreenCanvas = false;
  canvasContext = null;

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
    useOffscreenCanvas = false;
    offscreenCanvasTransferred = false;
  };
};

// Start sending frequency data to the worker
const startFrequencyDataTransfer = () => {
  if (frequencyDataIntervalId) return;

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

  const canvasChanged =
    previousCanvasElement !== null &&
    previousCanvasElement !== newCanvasElement;

  if (canvasChanged) {
    resetVisualizerForNewCanvas();
  }

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

  const generatedColors = generateBarColors(numBars, options);
  barColors.length = 0;
  barColors.push(...generatedColors);

  consZ = 0;

  useOffscreenCanvas = isOffscreenCanvasSupported();

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
      initVisualizerWorker();

      const offscreen = canvasElement.transferControlToOffscreen();

      offscreenCanvasTransferred = true;

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
      console.warn(
        "OffscreenCanvas transfer failed, falling back to regular canvas",
      );
      useOffscreenCanvas = false;
      offscreenCanvasTransferred = false;
      canvasContext = canvasElement.getContext("2d");
    }
  } else if (!useOffscreenCanvas) {
    canvasContext = canvasElement.getContext("2d");
  }
};

export const renderAudioVisualization = () => {
  if (useOffscreenCanvas && visualizerWorker) {
    visualizerWorker.postMessage({ type: "start" });
    startFrequencyDataTransfer();
    return;
  }

  renderAudioVisualizationFallback();
};

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

// Handle window resize events
export const setupResizeHandler = () => {
  if (resizeHandlerAttached) return;
  resizeHandlerAttached = true;

  window.addEventListener("resize", () => {
    if (resizeDebounceTimeout) {
      clearTimeout(resizeDebounceTimeout);
    }

    resizeDebounceTimeout = setTimeout(() => {
      if (!canvasElement || !canvasElement.parentElement) return;

      const newWidth = canvasElement.parentElement.clientWidth;
      const newHeight = canvasElement.parentElement.clientHeight;

      if (
        newWidth === audioVisualizationOptions.width &&
        newHeight === audioVisualizationOptions.height
      ) {
        return;
      }

      audioVisualizationOptions.width = newWidth;
      audioVisualizationOptions.height = newHeight;

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

      const generatedColors = generateBarColors(numBars, options);
      barColors.length = 0;
      barColors.push(...generatedColors);

      if (
        useOffscreenCanvas &&
        visualizerWorker &&
        offscreenCanvasTransferred
      ) {
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
        canvasElement.width = newWidth;
        canvasElement.height = newHeight;
      }
    }, 150);
  });
};

export const setupVisibilityHandler = () => {
  if (visibilityHandlerAttached) return;
  visibilityHandlerAttached = true;

  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState === "hidden") {
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

export const stopAudioVisualization = () => {
  stopFrequencyDataTransfer();

  if (useOffscreenCanvas && visualizerWorker) {
    visualizerWorker.postMessage({ type: "stop" });
    return;
  }

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }

  if (canvasContext && canvasElement) {
    canvasContext.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
};

// Cleanup function to destroy the worker and reset state
export const destroyAudioVisualization = () => {
  stopAudioVisualization();
  stopFrequencyDataTransfer();

  if (visualizerWorker) {
    visualizerWorker.postMessage({ type: "destroy" });
    visualizerWorker.terminate();
    visualizerWorker = null;
  }

  useOffscreenCanvas = false;
  offscreenCanvasTransferred = false;
  canvasContext = null;

  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = undefined;
  }
};
