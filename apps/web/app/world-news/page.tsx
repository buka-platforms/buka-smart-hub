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
  const allNewsChannels = tv
    .filter(
      (channel) => channel.source === "YouTube" && channel.category === "News",
    )
    .map((channel) => ({
      id: channel.id,
      slug: channel.slug,
      name: channel.name,
      country: channel.country,
      source_id: channel.source_id,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const embedOrigin = process.env.NEXT_PUBLIC_BASE_URL || "";

  return (
    <div className="relative z-0 min-h-screen w-full bg-background">
      <WorldNewsGrid
        allChannels={allNewsChannels}
        defaultChannelIds={DEFAULT_WORLD_NEWS_CHANNEL_IDS}
        embedOrigin={embedOrigin}
      />
    </div>
  );
}
