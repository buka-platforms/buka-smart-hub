export const normalizeRadioMetadataUrl = (
  metadataUrl?: string | null,
): string => {
  if (!metadataUrl) {
    return "";
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL_V1;
  if (!apiBaseUrl) {
    return metadataUrl;
  }

  try {
    const parsedUrl = new URL(metadataUrl, apiBaseUrl);

    if (!parsedUrl.pathname.includes("/radio-station/stream-metadata")) {
      return metadataUrl;
    }

    const normalizedUrl = new URL(
      "/api/radio-station/stream-metadata",
      apiBaseUrl,
    );
    parsedUrl.searchParams.forEach((value, key) => {
      normalizedUrl.searchParams.append(key, value);
    });

    return normalizedUrl.toString();
  } catch {
    if (!metadataUrl.includes("/radio-station/stream-metadata")) {
      return metadataUrl;
    }

    const queryIndex = metadataUrl.indexOf("?");
    const query = queryIndex >= 0 ? metadataUrl.slice(queryIndex) : "";

    return `${apiBaseUrl}/api/radio-station/stream-metadata${query}`;
  }
};
