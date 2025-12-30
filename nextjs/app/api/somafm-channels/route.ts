import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("https://somafm.com/channels.json", {
      headers: {
        "Accept": "application/json",
      },
      // Optionally, you can set cache: 'no-store' to always fetch fresh data
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch SomaFM channels" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
