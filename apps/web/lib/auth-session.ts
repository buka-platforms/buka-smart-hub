export type AuthProviderCode =
  | "google"
  | "github"
  | "linkedin"
  | "discord"
  | "x";

type UserSessionRecord = {
  session_token: string;
  user_id: string;
  device_id: string;
  is_new_user?: boolean;
};

const normalizeSessionRecord = (value: unknown): UserSessionRecord | null => {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Record<string, unknown>;
  const sessionToken =
    typeof raw.session_token === "string" ? raw.session_token : null;
  const userId =
    typeof raw.user_id === "string" || typeof raw.user_id === "number"
      ? String(raw.user_id)
      : null;
  const deviceId =
    typeof raw.device_id === "string"
      ? raw.device_id
      : typeof raw.deviceId === "string"
        ? raw.deviceId
        : null;
  const isNewUser =
    typeof raw.is_new_user === "boolean"
      ? raw.is_new_user
      : typeof raw.isNewUser === "boolean"
        ? raw.isNewUser
        : undefined;

  if (!sessionToken || !userId || !deviceId) {
    return null;
  }

  return {
    session_token: sessionToken,
    user_id: userId,
    device_id: deviceId,
    is_new_user: isNewUser,
  };
};

const buildSessionUpsertUrl = () => {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return null;
  }

  return `${apiBaseUrl.replace(/\/+$/, "")}/api/auth/session/upsert`;
};

export const upsertUserSessionViaBackend = async ({
  provider,
  userInfo,
  deviceId,
  userAgent,
}: {
  provider: AuthProviderCode;
  userInfo: Record<string, unknown>;
  deviceId: string;
  userAgent: string;
}) => {
  const endpoint = buildSessionUpsertUrl();
  if (!endpoint) {
    return null;
  }

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        provider,
        device_id: deviceId,
        user_agent: userAgent,
        user_info: userInfo,
      }),
    });

    if (!response.ok) {
      return null;
    }

    const payload: unknown = await response.json();
    const record = normalizeSessionRecord(payload);
    if (record) {
      return record;
    }

    if (
      payload &&
      typeof payload === "object" &&
      "data" in payload &&
      (payload as Record<string, unknown>).data
    ) {
      return normalizeSessionRecord((payload as Record<string, unknown>).data);
    }

    return null;
  } catch {
    return null;
  }
};
