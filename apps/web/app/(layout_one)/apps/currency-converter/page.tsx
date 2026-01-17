import PageHeaderInfo from "@/components/General/PageHeaderInfo";
import type { Metadata } from "next";
import Link from "next/link";

const moduleName = `Currency Converter`;
const pageTitle = `${moduleName} - ${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `Convert between any currency. Powered by Wise.`;
const pageUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/apps/currency-converter`;

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
export default async function CurrencyConverterPage() {
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
      {/* <div className="mt-9 flex items-center overflow-hidden"> */}
      <div className="mt-9 w-full">
        <div className="flex h-auto w-full">
          <iframe
            title="fx"
            src="https://wise.com/gb/currency-converter/fx-widget/converter?sourceCurrency=EUR&targetCurrency=USD"
            frameBorder="0"
            width="100%"
            className="h-[430px] w-full md:h-[250px]"
          ></iframe>
        </div>
      </div>
      <div className="mt-11 flex w-full justify-center">
        <img
          src="/assets/images/illustration_currency_converter.svg"
          alt="Currency Converter"
          className="h-[200px] w-[200px] md:h-[350px] md:w-[350px]"
        />
      </div>
    </>
  );
}
