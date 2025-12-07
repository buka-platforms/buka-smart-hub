import Home from "@/components/Home/Home";
import { checkUserSession } from "@/lib/user";
import type { Metadata } from "next";

const pageTitle = `${process.env.NEXT_PUBLIC_APP_TITLE}`;
const pageDescription = `${process.env.NEXT_PUBLIC_APP_TITLE}, something that you open everyday.`;

export const metadata: Metadata = {
  title: `${pageTitle}`,
  description: `${pageDescription}`,
};

export default async function HomePage() {
  const userSession = await checkUserSession();

  return <Home userSession={userSession} />;
}
