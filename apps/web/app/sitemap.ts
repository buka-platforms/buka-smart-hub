import { tv } from "@/data/youtube_live_tv";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all tv stations that don't have an 'external' property (assume missing means false)
  const tvChannels = tv.filter(
    (channel) => !("external" in channel && channel.external),
  );

  const sitemapTvStationRoutes = tvChannels.map((channel) => ({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/tv/${channel.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  }));

  // Get all radio stations from API, page by page.
  const allRadioStations: import("@/data/type").RadioStation[] = [];
  let currentPage = 1;
  let hasNextPage = true;

  while (hasNextPage) {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL_V1}/api/radio-stations?page=${currentPage}`,
      {
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      break;
    }

    const payload = (await response.json()) as {
      data?: {
        data?: import("@/data/type").RadioStation[];
        next_page_url?: string | null;
      };
    };

    const radioStations = payload?.data?.data ?? [];
    allRadioStations.push(...radioStations);
    hasNextPage = Boolean(payload?.data?.next_page_url);
    currentPage++;
  }

  const sitemapRadioStationRoutes = allRadioStations.map((station) => ({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/radio/${station.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  }));

  // Define static routes
  const sitemapStaticRoutes = [
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/login`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/my-location`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // {
    //   url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/live-currency-rates`,
    //   lastModified: new Date(),
    //   changeFrequency: "daily",
    //   priority: 1,
    // },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/currency-converter`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/weather`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/market-chart`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/tv`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/radio`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/music-preview`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/book-preview`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    // {
    //   url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/movie-preview`,
    //   lastModified: new Date(),
    //   changeFrequency: "daily",
    //   priority: 1,
    // },
    {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/public-holidays`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
  ];

  // Combine the all sitemap routes
  return [
    ...sitemapStaticRoutes,
    ...sitemapTvStationRoutes,
    ...sitemapRadioStationRoutes,
  ] as MetadataRoute.Sitemap;
}
