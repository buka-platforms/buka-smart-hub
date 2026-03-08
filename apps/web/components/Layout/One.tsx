import OneClient from "@/components/Layout/OneClient";
import { checkUserSession } from "@/lib/user";

export default async function LayoutOne({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSession = await checkUserSession();

  return <OneClient userSession={userSession}>{children}</OneClient>;
}
