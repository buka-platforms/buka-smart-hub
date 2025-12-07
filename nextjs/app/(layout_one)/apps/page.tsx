import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import { Badge } from "@/components/ui/badge";
import { apps } from "@/data/apps";
import type { Metadata } from "next";
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

const List = () => {
  return (
    <>
      {apps.map((app) => (
        <Item item={app} key={app.name} />
      ))}
    </>
  );
};

/* eslint-disable @next/next/no-img-element */
const Item = ({ item }: any) => {
  return (
    <>
      <Link
        href={item.path}
        prefetch={item.prefetch ?? true}
        target={item.open_in_new_tab ? "_blank" : "_self"}
        rel={item.secure_on_new_tab ? "noopener noreferrer" : ""}
      >
        <div
          title={item.description}
          className="group relative flex w-full cursor-pointer flex-row items-center rounded-md border p-5 text-center shadow-xs hover:bg-slate-50 md:h-40 md:w-40 md:max-w-40 md:flex-col md:justify-center md:p-0"
        >
          {item.type === "new" && (
            <Badge
              variant="destructive"
              className="absolute top-1 right-1 rounded-full bg-blue-400 text-xs font-light shadow-none hover:bg-purple-500"
            >
              new
            </Badge>
          )}
          {item.type === "wip" && (
            <Badge
              variant="destructive"
              className="absolute top-1 right-1 rounded-full bg-orange-400 text-xs font-light shadow-none hover:bg-purple-500"
            >
              wip
            </Badge>
          )}
          <div className="flex items-center md:grow md:justify-center">
            <img
              src={item.image_url}
              alt={item.name}
              className="size-[32px] md:size-[48px]"
            />
          </div>
          <div className="flex flex-col items-start p-2 md:w-full md:items-center">
            <span className="text-left group-hover:font-medium md:text-sm">
              {item.name}
            </span>
            <span className="text-left text-xs text-slate-500 md:hidden">
              {item.description}
            </span>
          </div>
        </div>
      </Link>
    </>
  );
};

/* eslint-disable @next/next/no-img-element */
export default async function AppsPage() {
  return (
    <>
      <PageHeaderInfo moduleName={moduleName} pageDescription={pageDescription}>
        {" "}
        /{" "}
      </PageHeaderInfo>
      <h1 className="hidden">{pageDescription}</h1>
      <main className="mt-9 w-full">
        <div className="flex flex-col flex-wrap gap-3 md:flex-row md:gap-5 md:px-0">
          <List />
        </div>
      </main>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_apps.svg"
          alt="Apps"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
