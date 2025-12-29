"use client";

import { requestHeadersStateAtom } from "@/data/store";
import { useAtomValue } from "jotai";
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

/* eslint-disable @next/next/no-img-element */
export default function Weather() {
  const requestHeaders = useAtomValue(requestHeadersStateAtom);
  const appId = process.env.NEXT_PUBLIC_OPENWEATHERMAP_APP_ID;
  const { data, error, isLoading } = useSWR(
    requestHeaders &&
      requestHeaders["x-vercel-ip-latitude"] &&
      requestHeaders["x-vercel-ip-longitude"]
      ? `https://api.openweathermap.org/data/2.5/weather?lat=${requestHeaders["x-vercel-ip-latitude"]}&lon=${requestHeaders["x-vercel-ip-longitude"]}&units=metric&appid=${appId}`
      : null,
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
