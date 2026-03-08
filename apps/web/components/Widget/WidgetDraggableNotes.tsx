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
  addNote,
  getNotes,
  removeNote,
  updateNote,
  type NoteEntry,
} from "@/lib/widget-local-first";
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
const WIDGET_VERSION = "0.1.0";

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
  const [visibility, setVisibility] = useAtom(widgetVisibilityAtom);

  useEffect(() => {
    queueMicrotask(() => setIsPositionLoaded(true));
  }, []);

  useEffect(() => {
    let mounted = true;
    void getNotes().then((data) => {
      if (mounted) setItems(data);
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
    const body = noteBody.trim();
    const title = noteTitle.trim() || "Untitled note";
    if (!body) return;
    const next = await addNote({ title, body });
    setItems(next);
    setNoteTitle("");
    setNoteBody("");
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [noteBody, noteTitle]);

  const startEdit = useCallback((item: NoteEntry) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingBody(item.body);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editingId) return;
    const next = await updateNote(editingId, {
      title: editingTitle || "Untitled note",
      body: editingBody,
    });
    setItems(next);
    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
    try {
      triggerLayoutUpdate();
    } catch {}
  }, [editingBody, editingId, editingTitle]);

  const handleDelete = useCallback(
    async (id: string) => {
      const next = await removeNote(id);
      setItems(next);
      if (editingId === id) {
        setEditingId(null);
        setEditingTitle("");
        setEditingBody("");
      }
      try {
        triggerLayoutUpdate();
      } catch {}
    },
    [editingId],
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
            <Input
              value={noteTitle}
              onChange={(e) => setNoteTitle(e.target.value)}
              className="h-8 border-white/15 bg-white/5 text-white"
              placeholder="Title (optional)"
            />
            <textarea
              value={noteBody}
              onChange={(e) => setNoteBody(e.target.value)}
              placeholder="Write your note..."
              className="min-h-18 w-full resize-y rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs text-white outline-none placeholder:text-white/40 focus:border-white/25"
            />
            <button
              type="button"
              onClick={() => void submitNote()}
              className="flex h-8 w-full cursor-pointer items-center justify-center gap-1 rounded-md border border-white/15 bg-white/10 text-xs font-semibold text-white/80 hover:bg-white/20"
            >
              <StickyNote className="h-3.5 w-3.5" />
              Save Note
            </button>
          </div>

          <div className="border-t border-white/10" />
          <div className="max-h-80 space-y-2 overflow-y-auto p-2">
            {items.length === 0 ? (
              <p className="px-1 py-2 text-xs text-white/50">
                No notes yet. Add your first note above.
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
                            className="flex h-7 cursor-pointer items-center gap-1 rounded-md border border-white/15 bg-white/10 px-2 text-[11px] font-semibold text-white/80 hover:bg-white/20"
                          >
                            <Save className="h-3.5 w-3.5" />
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
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
                            className="cursor-pointer rounded p-1 text-white/60 hover:bg-white/10 hover:text-white"
                            title="Edit note"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
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
              Capture quick notes in your dashboard. Notes are stored locally in
              your browser and prepared for migration to IndexedDB.
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
