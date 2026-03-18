import { tv } from "@/data/youtube_live_tv";
import type { Metadata } from "next";
import WorldNewsGrid from "./WorldNewsGrid";

export const metadata: Metadata = {
  referrer: "strict-origin-when-cross-origin",
};

const DEFAULT_WORLD_NEWS_CHANNEL_IDS = [
  "aljazeera",
  "skynews",
  "trtworld",
  "dw",
  "wion",
  "abc_news_us",
  "cgtn_europe",
  "euronews",
];

export default async function WorldNewsPage() {
  const newsChannelsById = new Map(
    tv
      .filter(
        (channel) =>
          channel.source === "YouTube" && channel.category === "News",
      )
      .map((channel) => [
        channel.id,
        {
          id: channel.id,
          slug: channel.slug,
          name: channel.name,
          country: channel.country,
          source_id: channel.source_id,
        },
      ]),
  );

  const availableChannels = DEFAULT_WORLD_NEWS_CHANNEL_IDS.flatMap((id) => {
    const channel = newsChannelsById.get(id);
    return channel ? [channel] : [];
  });

  const embedOrigin = process.env.NEXT_PUBLIC_BASE_URL || "";

  return (
    <div className="relative z-0 min-h-screen w-full bg-black">
      <WorldNewsGrid channels={availableChannels} embedOrigin={embedOrigin} />
    </div>
  );
}
