import { fetchAuthenticatedApi } from "./authenticated-api";

export interface NoteEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

class NotesApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

const normalizeNote = (value: unknown): NoteEntry | null => {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;

  const id =
    typeof raw.id === "string"
      ? raw.id
      : typeof raw.id === "number"
        ? String(raw.id)
        : null;
  const title = typeof raw.title === "string" ? raw.title : null;
  const body = typeof raw.body === "string" ? raw.body : null;
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

  if (!id || !title || !body || !createdAt || !updatedAt) {
    return null;
  }

  return {
    id,
    title,
    body,
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
        : "Failed to sync notes.";
    throw new NotesApiError(message, response.status);
  }

  return payload as T;
};

export async function listNotes(): Promise<NoteEntry[]> {
  const response = await fetchAuthenticatedApi("/api/notes", {
    method: "GET",
  });
  const payload = await parseResponse<{ data?: unknown }>(response);
  const rows = Array.isArray(payload?.data) ? payload.data : [];

  return rows
    .map((row) => normalizeNote(row))
    .filter((row): row is NoteEntry => row !== null);
}

export async function createNote(input: {
  title: string;
  body: string;
}): Promise<NoteEntry> {
  const response = await fetchAuthenticatedApi("/api/notes", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
    }),
  });
  const payload = await parseResponse<{ data?: unknown }>(response);
  const note = normalizeNote(payload?.data);
  if (!note) {
    throw new NotesApiError("Unexpected notes response.", 500);
  }

  return note;
}

export async function editNote(input: {
  id: string;
  title: string;
  body: string;
}): Promise<NoteEntry> {
  const response = await fetchAuthenticatedApi(
    `/api/notes/${encodeURIComponent(input.id)}`,
    {
      method: "PUT",
      headers: {
        "content-type": "application/json",
    },
    body: JSON.stringify({
      title: input.title,
      body: input.body,
    }),
    },
  );
  const payload = await parseResponse<{ data?: unknown }>(response);
  const note = normalizeNote(payload?.data);
  if (!note) {
    throw new NotesApiError("Unexpected notes response.", 500);
  }

  return note;
}

export async function deleteNote(id: string): Promise<void> {
  const response = await fetchAuthenticatedApi(
    `/api/notes/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );

  await parseResponse(response);
}

export const isNotesUnauthorizedError = (error: unknown): boolean => {
  return error instanceof NotesApiError && error.status === 401;
};
