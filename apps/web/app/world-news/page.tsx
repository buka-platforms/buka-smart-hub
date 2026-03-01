import { tv } from "@/data/youtube_live_tv";
import type { Metadata } from "next";
import WorldNewsGrid from "./WorldNewsGrid";

export const metadata: Metadata = {
  referrer: "strict-origin-when-cross-origin",
};

const CHANNEL_SLUGS = [
  "aljazeera",
  "france24",
  "bbc-news",
  "skynews",
  "wion",
  "cgtn-europe",
  "dw",
  "trtworld",
];

export default async function WorldNewsPage() {
  const channels = CHANNEL_SLUGS.flatMap((slug) => {
    const channel = tv.find((t) => t.slug === slug);
    return channel ? [channel] : [];
  }).map((channel) => ({
    id: channel.id,
    name: channel.name,
    source_id: channel.source_id,
  }));

  const embedOrigin = process.env.NEXT_PUBLIC_BASE_URL || "";

  return <WorldNewsGrid channels={channels} embedOrigin={embedOrigin} />;
}
