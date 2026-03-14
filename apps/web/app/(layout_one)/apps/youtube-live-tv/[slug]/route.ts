import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

type Params = Promise<{ slug: string }>;

export async function GET(
  request: NextRequest,
  // { params }: { params: { slug: string } },
  segmentData: { params: Params },
) {
  const params = await segmentData.params;
  const slug = params.slug;
  return redirect(`/tv/${slug}`);
}
