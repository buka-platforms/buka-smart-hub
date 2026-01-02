import {
  ExternalTvLink,
  InternalTvLink,
} from "@/app/(layout_one)/apps/tv/links";
import ClientSideOperationOnPage from "@/components/General/ClientSideOperationOnPage";
import RadioPanelFooter from "@/components/General/RadioPanelFooter";
import SignedInHeader from "@/components/General/SignedInHeader";
import { tv } from "@/data/tv";
import type { UserSession } from "@/data/type";
import { getRequestHeaders } from "@/lib/header";
import { checkUserSession } from "@/lib/user";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug;
  const selectedTv = tv.find((tv) => tv.slug === slug);

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

  const selectedTv = tv.find((tv) => tv.slug === slug);
  const tvChannelsExceptSelected = tv.filter((tv) => tv.slug !== slug);

  const categorizedTvs = tvChannelsExceptSelected.reduce((groups, item) => {
    const category = item.category;
    groups[category] = groups[category] || [];
    groups[category].push(item);
    return groups;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }, {} as any);

  // Sort the categorizedTvs object by category
  const sortedCategorizedTvs = Object.keys(categorizedTvs)
    .sort()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .reduce((obj: any, key: any) => {
      obj[key] = categorizedTvs[key];
      return obj;
    }, {});

  return (
    <>
      <div>
        <ClientSideOperationOnPage />
        <SignedInHeader userSession={userSession} />
        <main className="flex items-center justify-center bg-black">
          <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden md:w-[60%]">
            {selectedTv?.source === "YouTube" ? (
              <iframe
                className="absolute top-0 left-0 h-full w-full"
                src={`https://www.youtube-nocookie.com/embed/${selectedTv?.source_id}?modestbranding=1&showinfo=0&autoplay=1&enablejsapi=1&origin=https://buka.sh`}
                title="YouTube video player"
                allowFullScreen
              ></iframe>
            ) : selectedTv?.source === "NHK World" ? (
              <iframe
                className="absolute top-0 left-0 h-full w-full"
                id="nPlayerFrame"
                src="https://www3.nhk.or.jp/nhkworld/common/player/tv/live/embed/embed.html"
                allowFullScreen
                title="NHK World"
              ></iframe>
            ) : selectedTv?.source === "WION" ? (
              <iframe
                className="absolute top-0 left-0 h-full w-full"
                id="vidgyor_iframe"
                src="https://www.wionews.com/videos/live-tv.html?videoId=zee_wion&amp;title=WION&amp;extraParam1=WION&amp;extraParam2=https://www.wionews.com/&amp;taptounmute=0&amp;mute=0&amp;piv=0&amp;pip=0&amp;autoplay=1"
                allowFullScreen
                title="WION"
              ></iframe>
            ) : selectedTv?.source === "RT" ? (
              <iframe
                id="odysee-iframe"
                className="absolute top-0 left-0 h-full w-full"
                src="https://odysee.com/$/embed/@RT?feature=livenow"
                allowFullScreen
                title="RT"
              ></iframe>
            ) : selectedTv?.source === "CNBC Indonesia" ? (
              <iframe
                title="CNBC Indonesia"
                src="https://www.cnbcindonesia.com/embed/tv?smartautoplay=true&amp;comscore=off"
                frameBorder="0"
                allowFullScreen
                className="absolute top-0 left-0 h-full w-full"
              ></iframe>
            ) : selectedTv?.source === "Detik TV" ? (
              <iframe
                src="https://20.detik.com/watch/breakingnews-20d?counterviews=true&amp;counterviews_title=false"
                scrolling="no"
                frameBorder="0"
                allowFullScreen={true}
                title="Detik TV"
                className="absolute top-0 left-0 h-full w-full"
              >
                This browser does not support iframe.
              </iframe>
            ) : null}
          </div>
        </main>
        <div className="container mx-auto mt-3">
          <div className="text-sm text-muted-foreground">
            <Link href="/apps" className="underline">
              Apps
            </Link>{" "}
            /{" "}
            <Link href="/apps/tv" className="underline">
              TV
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
            {Object.entries(sortedCategorizedTvs).map(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ([category, apps]: [any, any]) => (
                <section key={category} className="flex w-full flex-col">
                  <h3 className="py-2 text-lg font-medium">{category}</h3>
                  <div className="flex w-full flex-col flex-wrap gap-3 md:flex-row md:gap-5">
                    {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      apps.map((app: any) =>
                        !app.external === true ? (
                          <InternalTvLink app={app} key={app.id} />
                        ) : app.external === true ? (
                          <ExternalTvLink app={app} key={app.id} />
                        ) : null,
                      )
                    }
                  </div>
                </section>
              ),
            )}
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
        <RadioPanelFooter />
      </div>
    </>
  );
}
