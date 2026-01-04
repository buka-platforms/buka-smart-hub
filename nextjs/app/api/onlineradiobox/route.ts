import { NextRequest, NextResponse } from "next/server";

// Supported country codes
const VALID_COUNTRIES = [
  "id", "us", "gb", "de", "fr", "es", "it", "br", "jp", "kr",
  "au", "ca", "nl", "ru", "in", "mx", "ar", "pl", "tr", "se",
];

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const country = searchParams.get("country") || "id";

  // Validate country code
  if (!VALID_COUNTRIES.includes(country)) {
    return NextResponse.json(
      { error: "Invalid country code" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://onlineradiobox.com/${country}/?nowlisten=1`,
      {
        headers: {
          Accept: "application/json, text/plain, */*",
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
        next: { revalidate: 30 }, // Cache for 30 seconds
      }
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("OnlineRadioBox API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch now playing data" },
      { status: 500 }
    );
  }
}
