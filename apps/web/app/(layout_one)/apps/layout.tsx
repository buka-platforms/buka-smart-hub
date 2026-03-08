import { checkUserSession } from "@/lib/user";
import AppsWorkspaceLayout from "./AppsWorkspaceLayout";

export default async function AppsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const userSession = await checkUserSession();

  return (
    <AppsWorkspaceLayout userSession={userSession}>
      {children}
    </AppsWorkspaceLayout>
  );
}
