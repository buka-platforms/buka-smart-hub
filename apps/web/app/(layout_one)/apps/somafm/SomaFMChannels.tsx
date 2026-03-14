"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { somafmAudioStateAtom } from "@/data/store";
import {
  attachSomaFMListeners,
  detachSomaFMListeners,
  playSomaFMStream,
  setSomaFMVolume,
  setupSomaFMAudio,
  stopSomaFM,
} from "@/lib/somafm-audio";
import { useAtom } from "jotai";
import {
  Disc3,
  Headphones,
  LoaderCircle,
  Music2,
  Pause,
  Play as PlayIcon,
  Search as SearchIcon,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface SomaFMChannel {
  id: string;
  title: string;
  description: string;
  dj: string;
  listeners: number;
  updated: string;
  genre: string;
  image: string;
  largeimage: string;
  lastPlaying: string;
}

type SortOption = "listeners" | "title";

export default function SomaFMChannels() {
  const [channels, setChannels] = useState<SomaFMChannel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("listeners");
  const [audioState] = useAtom(somafmAudioStateAtom);
  const hasSetup = useRef(false);

  useEffect(() => {
    if (!hasSetup.current) {
      setupSomaFMAudio();
      attachSomaFMListeners();
      hasSetup.current = true;
    }
    return () => {
      detachSomaFMListeners();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("https://somafm.com/channels.json", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: { channels: SomaFMChannel[] }) => {
        setChannels(data.channels);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("Failed to load channels. Please try again.");
        setIsLoading(false);
      });
    return () => controller.abort();
  }, []);

  const filteredChannels = useMemo(() => {
    let result = channels;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (ch) =>
          ch.title.toLowerCase().includes(q) ||
          ch.genre.toLowerCase().includes(q) ||
          ch.description.toLowerCase().includes(q) ||
          ch.dj.toLowerCase().includes(q),
      );
    }
    if (sortBy === "listeners") {
      result = [...result].sort((a, b) => b.listeners - a.listeners);
    } else {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title));
    }
    return result;
  }, [channels, searchQuery, sortBy]);

  const handlePlay = useCallback(
    async (channel: SomaFMChannel) => {
      if (audioState.isLoading) return;
      const streamUrl = `https://ice1.somafm.com/${channel.id}-128-mp3`;
      await playSomaFMStream(streamUrl, channel.id);
    },
    [audioState.isLoading],
  );

  const handleStop = useCallback(() => {
    void stopSomaFM();
  }, []);

  const handleVolumeToggle = useCallback(() => {
    const current = audioState.volume;
    setSomaFMVolume(current > 0 ? 0 : 50);
  }, [audioState.volume]);

  if (error) {
    return (
      <div className="mt-6 rounded-lg border border-red-200 bg-red-50 p-6 text-center">
        <p className="text-sm text-red-700">{error}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={() => window.location.reload()}
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {/* Now Playing Bar */}
      {audioState.isPlaying && audioState.lastChannelId && (
        <div className="mb-6 flex items-center gap-3 rounded-lg border border-slate-200 bg-linear-to-r from-slate-50 to-slate-100 p-3">
          <Disc3 className="h-5 w-5 animate-spin text-slate-600" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              Now playing:{" "}
              {channels.find((c) => c.id === audioState.lastChannelId)?.title ??
                audioState.lastChannelId}
            </p>
          </div>
          <button
            onClick={handleVolumeToggle}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label={audioState.volume > 0 ? "Mute" : "Unmute"}
          >
            {audioState.volume > 0 ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </button>
          <button
            onClick={handleStop}
            className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
            aria-label="Stop"
          >
            <Pause className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Search & Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search channels, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Sort by:</span>
          <Button
            size="sm"
            variant={sortBy === "listeners" ? "default" : "outline"}
            onClick={() => setSortBy("listeners")}
            className="h-7 text-xs"
          >
            <Users className="mr-1 h-3 w-3" />
            Listeners
          </Button>
          <Button
            size="sm"
            variant={sortBy === "title" ? "default" : "outline"}
            onClick={() => setSortBy("title")}
            className="h-7 text-xs"
          >
            <Music2 className="mr-1 h-3 w-3" />
            A–Z
          </Button>
        </div>
      </div>

      {/* Channel count */}
      {!isLoading && (
        <p className="mt-3 text-xs text-slate-500">
          {filteredChannels.length}{" "}
          {filteredChannels.length === 1 ? "channel" : "channels"}
          {searchQuery.trim() ? ` matching "${searchQuery}"` : ""}
        </p>
      )}

      {/* Channel Grid */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading
          ? Array.from({ length: 12 }).map((_, i) => (
              <ChannelSkeleton key={i} />
            ))
          : filteredChannels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                isPlaying={
                  audioState.isPlaying &&
                  audioState.lastChannelId === channel.id
                }
                isLoadingStream={
                  audioState.isLoading &&
                  audioState.lastChannelId === channel.id
                }
                onPlay={() => void handlePlay(channel)}
                onStop={handleStop}
              />
            ))}
      </div>

      {!isLoading && filteredChannels.length === 0 && (
        <div className="mt-8 flex flex-col items-center justify-center py-12 text-center">
          <Headphones className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-sm text-slate-500">
            No channels found for &quot;{searchQuery}&quot;
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => setSearchQuery("")}
          >
            Clear search
          </Button>
        </div>
      )}
    </div>
  );
}

