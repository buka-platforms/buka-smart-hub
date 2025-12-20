"use client";

import "@/data/store"; // canvasAudioVisualization as canvasAudioVisualizationStore

// audioVisualizationAtom,
import { useEffect } from "react";

// import { useSetAtom } from "jotai";

export default function Canvas() {
  "use client";
  // const setAudioVisualization = useSetAtom(audioVisualizationAtom);

  useEffect(() => {
    // canvasAudioVisualizationStore.set(
    //   document.getElementById("vis-canvas") as HTMLCanvasElement,
    // );
    // setAudioVisualization((prev) => ({
    //   ...prev,
    //   canvasElement: document.getElementById(
    //     "vis-canvas",
    //   ) as HTMLCanvasElement,
    // }));
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
