import RequestHeadersProvider from "@/components/General/RequestHeadersProvider";
import RandomBackgroundImage from "@/components/Home/BackgroundImageContainer";
import { tv } from "@/data/youtube_live_tv";
import { getRequestHeaders } from "@/lib/header";
import type { Metadata } from "next";
import WorldNewsGrid from "./WorldNewsGrid";

export const metadata: Metadata = {
  referrer: "strict-origin-when-cross-origin",
};

const DEFAULT_CHANNEL_SLUGS = [
  "aljazeera",
  "france24",
  "fox-news",
  "skynews",
  "wion",
  "cgtn-europe",
  "dw",
  "trtworld",
];

export default async function WorldNewsPage() {
  const requestHeaders = await getRequestHeaders();

  // Keep localhost behavior aligned with homepage background geolocation fallback.
  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    requestHeaders["x-vercel-ip-latitude"] =
      process.env.NEXT_PUBLIC_LOCALHOST_LATITUDE || "-6.2114";
    requestHeaders["x-vercel-ip-longitude"] =
      process.env.NEXT_PUBLIC_LOCALHOST_LONGITUDE || "106.8451";
    requestHeaders["x-vercel-ip-country"] =
      process.env.NEXT_PUBLIC_LOCALHOST_COUNTRY || "ID";
  }

  const availableChannels = tv
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

  const defaultChannels = DEFAULT_CHANNEL_SLUGS.flatMap((slug) => {
    const channel = tv.find((t) => t.slug === slug);
    return channel ? [channel] : [];
  }).map((channel) => ({
    id: channel.id,
    slug: channel.slug,
    name: channel.name,
    country: channel.country,
    source_id: channel.source_id,
  }));

  const embedOrigin = process.env.NEXT_PUBLIC_BASE_URL || "";

  return (
    <>
      <RequestHeadersProvider requestHeaders={requestHeaders} />
      <RandomBackgroundImage />
      <div className="relative z-0 min-h-screen w-full">
        <WorldNewsGrid
          channels={availableChannels}
          defaultChannels={defaultChannels}
          embedOrigin={embedOrigin}
        />
      </div>
    </>
  );
}
