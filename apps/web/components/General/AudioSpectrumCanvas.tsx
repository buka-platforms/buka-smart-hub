"use client";

import {
  ambientScreenStateAtom,
  audioVisualizationStateAtom,
} from "@/data/store";
import {
  initAudioVisualization,
  renderAudioVisualization,
} from "@/lib/audio-visualizer";
import { useAtomValue } from "jotai";
import { useEffect } from "react";

type AudioSpectrumCanvasProps = {
  className?: string;
  hideWhenAmbientDialogOpen?: boolean;
};

export default function AudioSpectrumCanvas({
  className,
  hideWhenAmbientDialogOpen = false,
}: AudioSpectrumCanvasProps) {
  const ambientScreenState = useAtomValue(ambientScreenStateAtom);
  const visualizationState = useAtomValue(audioVisualizationStateAtom);

  const shouldHide =
    hideWhenAmbientDialogOpen && ambientScreenState.isDialogOpen;

  useEffect(() => {
    if (shouldHide) {
      return;
    }

    if (visualizationState.contextCreated && visualizationState.isActive) {
      initAudioVisualization();
      renderAudioVisualization();
    }
  }, [
    shouldHide,
    visualizationState.contextCreated,
    visualizationState.isActive,
  ]);

  if (shouldHide) {
    return null;
  }

  return (
    <div
      id="vis-box"
      className={
        className ??
        "pointer-events-none fixed right-0 bottom-0 left-0 z-0 m-0 h-60 w-full p-0 md:h-80"
      }
    >
      <canvas id="vis-canvas" className="h-full w-full" />
    </div>
  );
}
