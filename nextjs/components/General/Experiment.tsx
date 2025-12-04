"use client";

import {
  exposedTrackArtwork as exposedTrackArtworkStore,
  isBackgroundImageLoaded as isBackgroundImageLoadedStore,
  randomBackgroundImage as randomBackgroundImageStore,
} from "@/data/store";
import { useReadable } from "@/lib/react_use_svelte_store";
import { FlaskConical } from "lucide-react";
import { get } from "svelte/store";

export default function Experiment() {
  const randomBackgroundImage = useReadable(randomBackgroundImageStore);
  const isBackgroundImageLoaded = useReadable(isBackgroundImageLoadedStore);
  const exposedTrackArtwork = useReadable(exposedTrackArtworkStore);

  const experiment = () => {
    // isBackgroundImageLoadedStore.set(false);
    // randomBackgroundImageStore.set(null);
    // // Copy the randomBackgroundImageStore value
    // let tmpRandomBackgroundImage = get(randomBackgroundImageStore);
    // if (tmpRandomBackgroundImage) {
    //     tmpRandomBackgroundImage.urls.full = exposedTrackArtwork;
    //     tmpRandomBackgroundImage.urls.raw = exposedTrackArtwork;
    // }
    // console.log(tmpRandomBackgroundImage);
    // randomBackgroundImageStore.set(tmpRandomBackgroundImage);
    // Navigate to /apps/radio?q=buka
  };

  return (
    <div
      onClick={experiment}
      className="flex cursor-pointer items-center gap-x-2"
    >
      <FlaskConical className="w-4" color="#808080" />
      Experiment
    </div>
  );
}
