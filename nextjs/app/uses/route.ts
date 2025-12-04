import { redirect } from "next/navigation";

export async function GET(request: Request) {
  return redirect("/credits");
}
