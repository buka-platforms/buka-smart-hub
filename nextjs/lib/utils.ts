import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export const cn = (...inputs: ClassValue[]) => {
  return twMerge(clsx(inputs));
};

export function replaceArtworkSizes(url: string, newSize = "600x600") {
  const sizes = [
    "100x100",
    "164x170",
    "166x170",
    "167x170",
    "168x170",
    "169x170",
    "170x152",
    "170x153",
    "170x154",
    "170x156",
    "170x164",
    "170x166",
    "170x167",
    "170x168",
    "170x169",
    "360x360",
  ];

  sizes.forEach((size) => {
    url = url.replace(size, newSize);
  });

  return url;
}
