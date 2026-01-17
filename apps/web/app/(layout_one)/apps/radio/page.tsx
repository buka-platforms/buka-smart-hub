import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";
import Link from "next/link";
import RadioStations from "./RadioStations";

const moduleName = `Radio`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Listen to many great radio stations around the world.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/radio`;

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
export default async function RadioPage() {
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
        <p className="leading-7 not-first:mt-6">
          Are you radio streaming owner? You can submit{" "}
          <a className="underline" href="https://forms.gle/Te5KBBjPchrkxoju5">
            your radio streaming station
          </a>{" "}
          to us.
        </p>
        <RadioStations />
      </div>
      <h2 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
        Submit your radio station
      </h2>
      <p className="leading-7 not-first:mt-6">
        Submit{" "}
        <a className="underline" href="https://forms.gle/Te5KBBjPchrkxoju5">
          your radio station
        </a>{" "}
        to us. Quick and easy form to fill.
      </p>
      <h2 className="mt-8 scroll-m-20 text-2xl font-semibold tracking-tight">
        Web player for your website
      </h2>
      <p className="leading-7 not-first:mt-6">
        If you have a website, you can use our radio web player. Our
        implementation is simple and easy to use by using an iframe. You just
        need your radio station already listed with us. Here is the quick
        sample.
      </p>
      <p className="leading-7 not-first:mt-6">
        <a href="https://buka.sh/radio/247contmusic?if=1" target="_blank">
          <code className="bg-slate-200 p-3">
            &lt;iframe=&quot;https://buka.sh/radio/247contmusic?if=1&quot;&gt;
          </code>
        </a>
      </p>
      <p className="leading-7 not-first:mt-6">
        If you need more help, please{" "}
        <a href="/contact" className="underline">
          contact us
        </a>
        . Some examples of radio stations that use our web player are{" "}
        <a href="https://nbsradio.id" target="_blank" className="underline">
          NBS Radio
        </a>{" "}
        ,{" "}
        <a
          href="https://1921baliheadbanger.com"
          target="_blank"
          className="underline"
        >
          1921 Bali Head Banger Radio
        </a>
        ,{" "}
        <a
          href="https://baliextremeradio.blogspot.com"
          target="_blank"
          className="underline"
        >
          Bali Extreme Radio
        </a>{" "}
        and many more.
      </p>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_radio.svg"
          alt="Radio"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
