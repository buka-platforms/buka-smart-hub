import { checkUserSession } from "@/lib/user";

export async function GET() {
  const session = await checkUserSession();
  return Response.json(session, { status: 200 });
}
