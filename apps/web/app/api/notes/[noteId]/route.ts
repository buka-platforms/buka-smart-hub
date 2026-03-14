import { proxyNotesRequest } from "../_shared";

export async function PUT(
  request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  const { noteId } = await context.params;

  let body: unknown = undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  return proxyNotesRequest({
    method: "PUT",
    path: `/api/notes/${encodeURIComponent(noteId)}`,
    body,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ noteId: string }> },
) {
  const { noteId } = await context.params;

  return proxyNotesRequest({
    method: "DELETE",
    path: `/api/notes/${encodeURIComponent(noteId)}`,
  });
}
