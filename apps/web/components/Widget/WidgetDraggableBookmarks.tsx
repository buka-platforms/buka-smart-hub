"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { widgetVisibilityAtom } from "@/data/store";
import {
  createBookmark,
  deleteBookmark,
  isBookmarksUnauthorizedError,
  listBookmarks,
  type BookmarkEntry,
} from "@/lib/widget-bookmarks-api";
import {
  getSavedWidgetPosition,
  observeWidget,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  type WidgetId,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import {
  BookmarkPlus,
  ExternalLink,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDGET_ID = "bookmarks";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "0.2.0";

function normalizeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate =
    trimmed.startsWith("http://") || trimmed.startsWith("https://")
      ? trimmed
      : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export default function WidgetDraggableBookmarks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<BookmarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  useEffect(() => {
    let mounted = true;

    setIsLoading(true);
    setSyncError(null);
    void listBookmarks()
      .then((data) => {
        if (!mounted) return;
        setItems(data);
        setIsAuthenticated(true);
      })
      .catch((loadError: unknown) => {
        if (!mounted) return;
        if (isBookmarksUnauthorizedError(loadError)) {
          setItems([]);
          setIsAuthenticated(false);
          setSyncError("Sign in required to load bookmarks.");
          return;
        }

        setIsAuthenticated((prev) => (prev === null ? true : prev));
        setSyncError("Unable to load bookmarks right now.");
      })
      .finally(() => {
        if (mounted) {
          setIsLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    observeWidget(WIDGET_ID, el);
    try {
      triggerLayoutUpdate();
    } catch {}
    return () => unobserveWidget(WIDGET_ID);
  }, []);

  useEffect(() => {
    const handleReset = (e: Event) => {
      const customEvent = e as CustomEvent<
        Record<string, { x: number; y: number }>
      >;
      const detail = customEvent.detail || {};
      if (!getSavedWidgetPosition(WIDGET_ID)) {
        if (
          Object.prototype.hasOwnProperty.call(detail, WIDGET_ID) ||
          Object.keys(detail).length > 1
        ) {
          setIsPositionLoaded(true);
        }
      }
    };
    window.addEventListener("widget-positions-reset", handleReset);
    return () =>
      window.removeEventListener("widget-positions-reset", handleReset);
  }, []);

  const submitBookmark = useCallback(async () => {
    if (isSubmitting) return;

    const parsed = normalizeUrl(url);
    if (!parsed) {
      setError("Please enter a valid URL.");
      return;
    }

    const trimmedTitle = title.trim() || new URL(parsed).hostname;
    setIsSubmitting(true);
    setSyncError(null);
    try {
      const created = await createBookmark({
        title: trimmedTitle,
        url: parsed,
      });
      setItems((prev) => [created, ...prev]);
      setIsAuthenticated(true);
      setTitle("");
      setUrl("");
      setError("");
    } catch (submitError: unknown) {
      if (isBookmarksUnauthorizedError(submitError)) {
        setIsAuthenticated(false);
        setSyncError("Sign in required to save bookmarks.");
      } else {
        setSyncError("Unable to save bookmark right now.");
      }
    } finally {
      setIsSubmitting(false);
    }

    try {
      triggerLayoutUpdate();
    } catch {}
  }, [isSubmitting, title, url]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSyncError(null);
      try {
        await deleteBookmark(id);
        setIsAuthenticated(true);
        setItems((prev) => prev.filter((entry) => entry.id !== id));
      } catch (deleteError: unknown) {
        if (isBookmarksUnauthorizedError(deleteError)) {
          setIsAuthenticated(false);
          setSyncError("Sign in required to delete bookmarks.");
        } else {
          setSyncError("Unable to delete bookmark right now.");
        }
      } finally {
        setIsSubmitting(false);
      }

      try {
        triggerLayoutUpdate();
      } catch {}
    },
    [isSubmitting],
  );

  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={`pointer-events-auto flex rounded-lg bg-black/80 shadow-lg ring-1 ring-white/15 ${
          isDragging
            ? "shadow-none transition-none"
            : "transition-opacity duration-300"
        } ${isVisible ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <div className="flex w-full flex-col">
          <div
            draggable
            onDragStart={(e) => {
              try {
                e.dataTransfer?.setData("text/widget-id", WIDGET_ID);
                if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
              } catch {}
              setIsDragging(true);
            }}
            onDragEnd={() => setIsDragging(false)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              try {
                const src = e.dataTransfer?.getData("text/widget-id");
                if (src && src !== WIDGET_ID) {
                  swapWidgetPositions(src as WidgetId, WIDGET_ID as WidgetId);
                }
              } catch {}
            }}
            className={`flex h-8 cursor-move items-center gap-2 border-b border-white/10 px-3 select-none ${
              isDragging ? "opacity-60" : "opacity-100"
            }`}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-white/50 uppercase">
              Bookmarks
            </span>
            <div className="ml-auto">
              <DropdownMenu
                open={moreMenuOpen}
                onOpenChange={setMoreMenuOpen}
                modal={false}
              >
                <DropdownMenuTrigger asChild>
                  <button
                    aria-label="More options"
                    className="flex h-5 w-5 min-w-5 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/3 text-white/50 transition-colors hover:bg-white/8"
                    title="More options"
                  >
                    <MoreHorizontal className="h-2.5 w-2.5" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={6}
                  className="min-w-40"
                >
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault();
                      setMoreMenuOpen(false);
                      setVisibility((prev) => ({
                        ...prev,
                        [WIDGET_ID]: false,
                      }));
                      try {
                        localStorage.setItem(
                          WIDGET_VISIBILITY_KEY,
                          JSON.stringify({ ...visibility, [WIDGET_ID]: false }),
                        );
                      } catch {}
                    }}
                  >
                    Hide widget
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      setMoreMenuOpen(false);
                      setAboutDialogOpen(true);
                    }}
                    className="cursor-pointer"
                  >
                    About widget
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="space-y-2 p-3">
            {isAuthenticated === false ? (
              <p className="rounded-md border border-amber-200/25 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-100">
                Sign in to use synced bookmarks.
              </p>
            ) : null}
            {syncError ? (
              <p className="rounded-md border border-red-200/20 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-100">
                {syncError}
              </p>
            ) : null}
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-8 border-white/15 bg-white/5 text-white"
              placeholder="Title (optional)"
              disabled={isAuthenticated === false || isSubmitting}
            />
            <div className="flex gap-2">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="h-8 border-white/15 bg-white/5 text-white"
                placeholder="https://example.com"
                disabled={isAuthenticated === false || isSubmitting}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void submitBookmark();
                  }
                }}
              />
              <button
                type="button"
                onClick={() => void submitBookmark()}
                disabled={isAuthenticated === false || isSubmitting}
                className="flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2.5 text-xs font-semibold text-white/80 hover:bg-white/20"
                title="Add bookmark"
              >
                <BookmarkPlus className="h-3.5 w-3.5" />
                {isSubmitting ? "Saving..." : "Add"}
              </button>
            </div>
            {error ? <p className="text-[11px] text-red-300">{error}</p> : null}
          </div>

          <div className="border-t border-white/10" />
          <div className="max-h-72 space-y-1 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-1 py-2 text-xs text-white/50">
                Loading bookmarks...
              </p>
            ) : items.length === 0 ? (
              <p className="px-1 py-2 text-xs text-white/50">
                {isAuthenticated !== false
                  ? "No bookmarks yet. Add your first URL above."
                  : "Sign in to start saving bookmarks."}
              </p>
            ) : (
              items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-white/5 px-2 py-1.5"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1"
                    title={item.url}
                  >
                    <p className="truncate text-xs font-medium text-white">
                      {item.title}
                    </p>
                    <p className="truncate text-[10px] text-white/50">
                      {item.url}
                    </p>
                  </a>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                    title="Open link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => void handleDelete(item.id)}
                    disabled={isSubmitting}
                    className="cursor-pointer rounded p-1 text-white/60 hover:bg-white/10 hover:text-red-300"
                    title="Delete bookmark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Bookmarks Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Save and open frequently used URLs directly from your desktop
              widget area. Bookmarks sync to your account when you are signed
              in.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between border-t pt-4">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{WIDGET_VERSION}</span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
