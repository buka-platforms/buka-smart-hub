import { apps } from "@/data/apps";
import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

const moduleName = `Apps`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Enjoy some apps from ${process.env.NEXT_PUBLIC_APP_TITLE} that everyone can use everyday, everywhere, anytime.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps`;

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

export default async function AppsPage() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
        {moduleName}
      </h1>
      <p className="mt-2 text-sm text-slate-600">{pageDescription}</p>
      <div className="mt-6 rounded-2xl border bg-white p-5 shadow-xs md:p-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="rounded-xl border bg-slate-50 p-3">
              <Image
                src="/assets/images/illustration_apps.svg"
                alt="Apps"
                width={42}
                height={42}
              />
            </div>
            <div>
              <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">
                Workspace
              </p>
              <h2 className="mt-1 text-xl font-semibold text-slate-900">
                Launch any app from the sidebar
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Pick one from the left navigation to start quickly.
              </p>
            </div>
          </div>
          <Link
            href={apps[0]?.path ?? "/apps/book-preview"}
            className="inline-flex items-center gap-2 rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Open First App
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </>
  );
}
