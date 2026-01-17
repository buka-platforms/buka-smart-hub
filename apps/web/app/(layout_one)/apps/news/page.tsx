import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { createDirectus, readItems, rest, staticToken } from "@directus/sdk";
import type { Metadata } from "next";
import Link from "next/link";
import NewsList from "./NewsList";

const moduleName = `News & Stories`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Read the latest news and stories from around the world.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/news`;

export const metadata: Metadata = {
  metadataBase: new URL(`${process.env.NEXT_PUBLIC_BASE_URL}`),
  title: `${pageTitle}`,
  description: `${pageDescription}`,
  openGraph: {
    url: `${pageUrl}`,
    type: "website",
    title: `${pageTitle}`,
    description: `${pageDescription}`,
    images: [
      {
        url: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
        width: 1200,
        height: 630,
        alt: `${process.env.NEXT_PUBLIC_APP_TITLE}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    images: `${process.env.NEXT_PUBLIC_SOCIAL_MEDIA_IMAGE_1}`,
    title: `${pageTitle}`,
    description: `${pageDescription}`,
    creator: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
    site: `@${process.env.NEXT_PUBLIC_X_HANDLE}`,
  },
};

const getNewsStories = async () => {
  // Create a new Directus client
  const client = createDirectus(process.env.SECRET_DIRECTUS_BASE_URL as string)
    .with(staticToken(process.env.SECRET_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get all news stories
  const newsStories = (await client.request(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readItems("news" as any, {
      fields: ["*"],
      sort: ["-published_datetime"],
      page: 1,
      limit: 25,
    }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  )) as any;

  return newsStories;
};

/* eslint-disable @next/next/no-img-element */
export default async function NewsPage() {
  const newsStories = await getNewsStories();

  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
        <Link href="/apps" className="underline">
          Apps
        </Link>{" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      {/* <div className="mt-9 flex w-full flex-col"> */}
      <div className="mt-9 w-full">
        <NewsList newsStories={newsStories} page={1} />
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_news_and_stories.svg"
          alt="News & Stories"
          className="h-50 w-50 md:h-87.5 md:w-87.5"
        />
      </div>
    </>
  );
}
