export interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export interface NoteEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

interface WidgetStorageDriver {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
}

const STORAGE_KEYS = {
  bookmarks: "widgetBookmarksData",
  notes: "widgetNotesData",
};

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

const localStorageDriver: WidgetStorageDriver = {
  async get<T>(key: string): Promise<T | null> {
    if (!canUseStorage()) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },
  async set<T>(key: string, value: T): Promise<void> {
    if (!canUseStorage()) return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore local storage quota and serialization failures
    }
  },
};

// The driver is intentionally abstract so we can swap to IndexedDB later.
const storageDriver: WidgetStorageDriver = localStorageDriver;

function createId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }
}

export async function getBookmarks(): Promise<BookmarkEntry[]> {
  const data = await storageDriver.get<BookmarkEntry[]>(STORAGE_KEYS.bookmarks);
  return Array.isArray(data) ? data : [];
}

export async function addBookmark(
  input: Omit<BookmarkEntry, "id" | "createdAt" | "updatedAt">,
): Promise<BookmarkEntry[]> {
  const now = new Date().toISOString();
  const nextItem: BookmarkEntry = {
    id: createId(),
    title: input.title.trim(),
    url: input.url.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const existing = await getBookmarks();
  const next = [nextItem, ...existing];
  await storageDriver.set(STORAGE_KEYS.bookmarks, next);
  return next;
}

export async function removeBookmark(id: string): Promise<BookmarkEntry[]> {
  const existing = await getBookmarks();
  const next = existing.filter((entry) => entry.id !== id);
  await storageDriver.set(STORAGE_KEYS.bookmarks, next);
  return next;
}

export async function getNotes(): Promise<NoteEntry[]> {
  const data = await storageDriver.get<NoteEntry[]>(STORAGE_KEYS.notes);
  return Array.isArray(data) ? data : [];
}

export async function addNote(
  input: Omit<NoteEntry, "id" | "createdAt" | "updatedAt">,
): Promise<NoteEntry[]> {
  const now = new Date().toISOString();
  const nextItem: NoteEntry = {
    id: createId(),
    title: input.title.trim(),
    body: input.body.trim(),
    createdAt: now,
    updatedAt: now,
  };
  const existing = await getNotes();
  const next = [nextItem, ...existing];
  await storageDriver.set(STORAGE_KEYS.notes, next);
  return next;
}

export async function updateNote(
  id: string,
  patch: Partial<Pick<NoteEntry, "title" | "body">>,
): Promise<NoteEntry[]> {
  const existing = await getNotes();
  const now = new Date().toISOString();
  const next = existing.map((entry) => {
    if (entry.id !== id) return entry;
    return {
      ...entry,
      title: typeof patch.title === "string" ? patch.title.trim() : entry.title,
      body: typeof patch.body === "string" ? patch.body.trim() : entry.body,
      updatedAt: now,
    };
  });
  await storageDriver.set(STORAGE_KEYS.notes, next);
  return next;
}

export async function removeNote(id: string): Promise<NoteEntry[]> {
  const existing = await getNotes();
  const next = existing.filter((entry) => entry.id !== id);
  await storageDriver.set(STORAGE_KEYS.notes, next);
  return next;
}
