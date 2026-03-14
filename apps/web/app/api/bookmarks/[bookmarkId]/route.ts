import { proxyBookmarksRequest } from "../_shared";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ bookmarkId: string }> },
) {
  const { bookmarkId } = await context.params;

  return proxyBookmarksRequest({
    method: "DELETE",
    path: `/api/bookmarks/${encodeURIComponent(bookmarkId)}`,
  });
}
