import type { IPTVChannel } from "@/data/type";

type IptvCollectionResponse = {
  status?: number;
  data?: {
    data?: IPTVChannel[];
    current_page?: number;
    next_page_url?: string | null;
    total?: number;
    per_page?: number;
  };
};

type IptvSingleResponse = {
  status?: number;
  data?: IPTVChannel;
  message?: string;
};

export type IptvQuery = {
  q?: string;
  page?: number;
  limit?: number;
  category?: string;
  country?: string;
  language?: string;
};

export type IptvCollectionPage = {
  data: IPTVChannel[];
  currentPage: number;
  nextPageUrl: string | null;
  total: number;
  perPage: number;
};

export type IptvFilterOptions = {
  countries: string[];
  categories: string[];
  languages: string[];
};

const normalizeIptvChannel = (channel: IPTVChannel): IPTVChannel => ({
  ...channel,
  id: Number(channel.id),
  slug: channel.slug.replaceAll("_", "-"),
});

const getIptvApiBaseUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    throw new Error("NEXT_PUBLIC_API_URL_V1 is not configured.");
  }

  return apiBaseUrl.replace(/\/+$/, "");
};

const buildIptvUrl = (
  path: string,
  query?: Record<string, string | number | undefined | null>,
) => {
  const url = new URL(`${getIptvApiBaseUrl()}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
};

export const buildIptvCollectionUrl = (query?: IptvQuery) =>
  buildIptvUrl("/api/iptvs", query);

export const buildIptvFiltersUrl = () => buildIptvUrl("/api/iptv-filters");

export const buildIptvDetailUrl = (query: {
  slug?: string;
  id?: number | string;
}) => buildIptvUrl("/api/iptv", query);

export const fetchIptvChannelsFromUrl = async (
  url: string,
): Promise<IPTVChannel[]> => {
  const collection = await fetchIptvCollectionFromUrl(url);
  return collection.data;
};

export const fetchIptvCollectionFromUrl = async (
  url: string,
): Promise<IptvCollectionPage> => {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch IPTV channels: ${response.status}`);
  }

  const payload = (await response.json()) as IptvCollectionResponse | undefined;

  return {
    data: (payload?.data?.data ?? []).map(normalizeIptvChannel),
    currentPage: payload?.data?.current_page ?? 1,
    nextPageUrl: payload?.data?.next_page_url ?? null,
    total: payload?.data?.total ?? 0,
    perPage: payload?.data?.per_page ?? 0,
  };
};

export const fetchIptvCollection = async (
  query?: IptvQuery,
): Promise<IptvCollectionPage> =>
  fetchIptvCollectionFromUrl(buildIptvCollectionUrl(query));

export const fetchIptvChannel = async (query: {
  slug?: string;
  id?: number | string;
}): Promise<IPTVChannel | null> => {
  const response = await fetch(buildIptvDetailUrl(query), {
    cache: "force-cache",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch IPTV channel: ${response.status}`);
  }

  const payload = (await response.json()) as IptvSingleResponse;
  return payload?.data ? normalizeIptvChannel(payload.data) : null;
};

export const fetchIptvFilterOptions = async (): Promise<IptvFilterOptions> => {
  const response = await fetch(buildIptvFiltersUrl(), {
    cache: "force-cache",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch IPTV filter options: ${response.status}`);
  }

  const payload = (await response.json()) as
    | {
        data?: IptvFilterOptions;
      }
    | undefined;

  return {
    countries: payload?.data?.countries ?? [],
    categories: payload?.data?.categories ?? [],
    languages: payload?.data?.languages ?? [],
  };
};

export const groupIptvChannelsByCategory = (channels: IPTVChannel[]) => {
  const grouped = channels.reduce(
    (accumulator, channel) => {
      const category = channel.category || "Other";
      if (!accumulator[category]) {
        accumulator[category] = [];
      }

      accumulator[category].push(channel);
      return accumulator;
    },
    {} as Record<string, IPTVChannel[]>,
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
      {} as Record<string, IPTVChannel[]>,
    );
};
