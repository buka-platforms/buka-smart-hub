"use client";

import "@/data/store"; // radioStationStateAtom,

// exposedTrackArtwork as exposedTrackArtworkStore,
// isBackgroundImageLoaded as isBackgroundImageLoadedStore,
// backgroundImageStateAtom,
// randomBackgroundImage as randomBackgroundImageStore,
// import { useReadable } from "@/lib/react-use-svelte-store";
// import { get } from "svelte/store";
// import { useAtomValue } from "jotai";
import { FlaskConical } from "lucide-react";

export default function Experiment() {
  // const randomBackgroundImage = useReadable(randomBackgroundImageStore);
  // const isBackgroundImageLoaded = useReadable(isBackgroundImageLoadedStore);
  // const exposedTrackArtwork = useReadable(exposedTrackArtworkStore);
  // const radioStationState = useAtomValue(radioStationStateAtom);
  // const backgroundImageState = useAtomValue(backgroundImageStateAtom);

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
