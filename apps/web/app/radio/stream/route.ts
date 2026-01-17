import { redirect } from "next/navigation";
import { streamUrls } from "../buka-radio-streams";

export async function GET() {
  // Select a random stream URL
  const randomStreamUrl =
    streamUrls[Math.floor(Math.random() * streamUrls.length)];

  // Redirect to the random stream URL
  return redirect(randomStreamUrl.stream_url);
}
