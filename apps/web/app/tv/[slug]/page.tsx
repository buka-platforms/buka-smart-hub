import {
  ExternalTvLink,
  InternalTvLink,
} from "@/app/(layout_one)/apps/youtube-live-tv/links";
import ClientSideOperationOnPage from "@/components/General/ClientSideOperationOnPage";
import SignedInHeader from "@/components/General/SignedInHeader";
import YouTubeIframePlayer from "@/components/General/YouTubeIframePlayer";
import type { UserSession } from "@/data/type";
import { getRequestHeaders } from "@/lib/header";
import { checkUserSession } from "@/lib/user";
import {
  fetchYoutubeLiveTvChannel,
  fetchYoutubeLiveTvChannels,
  groupTvChannelsByCategory,
} from "@/lib/youtube-live-tv-api";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const selectedTv = await fetchYoutubeLiveTvChannel({ slug });

  // If the selectedTv is not found, return not found
  if (!selectedTv) {
    return notFound();
  }

  return {
    metadataBase: new URL(`${process.env.NEXT_PUBLIC_BASE_URL}`),
    title: `${selectedTv?.name} from ${selectedTv?.country} - TV - ${process.env.NEXT_PUBLIC_APP_TITLE}`,
    description: `Watch ${selectedTv?.name} from ${selectedTv?.country}.`,
    openGraph: {
      url: `${process.env.NEXT_PUBLIC_BASE_URL}/tv/${selectedTv?.slug}`,
      type: "website",
      title: `${selectedTv?.name} - TV - ${process.env.NEXT_PUBLIC_APP_TITLE}`,
      description: `Watch ${selectedTv?.name} from ${selectedTv?.country}.`,
      images: [
        {
          url: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
          width: 1200,
          height: 630,
          alt: "Buka",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
      title: `${selectedTv?.name} - TV - ${process.env.NEXT_PUBLIC_APP_TITLE}`,
      description: `Watch ${selectedTv?.name} from ${selectedTv?.country}.`,
      creator: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
      site: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
    },
  };
}

/* eslint-disable @next/next/no-img-element */
export default async function TvDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const userSession: UserSession | null = await checkUserSession();
  const requestHeaders = await getRequestHeaders();

  if (process.env.NEXT_PUBLIC_HOSTNAME === "localhost") {
    // Set the IP country for localhost as Indonesia
    // requestHeaders["cf-ipcountry"] = "ID";
    requestHeaders["x-vercel-ip-country"] = "ID";
  }

  const slug = (await params).slug;

  const [selectedTv, allChannels] = await Promise.all([
    fetchYoutubeLiveTvChannel({ slug }),
    fetchYoutubeLiveTvChannels(),
  ]);

  if (!selectedTv) {
    return notFound();
  }

  const tvChannelsExceptSelected = allChannels.filter((tv) => tv.slug !== slug);
  const sortedCategorizedTvs = groupTvChannelsByCategory(
    tvChannelsExceptSelected,
  );

  return (
    <>
      <div>
        <ClientSideOperationOnPage />
        <SignedInHeader userSession={userSession} />
        <main className="flex items-center justify-center bg-black">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden md:w-[60%]">
            <YouTubeIframePlayer
              videoId={selectedTv?.source_id ?? ""}
              title={selectedTv?.name ?? "YouTube video player"}
              autoplay
              className="absolute top-0 left-0 h-full w-full"
            />
          </div>
        </main>
        <div className="container mx-auto mt-3">
          <div className="text-sm text-muted-foreground">
            <Link href="/apps" className="underline">
              Apps
            </Link>{" "}
            /{" "}
            <Link href="/apps/youtube-live-tv" className="underline">
              YouTube Live TV
            </Link>{" "}
            / {selectedTv?.name}
          </div>
        </div>
        <div className="container mx-auto mt-3">
          <h1 className="text-xl font-medium tracking-tighter md:text-2xl">
            {selectedTv?.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedTv?.long_description}
          </p>
          <h2 className="mt-12 self-start text-lg font-medium">TV Channels</h2>
          <section className="mt-7 flex flex-col flex-wrap gap-3 md:flex-row md:gap-5 md:px-0">
            {Object.entries(sortedCategorizedTvs).map(([category, apps]) => (
              <section key={category} className="flex w-full flex-col">
                <h3 className="py-2 text-lg font-medium">{category}</h3>
                <div className="flex w-full flex-col flex-wrap gap-3 md:flex-row md:gap-5">
                  {apps.map((app) =>
                    !app.external === true ? (
                      <InternalTvLink app={app} key={app.id} />
                    ) : app.external === true ? (
                      <ExternalTvLink app={app} key={app.id} />
                    ) : null,
                  )}
                </div>
              </section>
            ))}
          </section>
        </div>
        <div className="mt-11 flex w-full justify-center">
          <img
            src="/assets/images/illustration_tv.svg"
            alt="TV"
            className="h-50 w-50 md:h-87.5 md:w-87.5"
          />
        </div>
        <div className="h-64"></div>
      </div>
    </>
  );
}
