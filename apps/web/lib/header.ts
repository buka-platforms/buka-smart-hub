import { headers } from "next/headers";

export const getRequestHeaders = async () => {
  const headersList = await headers();

  const requestHeaders: Record<string, string> = {};
  for (const [key, value] of Array.from(headersList.entries())) {
    // Get only keys that start with 'cf-'
    if (key.startsWith("cf-")) {
      requestHeaders[key] = value;
    }

    // Get key of some Vercel headers
    if (
      key === "x-real-ip" ||
      key === "x-vercel-ip-city" ||
      key === "x-vercel-ip-country" ||
      key === "x-vercel-ip-latitude" ||
      key === "x-vercel-ip-longitude" ||
      key === "x-vercel-ip-timezone" ||
      key === "x-vercel-proxied-for"
    ) {
      requestHeaders[key] = value;
    }
  }

  return requestHeaders;
};
