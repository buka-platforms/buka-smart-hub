"use client";

import { userSessionStateAtom } from "@/data/store";
import type { UserSession } from "@/data/type";
import { useSetAtom } from "jotai";
import { useEffect } from "react";

export default function UserSessionProvider({
  userSession,
}: {
  userSession: UserSession;
}) {
  const setUserSession = useSetAtom(userSessionStateAtom);
  useEffect(() => {
    setUserSession(userSession);
  }, [userSession, setUserSession]);
  return null;
}
