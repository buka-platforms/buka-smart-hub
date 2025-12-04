import {
  createDirectus,
  deleteItem,
  readItems,
  rest,
  staticToken,
} from "@directus/sdk";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET() {
  const cookieStore = await cookies();

  // Get device_id from cookies
  const deviceId = cookieStore.get("_b_did")?.value;

  // Get user_id from cookies
  const userId = cookieStore.get("_b_uid")?.value;

  // Get user_session_token from cookies
  const userSessionToken = cookieStore.get("_b_ust")?.value;

  // Create a new Directus client
  const client = createDirectus(
    process.env.SECRET_BUKA_DIRECTUS_BASE_URL as string,
  )
    .with(staticToken(process.env.SECRET_BUKA_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get user session to delete
  const userSession = await client.request(
    readItems("user_sessions", {
      filter: {
        _and: [
          {
            user_id: {
              _eq: userId,
            },
          },
          {
            device_id: {
              _eq: deviceId,
            },
          },
          {
            session_token: {
              _eq: userSessionToken,
            },
          },
        ],
      },
    }),
  );

  if (userSession.length > 0) {
    const userSessionId = userSession[0].id;

    // Delete user session
    await client.request(deleteItem("user_sessions", userSessionId));
  }

  // Delete _b_ust cookie (user session token)
  cookieStore.delete("_b_ust");

  // Delete _b_uid cookie (user id)
  cookieStore.delete("_b_uid");

  // Delete _b_did cookie (device id)
  cookieStore.delete("_b_did");

  // Delete _b_ud cookie (user data)
  cookieStore.delete("_b_ud");

  if (cookieStore.has("_b_crt")) {
    // Get cookie named _b_crt
    const cookieCurrentRoute = cookieStore.get("_b_crt");

    if (cookieCurrentRoute && typeof cookieCurrentRoute.value === "string") {
      // Redirect page to the last visited page
      return redirect(cookieCurrentRoute.value);
    } else {
      // Redirect page to the home page
      return redirect("/");
    }
  } else {
    return redirect("/");
  }
}
