"use client";

import { Input } from "@/components/ui/input";
import {
  createBookmark,
  deleteBookmark,
  isBookmarksUnauthorizedError,
  listBookmarks,
  type BookmarkEntry,
} from "@/lib/widget-bookmarks-api";
import {
  Bookmark,
  BookmarkPlus,
  ExternalLink,
  Globe,
  Loader2,
  Search,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

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

function getFaviconUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(parsed.hostname)}&sz=32`;
  } catch {
    return null;
  }
}

function formatDate(dateStr: string) {
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
}

export default function BookmarksClient() {
  const [items, setItems] = useState<BookmarkEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [formError, setFormError] = useState("");

  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);

  const urlInputRef = useRef<HTMLInputElement>(null);

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
      .catch((error: unknown) => {
        if (!mounted) return;
        if (isBookmarksUnauthorizedError(error)) {
          setItems([]);
          setIsAuthenticated(false);
          setSyncError("Sign in required to load bookmarks.");
          return;
        }
        setIsAuthenticated((prev) => (prev === null ? true : prev));
        setSyncError("Unable to load bookmarks right now.");
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
        item.url.toLowerCase().includes(q),
    );
  }, [items, searchQuery]);

  const openForm = useCallback(() => {
    setShowForm(true);
    setTimeout(() => urlInputRef.current?.focus(), 0);
  }, []);

  const cancelForm = useCallback(() => {
    setShowForm(false);
    setTitle("");
    setUrl("");
    setFormError("");
  }, []);

  const submitBookmark = useCallback(async () => {
    if (isSubmitting) return;

    const parsed = normalizeUrl(url);
    if (!parsed) {
      setFormError("Please enter a valid URL.");
      return;
    }

    const trimmedTitle = title.trim() || new URL(parsed).hostname;
    setIsSubmitting(true);
    setSyncError(null);
    setFormError("");
    try {
      const created = await createBookmark({
        title: trimmedTitle,
        url: parsed,
      });
      setItems((prev) => [created, ...prev]);
      setIsAuthenticated(true);
      setTitle("");
      setUrl("");
      setShowForm(false);
    } catch (error: unknown) {
      if (isBookmarksUnauthorizedError(error)) {
        setIsAuthenticated(false);
        setSyncError("Sign in required to save bookmarks.");
      } else {
        setSyncError("Unable to save bookmark right now.");
      }
    } finally {
      setIsSubmitting(false);
    }
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
      } catch (error: unknown) {
        if (isBookmarksUnauthorizedError(error)) {
          setIsAuthenticated(false);
          setSyncError("Sign in required to delete bookmarks.");
        } else {
          setSyncError("Unable to delete bookmark right now.");
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting],
  );

  return (
    <div className="mx-auto max-w-4xl">
      {isAuthenticated === false && (
        <div className="mb-4 rounded-lg border border-amber-300/40 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sign in to use synced bookmarks.
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
            placeholder="Search bookmarks..."
          />
        </div>
        <button
          type="button"
          onClick={openForm}
          disabled={isAuthenticated === false || isSubmitting}
          className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <BookmarkPlus className="h-4 w-4" />
          Add Bookmark
        </button>
      </div>

      {showForm && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-800">
              New Bookmark
            </h3>
            <button
              type="button"
              onClick={cancelForm}
              className="cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            >
              <span className="sr-only">Close</span>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mb-3 h-9 border-slate-200 bg-slate-50 text-sm"
            placeholder="Title (optional)"
            disabled={isAuthenticated === false || isSubmitting}
          />
          <Input
            ref={urlInputRef}
            value={url}
            onChange={(e) => {
              setUrl(e.target.value);
              if (formError) setFormError("");
            }}
            className="mb-3 h-9 border-slate-200 bg-slate-50 text-sm"
            placeholder="https://example.com"
            disabled={isAuthenticated === false || isSubmitting}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void submitBookmark();
              }
            }}
          />
          {formError && (
            <p className="mb-3 text-xs text-red-600">{formError}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void submitBookmark()}
              disabled={
                isAuthenticated === false || isSubmitting || !url.trim()
              }
              className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-slate-900 px-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <BookmarkPlus className="h-4 w-4" />
              {isSubmitting ? "Saving..." : "Save Bookmark"}
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
          <span className="ml-2 text-sm text-slate-500">
            Loading bookmarks...
          </span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Bookmark className="mb-3 h-10 w-10 text-slate-300" />
          <p className="text-sm font-medium text-slate-500">
            {searchQuery.trim()
              ? "No bookmarks match your search."
              : isAuthenticated !== false
                ? "No bookmarks yet. Add your first bookmark above."
                : "Sign in to start saving bookmarks."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const favicon = getFaviconUrl(item.url);
            return (
              <div
                key={item.id}
                className="group rounded-lg border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="p-4">
                  <div className="mb-2 flex items-start justify-between gap-2">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex min-w-0 flex-1 items-center gap-2"
                      title={item.url}
                    >
                      {favicon ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={favicon}
                          alt=""
                          width={16}
                          height={16}
                          className="h-4 w-4 shrink-0 rounded-sm"
                          loading="lazy"
                        />
                      ) : (
                        <Globe className="h-4 w-4 shrink-0 text-slate-400" />
                      )}
                      <h3 className="truncate text-sm font-semibold text-slate-900">
                        {item.title}
                      </h3>
                    </a>
                    <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Open in new tab"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => void handleDelete(item.id)}
                        disabled={isSubmitting}
                        className="cursor-pointer rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Delete bookmark"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="truncate text-xs text-slate-500">{item.url}</p>
                  <p className="mt-2 text-[11px] text-slate-400">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
