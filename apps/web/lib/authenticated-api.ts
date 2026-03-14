export const buildAuthenticatedApiUrl = (path: string) => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL_V1 is not configured.");
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}${path}`;
};

export const fetchAuthenticatedApi = async (
  path: string,
  init?: RequestInit,
) => {
  return fetch(buildAuthenticatedApiUrl(path), {
    ...init,
    credentials: "include",
    cache: "no-store",
  });
};
