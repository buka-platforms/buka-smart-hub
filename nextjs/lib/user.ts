import { createDirectus, readItems, rest, staticToken } from "@directus/sdk";
import { cookies } from "next/headers";

export const checkUserSession = async () => {
  const cookieStore = await cookies();

  // Check if has cookie called "_b_ust" not exists
  if (!cookieStore.has("_b_ust")) {
    return { is_authenticated: false };
  }

  // Check if has cookie called "_b_did" not exists
  if (!cookieStore.has("_b_did")) {
    return { is_authenticated: false };
  }

  // Check if has cookie called "_b_uid" not exists
  if (!cookieStore.has("_b_uid")) {
    return { is_authenticated: false };
  }

  // Get cookie called _b_ust
  const userSessionToken = cookieStore.get("_b_ust")?.value;

  // Get cookie called _b_did
  const userDeviceId = cookieStore.get("_b_did")?.value;

  // Get cookie called _b_uid
  const userId = cookieStore.get("_b_uid")?.value;

  // Create a new Directus client
  const client = createDirectus(
    process.env.SECRET_BUKA_DIRECTUS_BASE_URL as string,
  )
    .with(staticToken(process.env.SECRET_BUKA_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get user session data
  const userSession = await client.request(
    readItems("user_sessions" as any, {
      filter: {
        _and: [
          {
            user_id: {
              _eq: userId,
            },
          },
          {
            device_id: {
              _eq: userDeviceId,
            },
          },
          {
            session_token: {
              _eq: userSessionToken,
            },
          },
        ],
      } as any,
    }),
  );

  if (userSession.length === 0) {
    return { is_authenticated: false };
  }

  const userData = cookieStore.get("_b_ud")?.value;

  return {
    is_authenticated: true,
    user_details: JSON.parse(userData as string),
  };
};
