import { tv } from "@/data/tv";
import { createDirectus, readItems, rest, staticToken } from "@directus/sdk";
import { MetadataRoute } from "next";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Get all tv stations that doesn't have an external property
  const tvChannels = tv.filter((channel) => !channel.external);

  const sitemapTvStationRoutes = tvChannels.map((channel) => ({
    url: `${process.env.NEXT_PUBLIC_BASE_URL}/tv/${channel.slug}`,
    lastModified: new Date(),
    changeFrequency: "daily",
    priority: 1,
  }));

  // Create a new Directus client
  const client = createDirectus(process.env.SECRET_DIRECTUS_BASE_URL as string)
    .with(staticToken(process.env.SECRET_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get all radio stations, by page, starting from page 1 until the last page (when results is empty)
  const allRadioStations = [];
  let currentPage = 1;
  let radioStations;

  do {
    radioStations = await client.request(
      readItems("radio_stations" as any, {
        fields: ["*.*.*"],
        page: currentPage,
      }),
    );

    allRadioStations.push(...radioStations);
    currentPage++;
  } while (radioStations.length > 0);

  const sitemapRadioStationRoutes = allRadioStations.map((station: any) => ({
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
    // {
    //   url: `${process.env.NEXT_PUBLIC_BASE_URL}/apps/news`,
    //   lastModified: new Date(),
    //   changeFrequency: "daily",
    //   priority: 1,
    // },
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
