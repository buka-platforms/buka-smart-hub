import { redirect } from "next/navigation";

export async function GET() {
  return redirect("https://corner.buka.sh");
}
