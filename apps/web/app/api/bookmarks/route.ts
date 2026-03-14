import { proxyBookmarksRequest } from "./_shared";

export async function GET() {
  return proxyBookmarksRequest({
    method: "GET",
    path: "/api/bookmarks",
  });
}

export async function POST(request: Request) {
  let body: unknown = undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  return proxyBookmarksRequest({
    method: "POST",
    path: "/api/bookmarks",
    body,
  });
}
