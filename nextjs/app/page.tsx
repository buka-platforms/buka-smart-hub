import Home from "@/components/Home/Home";
import type { Metadata } from "next";

const pageTitle = `${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `${process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.`;

export const metadata: Metadata = {
  title: `${pageTitle}`,
  description: `${pageDescription}`,
};

export default async function HomePage() {
  return <Home />;
}
