export interface BookmarkEntry {
  id: string;
  title: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

class BookmarksApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const normalizeBookmark = (value: unknown): BookmarkEntry | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.id === "number"
        ? String(raw.id)
        : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  const url =
    typeof raw.url === "string"
      ? raw.url
      : typeof raw.link === "string"
        ? raw.link
        : null;
  const createdAt =
    typeof raw.created_at === "string"
      ? raw.created_at
      : typeof raw.createdAt === "string"
        ? raw.createdAt
        : null;
  const updatedAt =
    typeof raw.updated_at === "string"
      ? raw.updated_at
      : typeof raw.updatedAt === "string"
        ? raw.updatedAt
        : null;

  if (!id || !title || !url || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    url,
    createdAt,
    updatedAt,
  };
};

const parseResponse = async <T>(response: Response): Promise<T> => {
  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof (payload as Record<string, unknown>).message === "string"
        ? ((payload as Record<string, unknown>).message as string)
        : "Failed to sync bookmarks.";
    throw new BookmarksApiError(message, response.status);
  }

  return payload as T;
};

export async function listBookmarks(): Promise<BookmarkEntry[]> {
  const response = await fetch("/api/bookmarks", {
    method: "GET",
    cache: "no-store",
  });
  const payload = await parseResponse<{ data?: unknown }>(response);
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return rows
    .map((row) => normalizeBookmark(row))
    .filter((row): row is BookmarkEntry => row !== null);
}

export async function createBookmark(input: {
  title: string;
  url: string;
}): Promise<BookmarkEntry> {
  const response = await fetch("/api/bookmarks", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      url: input.url,
    }),
  });
  const payload = await parseResponse<{ data?: unknown }>(response);
  const bookmark = normalizeBookmark(payload?.data);
  if (!bookmark) {
    throw new BookmarksApiError("Unexpected bookmarks response.", 500);
  }

  return bookmark;
}

export async function deleteBookmark(id: string): Promise<void> {
  const response = await fetch(`/api/bookmarks/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });

  await parseResponse(response);
}

export const isBookmarksUnauthorizedError = (error: unknown): boolean => {
  return error instanceof BookmarksApiError && error.status === 401;
};
