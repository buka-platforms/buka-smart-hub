export async function GET(request: Request) {
  // Get all headers by iterating through the request headers
  const requestHeaders: { [key: string]: string } = {};
  const headersArray = Array.from(request.headers.entries());
  for (const [key, value] of headersArray) {
    requestHeaders[key] = value;
  }

  return new Response(JSON.stringify({ request_headers: requestHeaders }), {
    headers: {
      "content-type": "application/json",
    },
  });
}
