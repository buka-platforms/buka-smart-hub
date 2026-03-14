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
import { MoreHorizontal, Pencil, Save, StickyNote, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const WIDGET_ID = "notes";
const WIDGET_VISIBILITY_KEY = "widgetVisibility";
const WIDGET_VERSION = "0.2.0";

export default function WidgetDraggableNotes() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isPositionLoaded, setIsPositionLoaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [aboutDialogOpen, setAboutDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");
  const [items, setItems] = useState<NoteEntry[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");
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
    const title = noteTitle.trim() || "Untitled note";
    if (!body) return;

    setIsSubmitting(true);
    setSyncError(null);
    try {
      const created = await createNote({ title, body });
      setItems((prev) => [created, ...prev]);
      setIsAuthenticated(true);
      setNoteTitle("");
      setNoteBody("");
    } catch (error: unknown) {
      if (isNotesUnauthorizedError(error)) {
        setIsAuthenticated(false);
        setSyncError("Sign in required to save notes.");
      } else {
        setSyncError("Unable to save note right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [isSubmitting, noteBody, noteTitle]);

  const startEdit = useCallback((item: NoteEntry) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingBody(item.body);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId || isSubmitting) return;
    setIsSubmitting(true);
    setSyncError(null);
    try {
      const updated = await editNote({
        id: editingId,
        title: editingTitle || "Untitled note",
        body: editingBody,
      });
      setIsAuthenticated(true);
      setItems((prev) =>
        prev.map((entry) => (entry.id === updated.id ? updated : entry)),
      );
      setEditingId(null);
      setEditingTitle("");
      setEditingBody("");
    } catch (error: unknown) {
      if (isNotesUnauthorizedError(error)) {
        setIsAuthenticated(false);
        setSyncError("Sign in required to edit notes.");
      } else {
        setSyncError("Unable to save note changes.");
      }
    } finally {
      setIsSubmitting(false);
    }
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [editingBody, editingId, editingTitle, isSubmitting]);

  const handleDelete = useCallback(
    async (id: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setSyncError(null);
      try {
        await deleteNote(id);
        setIsAuthenticated(true);
        setItems((prev) => prev.filter((entry) => entry.id !== id));
        if (editingId === id) {
          setEditingId(null);
          setEditingTitle("");
          setEditingBody("");
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
                Sign in to use synced notes.
              </p>
            ) : null}
            {syncError ? (
              <p className="rounded-md border border-red-200/20 bg-red-500/10 px-2.5 py-2 text-[11px] text-red-100">
                {syncError}
              </p>
            ) : null}
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="h-8 border-white/15 bg-white/5 text-white"
              placeholder="Title (optional)"
              disabled={isAuthenticated === false || isSubmitting}
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write your note..."
              className="min-h-18 w-full resize-y rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-white/25"
              disabled={isAuthenticated === false || isSubmitting}
            />
            <button
              type="button"
              onClick={() => void submitNote()}
              disabled={isAuthenticated === false || isSubmitting}
              className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 text-xs font-semibold text-white/80 hover:bg-white/20"
            >
              <StickyNote className="h-3.5 w-3.5" />
              {isSubmitting ? "Saving..." : "Save Note"}
            </button>
          </div>

          <div className="border-t border-white/10" />
          <div className="max-h-80 space-y-2 overflow-y-auto p-2">
            {isLoading ? (
              <p className="px-1 py-2 text-xs text-white/50">
                Loading notes...
              </p>
            ) : items.length === 0 ? (
              <p className="px-1 py-2 text-xs text-white/50">
                {isAuthenticated !== false
                  ? "No notes yet. Add your first note above."
                  : "Sign in to start saving notes."}
              </p>
            ) : (
              items.map((item) => {
                const isEditing = editingId === item.id;
                return (
                  <div
                    key={item.id}
                    className="rounded-md border border-white/10 bg-white/5 p-2"
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <Input
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="h-8 border-white/15 bg-white/5 text-white"
                        />
                        <textarea
                          value={editingBody}
                          onChange={(e) => setEditingBody(e.target.value)}
                          className="min-h-20 w-full resize-y rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => void saveEdit()}
                            disabled={isSubmitting}
                            className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={isSubmitting}
                            className="h-7 cursor-pointer rounded-md border border-white/15 bg-white/5 px-2 text-[11px] font-semibold text-white/70 hover:bg-white/15"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-xs font-semibold text-white">
                          {item.title}
                        </p>
                        <p className="mt-1 line-clamp-4 text-xs whitespace-pre-wrap text-white/75">
                          {item.body}
                        </p>
                        <div className="mt-2 flex gap-1">
                          <button
                            type="button"
                            onClick={() => startEdit(item)}
                            disabled={isSubmitting}
                            className="cursor-pointer rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                            title="Edit note"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            disabled={isSubmitting}
                            className="cursor-pointer rounded p-1 text-white/60 hover:bg-white/10 hover:text-red-300"
                            title="Delete note"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
    </>
  );
}
