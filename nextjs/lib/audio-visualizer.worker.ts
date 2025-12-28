// Audio Visualizer Web Worker using OffscreenCanvas
// This runs visualization rendering off the main thread to prevent UI jank

interface VisualizerConfig {
  width: number;
  height: number;
  numBars: number;
  barWidth: number;
  barSpacing: number;
  barColors: string[];
}

let offscreenCanvas: OffscreenCanvas | null = null;
let offscreenContext: OffscreenCanvasRenderingContext2D | null = null;
let config: VisualizerConfig | null = null;
let isRendering = false;
let animationFrameId: number | undefined;
let latestFrequencyData: Uint8Array | null = null;
let usableLength = 250;

const render = () => {
  if (!isRendering || !offscreenContext || !offscreenCanvas || !config) {
    animationFrameId = undefined;
    return;
  }

  if (latestFrequencyData) {
    offscreenContext.clearRect(0, 0, config.width, config.height);

    let ind = 0;
    let cInd = 0;
    const step = Math.floor(usableLength / config.numBars);

    for (
      let i = 0;
      i < offscreenCanvas.width;
      i += config.barWidth + config.barSpacing
    ) {
      offscreenContext.fillStyle = config.barColors[cInd++];
      const freqValue = latestFrequencyData[Math.floor(ind)];
      const barHeight = config.height * (freqValue / 255);
      const y = config.height - barHeight;
      offscreenContext.fillRect(i, y, config.barWidth, config.height);
      ind += step;
    }
  }

  animationFrameId = requestAnimationFrame(render);
};

self.onmessage = (event: MessageEvent) => {
  const { type, data } = event.data;

  switch (type) {
    case "init": {
      // Receive the OffscreenCanvas from the main thread
      offscreenCanvas = data.canvas as OffscreenCanvas;
      offscreenContext = offscreenCanvas.getContext("2d");

      config = {
        width: data.width,
        height: data.height,
        numBars: data.numBars,
        barWidth: data.barWidth,
        barSpacing: data.barSpacing,
        barColors: data.barColors,
      };

      self.postMessage({ type: "initialized" });
      break;
    }

    case "resize": {
      if (offscreenCanvas && config) {
        offscreenCanvas.width = data.width;
        offscreenCanvas.height = data.height;
        config.width = data.width;
        config.height = data.height;
        config.numBars = data.numBars;
        config.barWidth = data.barWidth;
        config.barColors = data.barColors;
      }
      break;
    }

    case "updateColors": {
      if (config) {
        config.barColors = data.barColors;
      }
      break;
    }

    case "frequencyData": {
      // Receive frequency data from the main thread
      latestFrequencyData = new Uint8Array(data.frequencyData);
      usableLength = data.usableLength || 250;
      break;
    }

    case "start": {
      isRendering = true;
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
      self.postMessage({ type: "started" });
      break;
    }

    case "stop": {
      isRendering = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }

      // Clear the canvas
      if (offscreenContext && config) {
        offscreenContext.clearRect(0, 0, config.width, config.height);
      }

      self.postMessage({ type: "stopped" });
      break;
    }

    case "pause": {
      // Pause rendering without clearing (for visibility hidden)
      isRendering = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }
      self.postMessage({ type: "paused" });
      break;
    }

    case "resume": {
      // Resume rendering (for visibility visible)
      isRendering = true;
      usableLength = 250; // Reset usable length
      if (!animationFrameId) {
        animationFrameId = requestAnimationFrame(render);
      }
      self.postMessage({ type: "resumed" });
      break;
    }

    case "destroy": {
      isRendering = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = undefined;
      }
      offscreenCanvas = null;
      offscreenContext = null;
      config = null;
      latestFrequencyData = null;
      self.postMessage({ type: "destroyed" });
      break;
    }
  }
};
