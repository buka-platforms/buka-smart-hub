"use client";

import Link from "next/link";
import useSWR from "swr";

interface WeatherData {
  temperature: number;
  condition: string;
  weather: { icon: string; description: string }[];
  main: {
    temp: string;
  };
  name: string;
}

const fetcher = async (
  ...args: [RequestInfo, RequestInit?]
): Promise<WeatherData> => {
  const res = await fetch(...args);
  return res.json();
};

interface RequestHeaders {
  "x-vercel-ip-latitude": string;
  "x-vercel-ip-longitude": string;
}

/* eslint-disable @next/next/no-img-element */
export default function Weather({
  requestHeaders,
}: {
  requestHeaders: RequestHeaders;
}) {
  const appId = process.env.NEXT_PUBLIC_OPENWEATHERMAP_APP_ID;
  const { data, error, isLoading } = useSWR(
    `https://api.openweathermap.org/data/2.5/weather?lat=${requestHeaders["x-vercel-ip-latitude"]}&lon=${requestHeaders["x-vercel-ip-longitude"]}&units=metric&appid=${appId}`,
    fetcher,
    {
      revalidateOnFocus: true,
      refreshInterval: 900000, // 15 minutes
    },
  );

  return (
    <>
      <Link href="/apps/weather" className="block">
        <div className="flex items-end text-xs text-whitesmoke opacity-80 hover:opacity-100 md:text-sm">
          {isLoading ? null : !error && data ? (
            <>
              <div className="flex items-center">
                <span>
                  <img
                    src={`https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`}
                    alt={data.weather[0].description}
                    title={data.weather[0].description}
                    width="24"
                    height="24"
                    className="block"
                  />
                </span>
                <span>{parseInt(data.main.temp)} &deg;C</span>
                <span className="pl-1.5">{data.name}</span>
              </div>
            </>
          ) : null}
        </div>
      </Link>
    </>
  );
}
