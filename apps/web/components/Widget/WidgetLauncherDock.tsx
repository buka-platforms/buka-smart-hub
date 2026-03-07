"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { widgetVisibilityAtom, type WidgetId } from "@/data/store";
import { useAtom } from "jotai";
import {
  AppWindow,
  BookOpen,
  Clock,
  CloudSun,
  Globe,
  LayoutGrid,
  Music,
  Radio,
  Rss,
  Timer,
  Tv,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const WIDGET_VISIBILITY_KEY = "widgetVisibility";

// Widget configuration
const WIDGETS: {
  id: WidgetId;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "weather",
    label: "Weather",
    icon: <CloudSun className="h-5 w-5" />,
    description: "Current weather conditions",
  },
  {
    id: "radio",
    label: "Radio",
    icon: <Radio className="h-5 w-5" />,
    description: "Internet radio player",
  },
  {
    id: "time",
    label: "Time",
    icon: <Clock className="h-5 w-5" />,
    description: "Date and time display",
  },
  {
    id: "pomodoro",
    label: "Pomodoro",
    icon: <Timer className="h-5 w-5" />,
    description: "Focus timer with breaks",
  },
  {
    id: "somafm",
    label: "SomaFM",
    icon: <Music className="h-5 w-5" />,
    description: "SomaFM streaming radio player",
  },
  {
    id: "musicpreview",
    label: "Music Preview",
    icon: <Music className="h-5 w-5" />,
    description: "Search and preview track samples",
  },
  {
    id: "youtubelivetv",
    label: "Live TV",
    icon: <Tv className="h-5 w-5" />,
    description: "Watch live TV channels",
  },
  {
    id: "iptv",
    label: "IPTV",
    icon: <Tv className="h-5 w-5" />,
    description: "Live TV / IPTV",
  },
  {
    id: "onlineradioboxnowplaying",
    label: "Now Playing",
    icon: <Rss className="h-5 w-5" />,
    description: "Live radio now playing list",
  },
  {
    id: "quran",
    label: "Quran",
    icon: <BookOpen className="h-5 w-5" />,
    description: "Read and listen to the Quran",
  },
];

// Mini dock shows first N widgets
const MINI_DOCK_COUNT = 4;

