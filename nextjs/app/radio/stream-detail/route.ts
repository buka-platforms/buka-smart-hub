import { streamUrls } from "../buka_radio_streams";

export async function GET(request: Request) {
  // Select a random stream URL
  const randomStreamUrl =
    streamUrls[Math.floor(Math.random() * streamUrls.length)];

  // Response JSON object
  const response = {
    stream_url: randomStreamUrl.stream_url,
    metadata_url: randomStreamUrl.metadata_url,
  };

  // Return the response JSON object
  return new Response(JSON.stringify(response), {
    headers: {
      "Content-Type": "application/json",
    },
  });
}
