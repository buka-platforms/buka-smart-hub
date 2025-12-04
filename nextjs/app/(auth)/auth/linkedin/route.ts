import { getWelcomeEmailTemplate } from "@/data/email_template";
import { sendMail } from "@/lib/mailer";
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

  // Check all data against identity provider token endpoint
  const clientId = process.env.NEXT_PUBLIC_BUKA_LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.SECRET_BUKA_LINKEDIN_CLIENT_SECRET;
  const redirectUri = process.env.NEXT_PUBLIC_BUKA_LINKEDIN_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return redirect("/");
  }

  // Get the access token from the identity provider based on the code
  const accessTokenResponse = await fetch(
    `https://www.linkedin.com/oauth/v2/accessToken`,
    {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
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
  const userInfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      authorization: `Bearer ${access_token}`,
    },
  });

  const userInfo = await userInfoResponse.json();

  if (!userInfoResponse.ok) {
    return redirect("/");
  }

  let userSession;
  let userId;
  const identityProviderCode = "linkedin";
  const identityProviderName = "LinkedIn";

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
  const client = createDirectus(
    process.env.SECRET_BUKA_DIRECTUS_BASE_URL as string,
  )
    .with(staticToken(process.env.SECRET_BUKA_DIRECTUS_ACCESS_TOKEN as string))
    .with(rest());

  // Get user with filter
  const user = await client.request(
    readItems("users" as any, {
      filter: {
        _and: [
          {
            email: {
              _eq: userInfo.email,
            },
          },
          {
            identity_provider_code: {
              _eq: identityProviderCode,
            },
          },
        ],
      } as any,
    }),
  );

  if (user.length === 0) {
    const newUser = await client.request(
      createItem("users", {
        email: userInfo.email,
        verified: "1",
        username: userInfo.email,
        identity_provider_code: identityProviderCode,
        first_name: userInfo.given_name ? userInfo.given_name : null,
        last_name: userInfo.family_name ? userInfo.family_name : null,
        name: userInfo.name ? userInfo.name : null,
        picture_url: userInfo.picture ? userInfo.picture : null,
        source_identity_id: userInfo.sub,
        user_data_details: JSON.stringify(userInfo),
        last_login_at: new Date().toISOString(),
      }),
    );

    userId = newUser.id;

    // Prepare email template
    let emailTemplate = getWelcomeEmailTemplate();
    emailTemplate = emailTemplate.replace(
      "###FIRST_NAME###",
      userInfo.given_name ? userInfo.given_name : "Buka User",
    );

    // Send email to confirm the user e-mail, using nodemailer (if only email exists)
    sendMail(
      userInfo.email,
      `Hi ${
        userInfo.given_name ? userInfo.given_name : "Buka User"
      }! Welcome to Buka`,
      emailTemplate,
      emailTemplate,
    );
  } else {
    userId = user[0].id;

    // Update user data on users table
    await client.request(
      updateItem("users", userId, {
        email: userInfo.email ? userInfo.email : null,
        username: userInfo.email ? userInfo.email : null,
        identity_provider_code: identityProviderCode,
        first_name: userInfo.given_name ? userInfo.given_name : null,
        last_name: userInfo.family_name ? userInfo.family_name : null,
        name: userInfo.name ? userInfo.name : null,
        picture_url: userInfo.picture ? userInfo.picture : null,
        source_identity_id: userInfo.sub,
        user_data_details: JSON.stringify(userInfo),
        last_login_at: new Date().toISOString(),
      }),
    );
  }

  // Check if the user session exists
  userSession = await client.request(
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

    const secret = new TextEncoder().encode(process.env.SECRET_BUKA_JWT_SECRET);

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

  // Prepare user data for the cookie
  const cookieUserData = {
    provider_id: userInfo.email,
    name: userInfo.name ? userInfo.name : null,
    first_name: userInfo.given_name ? userInfo.given_name : null,
    last_name: userInfo.family_name ? userInfo.family_name : null,
    picture: userInfo.picture
      ? userInfo.picture
      : `${process.env.NEXT_PUBLIC_BUKA_BASE_URL}/assets/images/user.png`,
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
