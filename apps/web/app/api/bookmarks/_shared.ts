import { cookies } from "next/headers";

const buildBackendUrl = (path: string): string | null => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}${path}`;
};

const buildOriginHeader = (): string => {
  return process.env.NEXT_PUBLIC_BASE_URL || "https://buka.sh";
};

export const readSessionHeaders = async (): Promise<Record<
  string,
  string
> | null> => {
  const cookieStore = await cookies();
  const userId = cookieStore.get("_b_uid")?.value;
  const deviceId = cookieStore.get("_b_did")?.value;
  const sessionToken = cookieStore.get("_b_ust")?.value;

  if (!userId || !deviceId || !sessionToken) {
    return null;
  }

  return {
    "X-User-Id": userId,
    "X-Device-Id": deviceId,
    "X-Session-Token": sessionToken,
  };
};

export const proxyBookmarksRequest = async ({
  method,
  path,
  body,
}: {
  method: "GET" | "POST" | "DELETE";
  path: string;
  body?: unknown;
}): Promise<Response> => {
  const endpoint = buildBackendUrl(path);
  if (!endpoint) {
    return Response.json(
      {
        status: 1,
        message: "API URL is not configured.",
      },
      { status: 500 },
    );
  }

  const authHeaders = await readSessionHeaders();
  if (!authHeaders) {
    return Response.json(
      {
        status: 1,
        message: "Unauthorized.",
      },
      { status: 401 },
    );
  }

  const headers: Record<string, string> = {
    ...authHeaders,
    Origin: buildOriginHeader(),
  };
  if (body !== undefined) {
    headers["content-type"] = "application/json";
  }

  try {
    const upstream = await fetch(endpoint, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: "no-store",
    });
    const text = await upstream.text();

    return new Response(text, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
      },
    });
  } catch {
    return Response.json(
      {
        status: 1,
        message: "Failed to reach bookmarks service.",
      },
      { status: 502 },
    );
  }
};
