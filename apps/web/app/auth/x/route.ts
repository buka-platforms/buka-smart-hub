import {
  createDirectus,
  createItem,
  readItems,
  rest,
  staticToken,
  updateItem,
} from "@directus/sdk";
import { SignJWT } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function GET(request: Request) {
  // Check if the request query contains the code
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return redirect("/");
  }

  const state = url.searchParams.get("state");

  if (!state) {
    return redirect("/");
  }

  // Check all data against identity provider token endpoint
  const clientId = process.env.NEXT_PUBLIC_X_CLIENT_ID;
  const clientSecret = process.env.SECRET_X_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_X_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  // Get the access token from the identity provider based on the code
  const accessTokenResponse = await fetch(
    "https://api.twitter.com/2/oauth2/token",
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        code: code,
        code_verifier: state,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    },
  );

  const accessToken = await accessTokenResponse.json();

  if (!accessTokenResponse.ok) {
    return redirect("/");
  }

  const { access_token } = accessToken;

  // Get the user info from identity provider based on the access token on the response
  const userInfoResponse = await fetch(
    "https://api.twitter.com/2/users/me?user.fields=id,name,username,description,verified,verified_type,profile_image_url",
    {
      headers: {
        authorization: `Bearer ${access_token}`,
      },
    },
  );

  const userInfo = await userInfoResponse.json();

  if (!userInfoResponse.ok) {
    return redirect("/");
  }

  let userSession;
  let userId;
  const identityProviderCode = "x";
  const identityProviderName = "X";

  // Create a hash based on the user agent and the user id
  const userAgent = request.headers.get("User-Agent") || "";
  const hashBuffer = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${userAgent}-${userInfo.id}`),
  );
  const deviceId = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  // Create a new Directus client
  const client = createDirectus(process.env.SECRET_DIRECTUS_BASE_URL as string)
    .with(staticToken(process.env.SECRET_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get user with filter
  const user = await client.request(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    readItems("users" as any, {
      filter: {
        _and: [
          {
            username: {
              _eq: userInfo.data.username,
            },
          },
          {
            identity_provider_code: {
              _eq: identityProviderCode,
            },
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    }),
  );

  if (user.length === 0) {
    // Create new user on users table
    const newUser = await client.request(
      createItem("users", {
        verified: "1",
        username: userInfo.data.username,
        identity_provider_code: identityProviderCode,
        name: userInfo.data.name ? userInfo.data.name : null,
        picture_url: userInfo.data.profile_image_url
          ? userInfo.data.profile_image_url
          : null,
        source_identity_id: userInfo.data.id,
        user_data_details: JSON.stringify(userInfo),
        last_login_at: new Date().toISOString(),
      }),
    );

    userId = newUser.id;
  } else {
    userId = user[0].id;

    // Update user data on users table
    await client.request(
      updateItem("users", userId, {
        identity_provider_code: identityProviderCode,
        name: userInfo.data.name ? userInfo.data.name : null,
        username: userInfo.data.username,
        picture_url: userInfo.data.profile_image_url
          ? userInfo.data.profile_image_url
          : null,
        source_identity_id: userInfo.data.id,
        user_data_details: JSON.stringify(userInfo),
        last_login_at: new Date().toISOString(),
      }),
    );
  }

  // Check if the user session exists
  userSession = await client.request(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
              _eq: deviceId,
            },
          },
        ],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    }),
  );

  if (userSession.length === 0) {
    // Payload to be included in the user session token
    const payload = {
      user_id: userId,
      device_id: deviceId,
      identity_provider_code: identityProviderCode,
    };

    const secret = new TextEncoder().encode(process.env.SECRET_JWT_SECRET);

    // Generate the JWT token
    const jwt = await new SignJWT(payload)
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setIssuer("buka.sh")
      .setAudience("buka.sh")
      .sign(secret);

    // Create a new user session on user_sessions table
    userSession = await client.request(
      createItem("user_sessions", {
        user_id: userId,
        session_token: jwt,
        device_id: deviceId,
      }),
    );
  }

  // Check if the userSession is array, if array then userSession is the first index else userSession is the object
  userSession = Array.isArray(userSession) ? userSession[0] : userSession;

  const cookieStore = await cookies();

  // Set cookie _b_ust (user session token)
  cookieStore.set("_b_ust", userSession.session_token, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Set cookie _b_uid (user id)
  cookieStore.set("_b_uid", userSession.user_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Set cookie _b_did (device id)
  cookieStore.set("_b_did", userSession.device_id, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

  // Prepare first name for the cookie
  const firstName = userInfo.data.name
    ? userInfo.data.name.split(" ")[0]
    : null;

  // Prepare last name for the cookie
  const lastName = userInfo.data.name
    ? userInfo.data.name.split(" ").slice(1).join(" ")
    : null;

  // Prepare user data for the cookie
  const cookieUserData = {
    provider_id: null,
    name: userInfo.data.name ? userInfo.data.name : null,
    first_name: firstName,
    last_name: lastName,
    picture: userInfo.data.profile_image_url
      ? userInfo.data.profile_image_url
      : `${process.env.NEXT_PUBLIC_BASE_URL}/assets/images/user.png`,
    provider_name: identityProviderName,
  };

  // Set cookie _b_ud (user data)
  cookieStore.set("_b_ud", JSON.stringify(cookieUserData), {
    path: "/",
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 7, // 1 week
  });

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
