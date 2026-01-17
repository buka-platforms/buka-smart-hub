import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";
import Link from "next/link";

const moduleName = `About`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `About ${process.env.NEXT_PUBLIC_APP_TITLE}. Something that you open everyday.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/about`;

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

/* eslint-disable @next/next/no-img-element */
export default async function AboutPage() {
  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      {/* <main className="mt-9 md:px-0"> */}
      <main className="mt-9 w-full">
        <p className="leading-7 not-first:mt-6">
          {process.env.NEXT_PUBLIC_APP_TITLE} is a platform to make you happy
          everyday. We improve, add new features and make it better.
        </p>
        <h2 className="mt-7 text-base font-bold tracking-tighter md:text-lg">
          Who created {process.env.NEXT_PUBLIC_APP_TITLE}?
        </h2>
        <p className="leading-7 not-first:mt-6">
          Initiated and run by{" "}
          <a
            className="font-bold underline"
            href="https://sony-ak.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Sony AK
          </a>
          . Part of{" "}
          <a
            className="font-bold underline"
            href="https://github.com/buka-platforms"
            target="_blank"
            rel="noopener noreferrer"
          >
            Buka Platforms, Inc.
          </a>{" "}
          Made with love & passion in Jakarta, Indonesia, enjoyed everywhere.
        </p>
        <h2 className="mt-7 text-base font-bold tracking-tighter md:text-lg">
          Contact us
        </h2>
        <p className="leading-7 not-first:mt-6">
          Feedback and suggestions are always welcome. Just{" "}
          <Link href="/contact" className="underline">
            go here
          </Link>{" "}
          to contact us, or just send an email to{" "}
          <a href="mailto:info@buka.sh" className="underline">
            info@buka.sh
          </a>
          .
        </p>
      </main>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_about.svg"
          alt="About"
          className="h-50 w-50 md:h-87.5 md:w-87.5"
        />
      </div>
    </>
  );
}
