import { redirect } from "next/navigation";
import { streamUrls } from "../buka_radio_streams";

export async function GET(request: Request) {
  // Select a random stream URL
  const randomStreamUrl =
    streamUrls[Math.floor(Math.random() * streamUrls.length)];

  // Redirect to the random stream URL
  return redirect(randomStreamUrl.stream_url);
}