function ChannelCard({
  channel,
  isPlaying,
  isLoadingStream,
  onPlay,
  onStop,
}: {
  channel: SomaFMChannel;
  isPlaying: boolean;
  isLoadingStream: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div
      className={`group relative overflow-hidden rounded-lg border transition ${
        isPlaying
          ? "border-slate-400 bg-linear-to-b from-slate-50 to-slate-100 shadow-sm"
          : "border-slate-200 bg-white hover:border-slate-300"
      }`}
    >
      <div className="flex gap-3 p-4">
        {/* Channel Art */}
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={channel.image}
            alt={channel.title}
            loading="lazy"
            decoding="async"
            className={`h-full w-full object-cover transition-opacity duration-300 ${imgLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImgLoaded(true)}
          />
          {!imgLoaded && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Music2 className="h-6 w-6 text-slate-300" />
            </div>
          )}
          {/* Play/Stop overlay */}
          <button
            className={`absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity ${
              isPlaying || isLoadingStream
                ? "opacity-100"
                : "opacity-0 group-hover:opacity-100"
            }`}
            onClick={isPlaying ? onStop : onPlay}
            aria-label={
              isPlaying ? `Stop ${channel.title}` : `Play ${channel.title}`
            }
          >
            {isLoadingStream ? (
              <LoaderCircle className="h-8 w-8 animate-spin text-white" />
            ) : isPlaying ? (
              <Pause className="h-8 w-8 text-white" />
            ) : (
              <PlayIcon className="h-8 w-8 text-white" />
            )}
          </button>
        </div>

        {/* Channel Info */}
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-slate-900">
            {channel.title}
          </h3>
          <p className="mt-0.5 line-clamp-2 text-xs text-slate-500">
            {channel.description}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {channel.listeners.toLocaleString()}
            </span>
            {channel.genre && (
              <span className="truncate italic">{channel.genre}</span>
            )}
          </div>
        </div>
      </div>

      {/* Now Playing Track */}
      {channel.lastPlaying && (
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
          <p className="flex items-center gap-1.5 truncate text-xs text-slate-500">
            {isPlaying && (
              <Disc3 className="h-3 w-3 shrink-0 animate-spin text-slate-400" />
            )}
            <span className="truncate">{channel.lastPlaying}</span>
          </p>
        </div>
      )}
    </div>
  );
}

function ChannelSkeleton() {
  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <div className="flex gap-3 p-4">
        <Skeleton className="h-20 w-20 shrink-0 rounded-md" />
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <div className="border-t border-slate-100 px-4 py-2">
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}
