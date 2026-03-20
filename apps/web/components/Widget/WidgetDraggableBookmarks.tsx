"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  createBookmark,
  deleteBookmark,
  editBookmark,
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
  Pencil,
  Trash2,
} from "lucide-react";
import Link from "next/link";
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
  const titleInputRef = useRef<HTMLInputElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [items, setItems] = useState<BookmarkEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<BookmarkEntry | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  useEffect(() => {
    if (!addDialogOpen) return;
    const frame = requestAnimationFrame(() => {
      titleInputRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [addDialogOpen]);

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
      if (editingId) {
        const updated = await editBookmark({
          id: editingId,
          title: trimmedTitle,
          url: parsed,
        });
        setItems((prev) =>
          prev.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
      } else {
        const created = await createBookmark({
          title: trimmedTitle,
          url: parsed,
        });
        setItems((prev) => [created, ...prev]);
      }
      setIsAuthenticated(true);
      setEditingId(null);
      setTitle("");
      setUrl("");
      setError("");
      setAddDialogOpen(false);
    } catch (submitError: unknown) {
      if (isBookmarksUnauthorizedError(submitError)) {
        setIsAuthenticated(false);
        setSyncError(
          editingId
            ? "Sign in required to edit bookmarks."
            : "Sign in required to save bookmarks.",
        );
      } else {
        setSyncError(
          editingId
            ? "Unable to save bookmark changes."
            : "Unable to save bookmark right now.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }

    try {
      triggerLayoutUpdate();
    } catch {}
  }, [editingId, isSubmitting, title, url]);

  const startEdit = useCallback((item: BookmarkEntry) => {
    setEditingId(item.id);
    setTitle(item.title);
    setUrl(item.url);
    setError("");
    setAddDialogOpen(true);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSyncError(null);
      try {
        await deleteBookmark(id);
        setIsAuthenticated(true);
        setItems((prev) => prev.filter((entry) => entry.id !== id));
        setDeleteCandidate((prev) => (prev?.id === id ? null : prev));
        if (editingId === id) {
          setEditingId(null);
          setTitle("");
          setUrl("");
          setError("");
          setAddDialogOpen(false);
        }
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
    [editingId, isSubmitting],
  );

  const isVisible = isPositionLoaded && visibility[WIDGET_ID] !== false;
  const visibleItems = items.slice(0, 5);
  const hasMoreItems = items.length > visibleItems.length;
  const openAddDialog = useCallback(() => {
    setEditingId(null);
    setTitle("");
    setUrl("");
    setError("");
    setAddDialogOpen(true);
  }, []);
  const handleAddDialogChange = useCallback((open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setTitle("");
      setUrl("");
      setError("");
    }
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        data-widget-id={WIDGET_ID}
        className={cn(
          "pointer-events-auto flex rounded-lg border bg-card shadow-sm",
          isDragging
            ? "shadow-none transition-none"
            : "transition-opacity duration-300",
          isVisible ? "opacity-100" : "pointer-events-none opacity-0",
        )}
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
            className={cn(
              "flex h-8 cursor-move items-center gap-2 rounded-t-lg border-b border-border bg-muted/50 px-3 select-none",
              isDragging ? "opacity-60" : "opacity-100",
            )}
          >
            <span className="text-[10px] leading-none font-semibold tracking-widest text-muted-foreground uppercase">
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
                    className="flex h-5 w-5 min-w-5 cursor-pointer items-center justify-center rounded-full border text-muted-foreground transition-colors hover:bg-accent"
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

          <div className="flex flex-col gap-3 p-3">
            {isAuthenticated === false ? (
              <p className="rounded-md border border-amber-200/25 bg-amber-500/10 px-2.5 py-2 text-[11px] text-amber-800 dark:text-amber-200">
                Sign in to use synced bookmarks.
              </p>
            ) : null}
            {syncError ? (
              <p className="rounded-md border border-red-200/20 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-800 dark:text-red-200">
                {syncError}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] leading-4 text-muted-foreground">
                Showing up to 5 recent bookmarks.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openAddDialog}
                disabled={isSubmitting}
                className="h-7 cursor-pointer rounded-sm border bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <BookmarkPlus className="h-4 w-4" />
                Add bookmark
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />
          <div className="flex max-h-72 flex-col gap-1 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                Loading bookmarks...
              </p>
            ) : visibleItems.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                {isAuthenticated !== false
                  ? "No bookmarks yet. Add your first bookmark."
                  : "Sign in to start saving bookmarks."}
              </p>
            ) : (
              visibleItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-border bg-muted/50 px-2 py-1.5"
                >
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="min-w-0 flex-1"
                    title={item.url}
                  >
                    <p className="truncate text-xs font-medium text-foreground">
                      {item.title}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {item.url}
                    </p>
                  </a>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Open link"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => startEdit(item)}
                    disabled={isSubmitting}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Edit bookmark"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteCandidate(item)}
                    disabled={isSubmitting}
                    className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-300"
                    title="Delete bookmark"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))
            )}
            {hasMoreItems ? (
              <p className="px-1 pt-1 text-[11px] text-muted-foreground">
                Showing {visibleItems.length} of {items.length} bookmarks.
              </p>
            ) : null}
          </div>
          <div className="border-t border-border" />
          <div className="flex items-center justify-end px-3 py-2">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="h-7 cursor-pointer rounded-sm border bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground"
            >
              <Link href="/apps/bookmarks">Go to bookmark</Link>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={addDialogOpen} onOpenChange={handleAddDialogChange}>
        <DialogContent className="sm:max-w-[32rem]">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Bookmark" : "Add Bookmark"}
            </DialogTitle>
            <DialogDescription className="text-left">
              {editingId
                ? "Update the saved link from a focused dialog."
                : "Save a link from a focused dialog instead of filling the widget inline."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3">
            {isAuthenticated === false ? (
              <p className="rounded-md border border-amber-200/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                Sign in to save synced bookmarks.
              </p>
            ) : null}
            {syncError ? (
              <p className="rounded-md border border-red-200/20 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                {syncError}
              </p>
            ) : null}

            <Input
              ref={titleInputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-9 border-input bg-background text-foreground"
              placeholder="Title (optional)"
              disabled={isAuthenticated === false || isSubmitting}
            />
            <Input
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                if (error) setError("");
              }}
              className="h-9 border-input bg-background text-foreground"
              placeholder="https://example.com"
              disabled={isAuthenticated === false || isSubmitting}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitBookmark();
                }
              }}
            />
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleAddDialogChange(false)}
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => void submitBookmark()}
              disabled={isAuthenticated === false || isSubmitting}
              className="cursor-pointer"
            >
              <BookmarkPlus data-icon="inline-start" />
              {isSubmitting
                ? "Saving..."
                : editingId
                  ? "Update bookmark"
                  : "Save bookmark"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      <AlertDialog
        open={deleteCandidate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteCandidate(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bookmark?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The bookmark will be removed from
              your synced bookmarks.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isSubmitting}
              className="cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                type="button"
                variant="destructive"
                className="cursor-pointer"
                disabled={isSubmitting || deleteCandidate === null}
                onClick={(event) => {
                  event.preventDefault();
                  if (!deleteCandidate) return;
                  void handleDelete(deleteCandidate.id);
                }}
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
