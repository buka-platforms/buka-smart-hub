"use client";

import { Loading } from "@/components/General/AudioUI";
import { mediaAudioStateAtom, radioStationStateAtom } from "@/data/store";
import { play, stop, transparent1x1Pixel } from "@/lib/audio";
import { ControlFrom, controls, useDraggable } from "@neodrag/react";
import { useAtomValue } from "jotai";
import { Pause, Play as PlayIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

/* eslint-disable @next/next/no-img-element */
export default function WidgetDraggableRadioPlayer() {
  const draggableRef = useRef<HTMLDivElement>(null);
  useDraggable(draggableRef, [
    controls({
      block: ControlFrom.selector("a, button"),
    }),
  ]);

  const mediaAudioState = useAtomValue(mediaAudioStateAtom);
  const radioStationState = useAtomValue(radioStationStateAtom);

  // Determine which artwork to show
  const artworkSrc = radioStationState.metadataExists
    ? radioStationState.exposedArtwork
    : radioStationState.radioStation?.logo || transparent1x1Pixel;

  // Determine title and artist
  const title = radioStationState.metadataExists
    ? radioStationState.exposedTitle
    : radioStationState.exposedTitleOnly || "No track info";

  const artist = radioStationState.metadataExists
    ? radioStationState.exposedArtist
    : "";

  const stationName = radioStationState.radioStation?.name || "";

  // Always render the element so the ref is attached, but hide when no station
  const isVisible = !!radioStationState.radioStation;

  return (
    <div
      ref={draggableRef}
      className={`pointer-events-auto fixed right-4 bottom-4 z-50 flex w-72 transform-gpu cursor-grab items-center gap-3 rounded-lg bg-black/80 p-3 shadow-lg backdrop-blur-md transition-opacity duration-300 will-change-transform data-[neodrag-state=dragging]:shadow-none ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      {/* Cover Art */}
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-white/10">
        <img
          className="pointer-events-none h-full w-full object-cover"
          src={artworkSrc || transparent1x1Pixel}
          alt={title}
          loading="lazy"
          draggable={false}
        />
      </div>

      {/* Track Info */}
      <div className="flex min-w-0 flex-1 flex-col justify-center">
        <Link
          href={`/radio/${radioStationState.radioStation?.slug}`}
          className="truncate text-xs text-white/60 hover:text-white/80"
          title={stationName}
        >
          {stationName}
        </Link>
        <div className="truncate text-sm font-medium text-white" title={title}>
          {title || "\u00A0"}
        </div>
        {artist && (
          <div className="truncate text-xs text-white/70" title={artist}>
            {artist}
          </div>
        )}
      </div>

      {/* Play/Stop Button */}
      <div className="shrink-0">
        {mediaAudioState.isLoading ? (
          <Loading
            className="h-10 w-10 animate-spin text-white/80"
            color="#f5f5f5"
          />
        ) : mediaAudioState.isPlaying ? (
          <button
            onClick={stop}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Stop"
          >
            <Pause className="h-5 w-5" fill="currentColor" />
          </button>
        ) : (
          <button
            onClick={() => play(false)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
            title="Play"
          >
            <PlayIcon className="h-5 w-5" fill="currentColor" />
          </button>
        )}
      </div>
    </div>
  );
}