export default function WidgetLauncherDock() {
  const [isWidgetPickerOpen, setIsWidgetPickerOpen] = useState(false);
  const [isWorldNewsOpen, setIsWorldNewsOpen] = useState(false);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  // Toggle widget visibility
  const toggleWidget = useCallback(
    (widgetId: WidgetId) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setVisibility((prev: any) => {
        const newVisibility = { ...prev, [widgetId]: !prev[widgetId] };
        try {
          localStorage.setItem(
            WIDGET_VISIBILITY_KEY,
            JSON.stringify(newVisibility),
          );
        } catch {
          // Ignore errors
        }
        return newVisibility;
      });
    },
    [setVisibility],
  );
  const restoreAllWidgets = useCallback(() => {
    const nextVisibility: Record<WidgetId, boolean> = {
      time: true,
      radio: true,
      weather: true,
      somafm: true,
      musicpreview: true,
      quran: true,
      iptv: true,
      youtubelivetv: true,
      pomodoro: true,
      onlineradioboxnowplaying: true,
    };

    setVisibility(nextVisibility);
    try {
      localStorage.setItem(
        WIDGET_VISIBILITY_KEY,
        JSON.stringify(nextVisibility),
      );
    } catch {
      // Ignore errors
    }
  }, [setVisibility]);
  const hideAllWidgets = useCallback(() => {
    const nextVisibility: Record<WidgetId, boolean> = {
      time: false,
      radio: false,
      weather: false,
      somafm: false,
      musicpreview: false,
      quran: false,
      iptv: false,
      youtubelivetv: false,
      pomodoro: false,
      onlineradioboxnowplaying: false,
    };

    setVisibility(nextVisibility);
    try {
      localStorage.setItem(
        WIDGET_VISIBILITY_KEY,
        JSON.stringify(nextVisibility),
      );
    } catch {
      // Ignore errors
    }
  }, [setVisibility]);

  // Get widgets to show in mini dock
  const miniDockWidgets = WIDGETS.slice(0, MINI_DOCK_COUNT);
  const allWidgets = WIDGETS;

  // Count visible widgets
  const visibleCount = Object.values(visibility).filter(Boolean).length;

  // Always render
  const isVisible = true;

  useEffect(() => {
    const handleWorldNewsMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "WORLD_NEWS_CLOSE_MODAL") {
        setIsWorldNewsOpen(false);
      }
    };

    window.addEventListener("message", handleWorldNewsMessage);
    return () => {
      window.removeEventListener("message", handleWorldNewsMessage);
    };
  }, []);

  return (
    <>
      <div
        className={`pointer-events-auto relative z-50 mt-5 ml-3 flex cursor-pointer justify-self-start overflow-visible rounded-lg bg-black/80 shadow-2xl ring-1 ring-white/15 transition-opacity duration-200 md:mt-5 md:ml-4 ${
          isVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ justifySelf: "start" }}
      >
        {/* (removed) drag handle: no longer relevant */}

        <div className="flex items-center gap-1 p-1.5">
          {miniDockWidgets.map((widget) => {
            const isActive = visibility[widget.id];
            return (
              <button
                key={widget.id}
                onClick={() => toggleWidget(widget.id)}
                className={`group relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg transition-all duration-200 ${
                  isActive
                    ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                    : "bg-white/10 text-white/50 hover:bg-white/20 hover:text-white"
                }`}
                title={`${isActive ? "Hide" : "Show"} ${widget.label}`}
              >
                {widget.icon}
                {/* Active indicator dot */}
                {isActive && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-black/80 bg-green-400" />
                )}
              </button>
            );
          })}

          {/* Expand button */}
          <button
            onClick={() => setIsWidgetPickerOpen(true)}
            className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg bg-white/5 text-white/50 transition-all duration-200 hover:bg-white/15 hover:text-white"
            title="Show all widgets"
          >
            <LayoutGrid className="h-5 w-5" />
          </button>

          <div className="mx-1 h-10 w-px bg-white/10" />

          {/* Apps CTA */}
          <Link
            href="/apps"
            title={`${process.env.NEXT_PUBLIC_APP_TITLE} Apps`}
            className="flex h-10 items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
          >
            <AppWindow className="h-4 w-4" />
            <span className="hidden md:inline">Apps</span>
          </Link>

          {/* World News CTA */}
          <button
            title="World News"
            onClick={() => setIsWorldNewsOpen(true)}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-4 text-sm font-semibold text-white/80 backdrop-blur transition-all hover:bg-white/15 hover:text-white"
          >
            <Globe className="h-4 w-4" />
            <span className="hidden md:inline">World News</span>
          </button>
        </div>
      </div>
      <Dialog open={isWidgetPickerOpen} onOpenChange={setIsWidgetPickerOpen}>
        <DialogContent className="w-[min(640px,96vw)] max-w-none border-white/15 bg-black/90 p-0 text-white">
          <DialogTitle className="sr-only">Widget List</DialogTitle>
          <DialogDescription className="sr-only">
            Search and toggle widget visibility.
          </DialogDescription>
          <Command className="rounded-lg bg-transparent text-white">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <LayoutGrid className="h-4 w-4 text-purple-400" />
                <span className="text-sm font-medium">Widgets</span>
                <span className="rounded-full bg-purple-600/30 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  {visibleCount}/{allWidgets.length}
                </span>
              </div>
            </div>
            <CommandInput
              placeholder="Search widgets..."
              className="text-white placeholder:text-white/45"
            />
            <CommandList className="max-h-[55vh] p-2 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 [&::-webkit-scrollbar-thumb]:hover:bg-white/30 [&::-webkit-scrollbar-track]:bg-white/5">
              <CommandEmpty className="py-6 text-center text-sm text-white/70">
                No widget found.
              </CommandEmpty>
              <CommandGroup>
                {allWidgets.map((widget) => {
                  const isActive = visibility[widget.id];
                  return (
                    <CommandItem
                      key={widget.id}
                      value={`${widget.label} ${widget.description}`}
                      onSelect={() => toggleWidget(widget.id)}
                      className={`mb-1 flex cursor-pointer items-center gap-3 rounded-lg border border-transparent px-2.5 py-2.5 text-white data-[selected=true]:text-white ${
                        isActive
                          ? "bg-purple-600/20 data-[selected=true]:bg-purple-600/30"
                          : "bg-white/0 text-white/70 data-[selected=true]:bg-white/10"
                      }`}
                    >
                      <div
                        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md transition-all ${
                          isActive
                            ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                            : "bg-white/10 text-white/55"
                        }`}
                      >
                        {widget.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {widget.label}
                        </div>
                        <div className="text-[11px] text-white/45">
                          {widget.description}
                        </div>
                      </div>
                      <div
                        className={`h-5 w-9 rounded-full p-0.5 transition-colors ${
                          isActive ? "bg-purple-600" : "bg-white/20"
                        }`}
                      >
                        <div
                          className={`h-4 w-4 rounded-full bg-white shadow transition-transform ${
                            isActive ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
              <CommandSeparator className="my-2 bg-white/10" />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setIsWidgetPickerOpen(false);
                    window.location.href = "/apps";
                  }}
                  className="cursor-pointer rounded-lg px-2.5 py-2.5 text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                >
                  <AppWindow className="mr-2 h-4 w-4" />
                  Open Apps
                </CommandItem>
                <CommandItem
                  onSelect={() => {
                    setIsWidgetPickerOpen(false);
                    setIsWorldNewsOpen(true);
                  }}
                  className="cursor-pointer rounded-lg px-2.5 py-2.5 text-white/85 data-[selected=true]:bg-white/10 data-[selected=true]:text-white"
                >
                  <Globe className="mr-2 h-4 w-4" />
                  World News
                </CommandItem>
              </CommandGroup>
            </CommandList>
            <div className="border-t border-white/10 px-3 py-2 text-right">
              {visibleCount === 0 ? (
                <button
                  type="button"
                  onClick={restoreAllWidgets}
                  className="mr-2 cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20"
                >
                  Show All
                </button>
              ) : (
                <button
                  type="button"
                  onClick={hideAllWidgets}
                  className="mr-2 cursor-pointer rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/20"
                >
                  Hide All
                </button>
              )}
              <DialogClose asChild>
                <button
                  type="button"
                  className="cursor-pointer rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/10 hover:text-white"
                >
                  Close
                </button>
              </DialogClose>
            </div>
          </Command>
        </DialogContent>
      </Dialog>
      <Dialog open={isWorldNewsOpen} onOpenChange={setIsWorldNewsOpen}>
        <DialogContent className="top-0 left-0 h-dvh w-screen max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-0 bg-black p-0 sm:rounded-none [&>button]:hidden">
          <DialogTitle className="sr-only">World News</DialogTitle>
          <DialogDescription className="sr-only">
            Watch world news channels in a full-screen modal.
          </DialogDescription>
          {isWorldNewsOpen ? (
            <iframe
              src="/world-news"
              title="World News"
              className="h-full w-full border-0"
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
