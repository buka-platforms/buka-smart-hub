import type { TVChannel } from "@/data/type";

type YoutubeLiveTvCollectionResponse = {
  status?: number;
  data?: {
    data?: TVChannel[];
    current_page?: number;
    next_page_url?: string | null;
    total?: number;
    per_page?: number;
  };
};

type YoutubeLiveTvSingleResponse = {
  status?: number;
  data?: TVChannel;
  message?: string;
};

type YoutubeLiveTvFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export type YoutubeLiveTvQuery = {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
};

export type YoutubeLiveTvCollectionPage = {
  data: TVChannel[];
  currentPage: number;
  nextPageUrl: string | null;
  total: number;
  perPage: number;
};

export type YoutubeLiveTvFilterOptions = {
  countries: string[];
  categories: string[];
};

const getYoutubeLiveTvApiBaseUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL_V1 is not configured.");
  }

  return apiBaseUrl.replace(/\/+$/, "");
};

const buildYoutubeLiveTvUrl = (
  path: string,
  query?: Record<string, string | number | undefined | null>,
) => {
  const url = new URL(`${getYoutubeLiveTvApiBaseUrl()}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

export const buildYoutubeLiveTvCollectionUrl = (query?: YoutubeLiveTvQuery) =>
  buildYoutubeLiveTvUrl("/api/youtube-live-tvs", query);

export const buildYoutubeLiveTvFiltersUrl = () =>
  buildYoutubeLiveTvUrl("/api/youtube-live-tv-filters");

export const buildYoutubeLiveTvDetailUrl = (query: {
  slug?: string;
  id?: string;
}) => buildYoutubeLiveTvUrl("/api/youtube-live-tv", query);

export const fetchYoutubeLiveTvChannelsFromUrl = async (
  url: string,
): Promise<TVChannel[]> => {
  const collection = await fetchYoutubeLiveTvCollectionFromUrl(url);
  return collection.data;
};

export const fetchYoutubeLiveTvCollectionFromUrl = async (
  url: string,
): Promise<YoutubeLiveTvCollectionPage> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube Live TV channels: ${response.status}`,
    );
  }

  const payload = (await response.json()) as
    | YoutubeLiveTvCollectionResponse
    | undefined;

  return {
    data: payload?.data?.data ?? [],
    currentPage: payload?.data?.current_page ?? 1,
    nextPageUrl: payload?.data?.next_page_url ?? null,
    total: payload?.data?.total ?? 0,
    perPage: payload?.data?.per_page ?? 0,
  };
};

export const fetchYoutubeLiveTvChannels = async (
  query?: YoutubeLiveTvQuery,
  init?: YoutubeLiveTvFetchInit,
): Promise<TVChannel[]> => {
  const collection = await fetchYoutubeLiveTvCollection(query, init);
  return collection.data;
};

export const fetchYoutubeLiveTvCollection = async (
  query?: YoutubeLiveTvQuery,
  init?: YoutubeLiveTvFetchInit,
): Promise<YoutubeLiveTvCollectionPage> => {
  const response = await fetch(buildYoutubeLiveTvCollectionUrl(query), {
    cache: init?.cache ?? "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube Live TV channels: ${response.status}`,
    );
  }

  const payload = (await response.json()) as
    | YoutubeLiveTvCollectionResponse
    | undefined;

  return {
    data: payload?.data?.data ?? [],
    currentPage: payload?.data?.current_page ?? 1,
    nextPageUrl: payload?.data?.next_page_url ?? null,
    total: payload?.data?.total ?? 0,
    perPage: payload?.data?.per_page ?? 0,
  };
};

export const fetchYoutubeLiveTvChannel = async (
  query: {
    slug?: string;
    id?: string;
  },
  init?: YoutubeLiveTvFetchInit,
): Promise<TVChannel | null> => {
  const response = await fetch(buildYoutubeLiveTvDetailUrl(query), {
    cache: init?.cache ?? "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube Live TV channel: ${response.status}`,
    );
  }

  const payload = (await response.json()) as YoutubeLiveTvSingleResponse;
  return payload?.data ?? null;
};

export const fetchYoutubeLiveTvFilterOptions =
  async (): Promise<YoutubeLiveTvFilterOptions> => {
    const response = await fetch(buildYoutubeLiveTvFiltersUrl(), {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch YouTube Live TV filter options: ${response.status}`,
      );
    }

    const payload = (await response.json()) as
      | {
          data?: YoutubeLiveTvFilterOptions;
        }
      | undefined;

    return {
      countries: payload?.data?.countries ?? [],
      categories: payload?.data?.categories ?? [],
    };
  };

export const groupTvChannelsByCategory = (channels: TVChannel[]) => {
  const grouped = channels.reduce(
    (accumulator, channel) => {
      const category = channel.category || "Other";
      if (!accumulator[category]) {
        accumulator[category] = [];
      }

      accumulator[category].push(channel);
      return accumulator;
    },
    {} as Record<string, TVChannel[]>,
  );

  for (const category of Object.keys(grouped)) {
    grouped[category].sort((a, b) => a.name.localeCompare(b.name));
  }

  return Object.keys(grouped)
    .sort()
    .reduce(
      (accumulator, category) => {
        accumulator[category] = grouped[category];
        return accumulator;
      },
      {} as Record<string, TVChannel[]>,
    );
};
