"use client";

import { Input } from "@/components/ui/input";
import {
  createNote,
  deleteNote,
  editNote,
  isNotesUnauthorizedError,
  listNotes,
  type NoteEntry,
} from "@/lib/widget-notes-api";
import {
  FileText,
  Loader2,
  Pencil,
  Plus,
  Save,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export default function NotesClient() {
  const [items, setItems] = useState<NoteEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteBody, setNoteBody] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingBody, setEditingBody] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);

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
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.body.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const openNewForm = useCallback(() => {
    setShowForm(true);
    setEditingId(null);
    setTimeout(() => titleInputRef.current?.focus(), 0);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setNoteTitle("");
    setNoteBody("");
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
      setShowForm(false);
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
  }, [isSubmitting, noteBody, noteTitle]);

  const startEdit = useCallback((item: NoteEntry) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
    setEditingBody(item.body);
    setShowForm(false);
    setExpandedId(item.id);
  }, []);

  const cancelEdit = useCallback(() => {
    setEditingId(null);
    setEditingTitle("");
    setEditingBody("");
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
        if (expandedId === id) setExpandedId(null);
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
    },
    [editingId, expandedId, isSubmitting],
  );

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="mx-auto max-w-4xl">
      {isAuthenticated === false && (
        <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sign in to use synced notes.
        </div>
      )}

      {syncError && (
        <div className="mb-4 rounded-lg border border-red-300/40 bg-red-50 px-4 py-3 text-sm text-red-800">
          {syncError}
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9 border-slate-200 bg-white pl-9 text-sm"
            placeholder="Search notes..."
          />
        </div>
        <button
          type="button"
          onClick={openNewForm}
          disabled={isAuthenticated === false || isSubmitting}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          New Note
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">New Note</h3>
            <button
              type="button"
              onClick={cancelForm}
              className="cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <Input
            ref={titleInputRef}
            value={noteTitle}
            onChange={(e) => setNoteTitle(e.target.value)}
            className="mb-3 h-9 border-slate-200 bg-slate-50 text-sm"
            placeholder="Title (optional)"
            disabled={isAuthenticated === false || isSubmitting}
          />
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value)}
            placeholder="Write your note..."
            className="mb-3 min-h-32 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
            disabled={isAuthenticated === false || isSubmitting}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitNote()}
              disabled={
                isAuthenticated === false || isSubmitting || !noteBody.trim()
              }
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <StickyNote className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Note"}
            </button>
            <button
              type="button"
              onClick={cancelForm}
              disabled={isSubmitting}
              className="inline-flex h-9 cursor-pointer items-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">Loading notes...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {searchQuery.trim()
              ? "No notes match your search."
              : isAuthenticated !== false
                ? "No notes yet. Create your first note above."
                : "Sign in to start saving notes."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const isEditing = editingId === item.id;
            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`group rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md ${isExpanded ? "sm:col-span-2 lg:col-span-3" : ""}`}
              >
                {isEditing ? (
                  <div className="p-4">
                    <Input
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      className="mb-3 h-9 border-slate-200 bg-slate-50 text-sm font-semibold"
                      disabled={isSubmitting}
                    />
                    <textarea
                      value={editingBody}
                      onChange={(e) => setEditingBody(e.target.value)}
                      className="mb-3 min-h-40 w-full resize-y rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 outline-none focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
                      disabled={isSubmitting}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit()}
                        disabled={isSubmitting}
                        className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md bg-slate-900 px-3 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        disabled={isSubmitting}
                        className="inline-flex h-8 cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : item.id)
                        }
                        className="min-w-0 flex-1 cursor-pointer text-left"
                      >
                        <h3 className="truncate text-sm font-semibold text-slate-900">
                          {item.title}
                        </h3>
                      </button>
                      <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => startEdit(item)}
                          disabled={isSubmitting}
                          className="cursor-pointer rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                          title="Edit note"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(item.id)}
                          disabled={isSubmitting}
                          className="cursor-pointer rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                          title="Delete note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <p
                      className={`text-xs whitespace-pre-wrap text-slate-600 ${isExpanded ? "" : "line-clamp-4"}`}
                    >
                      {item.body}
                    </p>
                    <p className="mt-3 text-[11px] text-slate-400">
                      {formatDate(item.updatedAt)}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
