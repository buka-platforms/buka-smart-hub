import { tv } from "@/data/youtube_live_tv";
import type { Metadata } from "next";
import WorldNewsGrid from "./WorldNewsGrid";

export const metadata: Metadata = {
  referrer: "strict-origin-when-cross-origin",
};

export default async function WorldNewsPage() {
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

  const embedOrigin = process.env.NEXT_PUBLIC_BASE_URL || "";

  return (
    <div className="relative z-0 min-h-screen w-full bg-black">
      <WorldNewsGrid channels={availableChannels} embedOrigin={embedOrigin} />
    </div>
  );
}
