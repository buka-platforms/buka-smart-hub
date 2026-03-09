import { apps } from "@/data/apps";
import { ArrowRight, ExternalLink } from "lucide-react";
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
        <div className="flex flex-col gap-4">
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
                Launch your tools quickly
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Choose any app from the cards below to get started.
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-wide text-slate-700 uppercase">
            Explore Tools
          </h2>
          <p className="text-xs text-slate-500">{apps.length} apps</p>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const openInNewTab = app.open_in_new_tab ?? false;
            const isExternal = openInNewTab || app.path.startsWith("http");

            return (
              <Link
                key={app.id}
                href={app.path}
                prefetch={app.prefetch ?? true}
                target={openInNewTab ? "_blank" : "_self"}
                rel={
                  openInNewTab && app.secure_on_new_tab
                    ? "noopener noreferrer"
                    : undefined
                }
                className="group rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50 p-4 shadow-xs transition hover:border-slate-300 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div className="rounded-lg border border-slate-200 bg-white p-2">
                    <Image
                      src={app.image_url}
                      alt={app.name}
                      width={24}
                      height={24}
                      className="size-6"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {app.name}
                    </p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600">
                      {app.description}
                    </p>
                  </div>
                  {isExternal ? (
                    <ExternalLink className="mt-0.5 size-4 text-slate-400 transition group-hover:text-slate-700" />
                  ) : (
                    <ArrowRight className="mt-0.5 size-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700" />
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
