import {
  ExternalTvLink,
  InternalTvLink,
} from "@/app/(layout_one)/apps/tv/links";
import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { tv } from "@/data/tv";
import type { Metadata } from "next";
import Link from "next/link";

const moduleName = `TV`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Watch to many great TV stations around the world. News, education or entertainment.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/tv`;

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

export default async function TvPage() {
  const categorizedTvs = tv.reduce((groups, item) => {
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

  /* eslint-disable @next/next/no-img-element */
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
      <div className="mt-9 w-full">
        <main className="mt-7 flex flex-col flex-wrap gap-3 md:flex-row md:gap-5 md:px-0">
          {Object.entries(sortedCategorizedTvs).map(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            ([category, apps]: [any, any]) => (
              <section key={category} className="flex w-full flex-col">
                <h2 className="py-2 text-lg font-medium">{category}</h2>
                <div className="flex w-full flex-col flex-wrap gap-3 md:flex-row md:gap-5">
                  {apps.map(
                    (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      app: any,
                    ) =>
                      !app.external === true ? (
                        <InternalTvLink app={app} key={app.id} />
                      ) : app.external === true ? (
                        <ExternalTvLink app={app} key={app.id} />
                      ) : null,
                  )}
                </div>
              </section>
            ),
          )}
        </main>
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_tv.svg"
          alt="TV"
          className="h-50 w-50 md:h-87.5 md:w-87.5"
        />
      </div>
    </>
  );
}
