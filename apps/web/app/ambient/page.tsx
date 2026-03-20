import AmbientExperience from "@/components/Ambient/AmbientExperience";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: `Ambient | ${process.env.NEXT_PUBLIC_APP_TITLE}`,
  description: "Immersive Unsplash wallpaper with live audio visualization.",
};

export default function AmbientPage() {
  return <AmbientExperience mode="page" />;
}
