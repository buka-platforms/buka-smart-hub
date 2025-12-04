export const T = {
  format: (date: Date) => {
    const hours = T.formatHours(date.getHours()),
      minutes = date.getMinutes();
    return `${hours}:${T.formatSegment(minutes)}`;
  },
  formatHours: (hours: number) => {
    return hours % 12 === 0 ? 12 : hours % 12;
  },
  formatSegment: (segment: number) => {
    return segment < 10 ? `0${segment}` : segment;
  },
};

export const generateSessionToken = (
  identity: string,
  length: number = 128,
) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const tokenLength = length;
  let sessionToken = "";

  for (let i = 0; i < tokenLength; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    sessionToken += characters.charAt(randomIndex);
  }

  return `${identity}_${sessionToken}`;
};

export const generateRandomString = (length: number) => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-";
  let result = "";

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }

  return result;
};
