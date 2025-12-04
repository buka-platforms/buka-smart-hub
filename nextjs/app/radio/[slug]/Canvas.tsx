"use client";

import { canvasAudioVisualization as canvasAudioVisualizationStore } from "@/data/store";
import { useEffect } from "react";

export default function Canvas() {
  "use client";

  useEffect(() => {
    canvasAudioVisualizationStore.set(
      document.getElementById("vis-canvas") as HTMLCanvasElement,
    );
  }, []);

  return (
    <>
      <div
        id="vis-box"
        className="fixed right-0 bottom-0 left-0 z-0 m-0 h-60 w-full p-0 md:h-80"
      >
        <canvas id="vis-canvas"></canvas>
      </div>
    </>
  );
}
