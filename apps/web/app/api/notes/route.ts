import { proxyNotesRequest } from "./_shared";

export async function GET() {
  return proxyNotesRequest({
    method: "GET",
    path: "/api/notes",
  });
}

export async function POST(request: Request) {
  let body: unknown = undefined;
  try {
    body = await request.json();
  } catch {
    body = undefined;
  }

  return proxyNotesRequest({
    method: "POST",
    path: "/api/notes",
    body,
  });
}
