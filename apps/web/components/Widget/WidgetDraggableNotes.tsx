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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { widgetVisibilityAtom } from "@/data/store";
import { cn } from "@/lib/utils";
import {
  createNote,
  deleteNote,
  editNote,
  isNotesUnauthorizedError,
  listNotes,
  type NoteEntry,
} from "@/lib/widget-notes-api";
import {
  getSavedWidgetPosition,
  observeWidget,
  swapWidgetPositions,
  triggerLayoutUpdate,
  unobserveWidget,
  type WidgetId,
} from "@/lib/widget-positions";
import { useAtom } from "jotai";
import { MoreHorizontal, Pencil, StickyNote, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDGET_ID = "notes";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "0.2.0";

export default function WidgetDraggableNotes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const noteBodyRef = useRef<HTMLTextAreaElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [items, setItems] = useState<NoteEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<NoteEntry | null>(
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
      noteBodyRef.current?.focus();
    });
    return () => cancelAnimationFrame(frame);
  }, [addDialogOpen]);

  useEffect(() => {
    let mounted = true;

    setIsLoading(true);
    setSyncError(null);
    void listNotes()
      .then((data) => {
        if (!mounted) return;
        setItems(data);
        setIsAuthenticated(true);
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        if (isNotesUnauthorizedError(error)) {
          setItems([]);
          setIsAuthenticated(false);
          setSyncError("Sign in required to load notes.");
          return;
        }

        setIsAuthenticated((prev) => (prev === null ? true : prev));
        setSyncError("Unable to load notes right now.");
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

  const submitNote = useCallback(async () => {
    if (isSubmitting) return;

    const body = noteBody.trim();
    const title = noteTitle.trim() || null;
    if (!body) return;

    setIsSubmitting(true);
    setSyncError(null);
    try {
      if (editingId) {
        const updated = await editNote({
          id: editingId,
          title,
          body,
        });
        setItems((prev) =>
          prev.map((entry) => (entry.id === updated.id ? updated : entry)),
        );
      } else {
        const created = await createNote({ title, body });
        setItems((prev) => [created, ...prev]);
      }
      setIsAuthenticated(true);
      setEditingId(null);
      setNoteTitle("");
      setNoteBody("");
      setAddDialogOpen(false);
    } catch (error: unknown) {
      if (isNotesUnauthorizedError(error)) {
        setIsAuthenticated(false);
        setSyncError(
          editingId
            ? "Sign in required to edit notes."
            : "Sign in required to save notes.",
        );
      } else {
        setSyncError(
          editingId
            ? "Unable to save note changes."
            : "Unable to save note right now.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [editingId, isSubmitting, noteBody, noteTitle]);

  const startEdit = useCallback((item: NoteEntry) => {
    setAddDialogOpen(true);
    setEditingId(item.id);
    setNoteTitle(item.title ?? "");
    setNoteBody(item.body);
  }, []);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSyncError(null);
      try {
        await deleteNote(id);
        setIsAuthenticated(true);
        setItems((prev) => prev.filter((entry) => entry.id !== id));
        setDeleteCandidate((prev) => (prev?.id === id ? null : prev));
        if (editingId === id) {
          setEditingId(null);
          setNoteTitle("");
          setNoteBody("");
          setAddDialogOpen(false);
        }
      } catch (error: unknown) {
        if (isNotesUnauthorizedError(error)) {
          setIsAuthenticated(false);
          setSyncError("Sign in required to delete notes.");
        } else {
          setSyncError("Unable to delete note right now.");
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
    setNoteTitle("");
    setNoteBody("");
    setAddDialogOpen(true);
  }, []);
  const handleAddDialogChange = useCallback((open: boolean) => {
    setAddDialogOpen(open);
    if (!open) {
      setEditingId(null);
      setNoteTitle("");
      setNoteBody("");
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
              Notes
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
                Sign in to use synced notes.
              </p>
            ) : null}
            {syncError ? (
              <p className="rounded-md border border-red-200/20 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-800 dark:text-red-200">
                {syncError}
              </p>
            ) : null}
            <div className="flex items-center justify-between gap-3">
              <p className="text-[11px] leading-4 text-muted-foreground">
                Capture quick notes and keep them synced.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={openAddDialog}
                disabled={isSubmitting}
                className="h-7 cursor-pointer rounded-sm border bg-secondary px-2.5 text-[11px] font-medium text-secondary-foreground shadow-none transition-all hover:bg-accent hover:text-accent-foreground"
              >
                <StickyNote className="h-4 w-4" />
                Add note
              </Button>
            </div>
          </div>

          <div className="border-t border-border" />
          <div className="flex max-h-80 flex-col gap-2 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                Loading notes...
              </p>
            ) : visibleItems.length === 0 ? (
              <p className="px-1 py-2 text-xs text-muted-foreground">
                {isAuthenticated !== false
                  ? "No notes yet. Add your first note."
                  : "Sign in to start saving notes."}
              </p>
            ) : (
              visibleItems.map((item) => {
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-border bg-muted/50 p-2"
                  >
                    {item.title?.trim() ? (
                      <p className="truncate text-xs font-semibold text-foreground">
                        {item.title}
                      </p>
                    ) : null}
                    <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-muted-foreground">
                      {item.body}
                    </p>
                    <div className="mt-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        disabled={isSubmitting}
                        className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                        title="Edit note"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCandidate(item)}
                        disabled={isSubmitting}
                        className="cursor-pointer rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-500 dark:hover:text-red-300"
                        title="Delete note"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
            {hasMoreItems ? (
              <p className="px-1 pt-1 text-[11px] text-muted-foreground">
                Showing {visibleItems.length} of {items.length} notes.
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
              <Link href="/apps/notes">Open Notes</Link>
            </Button>
          </div>
        </div>
      </div>

      <Sheet open={addDialogOpen} onOpenChange={handleAddDialogChange}>
        <SheetContent
          side="right"
          className="data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom sm:data-[state=closed]:slide-out-to-right sm:data-[state=open]:slide-in-from-right inset-x-0 top-auto bottom-0 h-[85dvh] w-full rounded-t-3xl border-t border-l-0 bg-background/98 p-0 backdrop-blur-sm sm:inset-y-0 sm:right-0 sm:left-auto sm:h-full sm:w-[32rem] sm:max-w-[32rem] sm:rounded-none sm:border-t-0 sm:border-l [&>button]:cursor-pointer"
        >
          <div className="flex h-full flex-col">
            <div className="px-4 pt-3 sm:hidden">
              <div className="mx-auto h-1.5 w-12 rounded-full bg-muted" />
            </div>

            <SheetHeader className="border-b border-border/80 px-4 py-4 sm:px-6 sm:py-5">
              <SheetTitle>{editingId ? "Edit Note" : "Add Note"}</SheetTitle>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
              <div className="flex h-full flex-col gap-4">
                {isAuthenticated === false ? (
                  <p className="rounded-md border border-amber-200/25 bg-amber-500/10 px-3 py-2 text-sm text-amber-800 dark:text-amber-200">
                    Sign in to save synced notes.
                  </p>
                ) : null}
                {syncError ? (
                  <p className="rounded-md border border-red-200/20 bg-red-500/10 px-3 py-2 text-sm text-red-800 dark:text-red-200">
                    {syncError}
                  </p>
                ) : null}

                <div className="bg-transparent">
                  <Input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    className="h-10 border-0 bg-transparent px-0 text-lg font-medium text-foreground shadow-none placeholder:text-lg placeholder:font-medium focus-visible:ring-0 md:!text-lg"
                    placeholder="Title"
                    disabled={isAuthenticated === false || isSubmitting}
                  />
                  <textarea
                    ref={noteBodyRef}
                    value={noteBody}
                    onChange={(e) => setNoteBody(e.target.value)}
                    placeholder="Take a note..."
                    className="min-h-64 w-full resize-none bg-transparent px-0 py-3 text-base text-foreground outline-none placeholder:text-muted-foreground/90 sm:min-h-80"
                    disabled={isAuthenticated === false || isSubmitting}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        void submitNote();
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border/80 bg-background/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
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
                  onClick={() => void submitNote()}
                  disabled={
                    isAuthenticated === false ||
                    isSubmitting ||
                    !noteBody.trim()
                  }
                  className="cursor-pointer"
                >
                  <StickyNote data-icon="inline-start" />
                  {isSubmitting
                    ? "Saving..."
                    : editingId
                      ? "Update note"
                      : "Save note"}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={aboutDialogOpen} onOpenChange={setAboutDialogOpen}>
        <DialogContent className="sm:max-w-106.25">
          <DialogHeader>
            <DialogTitle>About Notes Widget</DialogTitle>
            <DialogDescription className="mt-2 text-left">
              Capture quick notes in your dashboard. Notes sync to your account
              when you are signed in.
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
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The note will be removed from your
              synced notes.
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
