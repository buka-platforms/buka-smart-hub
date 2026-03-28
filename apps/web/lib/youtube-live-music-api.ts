import type { TVChannel } from "@/data/type";

type YoutubeLiveMusicCollectionResponse = {
  status?: number;
  data?: {
    data?: TVChannel[];
    current_page?: number;
    next_page_url?: string | null;
    total?: number;
    per_page?: number;
  };
};

type YoutubeLiveMusicSingleResponse = {
  status?: number;
  data?: TVChannel;
  message?: string;
};

type YoutubeLiveMusicFetchInit = RequestInit & {
  next?: {
    revalidate?: number;
  };
};

export type YoutubeLiveMusicQuery = {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
};

export type YoutubeLiveMusicCollectionPage = {
  data: TVChannel[];
  currentPage: number;
  nextPageUrl: string | null;
  total: number;
  perPage: number;
};

export type YoutubeLiveMusicFilterOptions = {
  countries: string[];
  categories: string[];
};

const getYoutubeLiveMusicApiBaseUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL_V1 is not configured.");
  }

  return apiBaseUrl.replace(/\/+$/, "");
};

const buildYoutubeLiveMusicUrl = (
  path: string,
  query?: Record<string, string | number | undefined | null>,
) => {
  const url = new URL(`${getYoutubeLiveMusicApiBaseUrl()}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

export const buildYoutubeLiveMusicCollectionUrl = (
  query?: YoutubeLiveMusicQuery,
) => buildYoutubeLiveMusicUrl("/api/youtube-live-musics", query);

export const buildYoutubeLiveMusicFiltersUrl = () =>
  buildYoutubeLiveMusicUrl("/api/youtube-live-music-filters");

export const buildYoutubeLiveMusicDetailUrl = (query: {
  slug?: string;
  id?: string;
}) => buildYoutubeLiveMusicUrl("/api/youtube-live-music", query);

export const fetchYoutubeLiveMusicChannelsFromUrl = async (
  url: string,
): Promise<TVChannel[]> => {
  const collection = await fetchYoutubeLiveMusicCollectionFromUrl(url);
  return collection.data;
};

export const fetchYoutubeLiveMusicCollectionFromUrl = async (
  url: string,
): Promise<YoutubeLiveMusicCollectionPage> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube Live Music channels: ${response.status}`,
    );
  }

  const payload = (await response.json()) as
    | YoutubeLiveMusicCollectionResponse
    | undefined;

  return {
    data: payload?.data?.data ?? [],
    currentPage: payload?.data?.current_page ?? 1,
    nextPageUrl: payload?.data?.next_page_url ?? null,
    total: payload?.data?.total ?? 0,
    perPage: payload?.data?.per_page ?? 0,
  };
};

export const fetchYoutubeLiveMusicChannels = async (
  query?: YoutubeLiveMusicQuery,
  init?: YoutubeLiveMusicFetchInit,
): Promise<TVChannel[]> => {
  const collection = await fetchYoutubeLiveMusicCollection(query, init);
  return collection.data;
};

export const fetchYoutubeLiveMusicCollection = async (
  query?: YoutubeLiveMusicQuery,
  init?: YoutubeLiveMusicFetchInit,
): Promise<YoutubeLiveMusicCollectionPage> => {
  const response = await fetch(buildYoutubeLiveMusicCollectionUrl(query), {
    cache: "force-cache",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch YouTube Live Music channels: ${response.status}`,
    );
  }

  const payload = (await response.json()) as
    | YoutubeLiveMusicCollectionResponse
    | undefined;

  return {
    data: payload?.data?.data ?? [],
    currentPage: payload?.data?.current_page ?? 1,
    nextPageUrl: payload?.data?.next_page_url ?? null,
    total: payload?.data?.total ?? 0,
    perPage: payload?.data?.per_page ?? 0,
  };
};

export const fetchYoutubeLiveMusicChannel = async (
  query: {
    slug?: string;
    id?: string;
  },
  init?: YoutubeLiveMusicFetchInit,
): Promise<TVChannel | null> => {
  const response = await fetch(buildYoutubeLiveMusicDetailUrl(query), {
    cache: "force-cache",
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
      `Failed to fetch YouTube Live Music channel: ${response.status}`,
    );
  }

  const payload = (await response.json()) as YoutubeLiveMusicSingleResponse;
  return payload?.data ?? null;
};

export const fetchYoutubeLiveMusicFilterOptions =
  async (): Promise<YoutubeLiveMusicFilterOptions> => {
    const response = await fetch(buildYoutubeLiveMusicFiltersUrl(), {
      cache: "force-cache",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Failed to fetch YouTube Live Music filter options: ${response.status}`,
      );
    }

    const payload = (await response.json()) as
      | {
          data?: YoutubeLiveMusicFilterOptions;
        }
      | undefined;

    return {
      countries: payload?.data?.countries ?? [],
      categories: payload?.data?.categories ?? [],
    };
  };

export const groupYoutubeLiveMusicChannelsByCategory = (channels: TVChannel[]) => {
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
